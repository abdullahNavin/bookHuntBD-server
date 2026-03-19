import { prisma } from "../../lib/prisma.js";
import { scrapers, withTimeout } from "../../scrapers/index.js";
import type { BookResult } from "../../scrapers/index.js";
import type { SearchQuery } from "./books.schema.js";

interface SearchResponse {
    results: BookResult[];
    cached: boolean;
    failed: string[];
    page: number;
    total: number;
}

export async function searchBooks(params: SearchQuery): Promise<SearchResponse> {
    const { query, page, limit } = params;
    const normalizedQuery = query.toLowerCase().trim();

    // Step 1: Check cache
    const cachedResults = await prisma.bookCache.findMany({
        where: {
            query: normalizedQuery,
            expiresAt: { gt: new Date() },
        },
    });

    if (cachedResults.length > 0) {
        // Return paginated cache results
        const total = cachedResults.length;
        const start = (page - 1) * limit;
        const paginatedResults: BookResult[] = cachedResults
            .slice(start, start + limit)
            .map((r) => ({
                title: r.title,
                author: r.author ?? undefined,
                publisher: r.publisher ?? undefined,
                price: r.price,
                oldPrice: r.oldPrice ?? undefined,
                discount: r.discount ?? undefined,
                image: r.image ?? undefined,
                link: r.link,
                site: r.site,
            }));

        return {
            results: paginatedResults,
            cached: true,
            failed: [],
            page,
            total,
        };
    }

    // Step 2: Live scrape (cache miss)
    const settled = await Promise.allSettled(
        scrapers.map((s) => withTimeout(s.search(query), 5000))
    );

    const results: BookResult[] = settled
        .filter(
            (r): r is PromiseFulfilledResult<BookResult[]> =>
                r.status === "fulfilled"
        )
        .flatMap((r) => r.value);

    const failed: string[] = settled
        .map((r, i) => (r.status === "rejected" ? scrapers[i].site : null))
        .filter((s): s is string => s !== null);

    // Step 3: Persist to cache
    if (results.length > 0) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await prisma.bookCache.createMany({
            data: results.map((r) => ({
                query: normalizedQuery,
                site: r.site,
                title: r.title,
                author: r.author,
                publisher: r.publisher,
                price: r.price,
                oldPrice: r.oldPrice,
                discount: r.discount,
                image: r.image,
                link: r.link,
                expiresAt,
            })),
        });
    }

    // Step 4: Return paginated results
    const total = results.length;
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);

    return {
        results: paginatedResults,
        cached: false,
        failed,
        page,
        total,
    };
}

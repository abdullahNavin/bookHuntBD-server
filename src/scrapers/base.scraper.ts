// ─── Scraper Interface & Helpers ────────────────────────────────────

export interface BookResult {
    title: string;
    author?: string;
    publisher?: string;
    price: number;
    oldPrice?: number;
    discount?: number;
    image?: string;
    link: string;
    site: string;
}

export interface Scraper {
    readonly site: string;
    search(query: string): Promise<BookResult[]>;
}

// ─── Timeout wrapper ────────────────────────────────────────────────

export function withTimeout<T>(
    promise: Promise<T>,
    ms: number
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`Timeout after ${ms}ms`)),
            ms
        );
        promise
            .then((val) => {
                clearTimeout(timer);
                resolve(val);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

// ─── Jitter delay ───────────────────────────────────────────────────

export function jitter(minMs = 200, maxMs = 800): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
}

// ─── Shared User-Agent ──────────────────────────────────────────────

export const USER_AGENT =
    "BookHuntBD/2.0 (book price comparison; contact@bookhuntbd.com)";

// ─── Result cap ─────────────────────────────────────────────────────

export const MAX_RESULTS_PER_SCRAPER = 10;

// ─── Price parser helper ────────────────────────────────────────────

export function parsePrice(text: string): number {
    const cleaned = text.replace(/[^\d.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

export function calcDiscount(
    oldPrice: number,
    newPrice: number
): number | undefined {
    if (oldPrice > 0 && newPrice > 0 && oldPrice > newPrice) {
        return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    }
    return undefined;
}

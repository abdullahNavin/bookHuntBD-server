-- AlterTable
ALTER TABLE "BookCache" ADD COLUMN "failedSites" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Deduplicate existing rows: keep the newest per (query, site, link); tiebreak lowest id
DELETE FROM "BookCache" a
USING "BookCache" b
WHERE a."query" = b."query"
  AND a."site" = b."site"
  AND a."link" = b."link"
  AND (
    a."createdAt" < b."createdAt"
    OR (a."createdAt" = b."createdAt" AND a."id" < b."id")
  );

-- CreateIndex
CREATE UNIQUE INDEX "BookCache_query_site_link_key" ON "BookCache"("query", "site", "link");

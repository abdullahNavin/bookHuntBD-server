import type { Scraper } from "./base.scraper.js";
import { BookShoperScraper } from "./bookshoper.service.js";
import { DheeBooksScraper } from "./dheebooks.service.js";
import { BoiBazarScraper } from "./boibazar.service.js";
import { HarekRokomScraper } from "./harekrokom.service.js";
import { EboigharScraper } from "./eboighar.service.js";
import { BaatigharScraper } from "./baatighar.service.js";

export const scrapers: Scraper[] = [
    new BookShoperScraper(),
    new DheeBooksScraper(),
    new BoiBazarScraper(),
    new HarekRokomScraper(),
    new EboigharScraper(),
    new BaatigharScraper(),
];

export type { Scraper, BookResult } from "./base.scraper.js";
export { withTimeout } from "./base.scraper.js";

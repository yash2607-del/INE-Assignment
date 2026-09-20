# Technical Design & Implementation Notes

## Tooling Choice: Why Puppeteer?

When I first started looking at the INE mock storefront (https://demo.inelabteamdev.com/), my initial instinct was to use a simple HTTP client like `axios` or `node-fetch` alongside `cheerio` to parse the HTML. That approach would have been faster and lighter, but inspect element showed right away that the raw HTML doesn't contain price or stock data. 

The site is a SPA (Single Page Application) built with React and Vite. It uses a few clever client-side tricks to conceal the price:
- On initial page load, the `.price-block` container has a `.price-idle` class displaying "Price hidden", and the "Reveal price" button stays disabled.
- The storefront listens for mouse events over the price block. It requires at least 8 `mousemove` events and a dwell time of >= 600ms before enabling the reveal button.
- Once you click the button, client-side JS generates a canvas/WebGL fingerprint payload and calls `/api/quote/:id` to fetch the actual price.
- A cookie overlay dialog (`aria-label="Cookie consent"`) also pops up randomly, preventing pointer interaction until handled.

Because simple HTTP fetching can't execute browser JavaScript, track mouse movements, or handle interactive quote tokens, I had to use Puppeteer for the actual scraping step. For searching catalog items, though, lightweight `fetch` against the storefront API works great, so I combined both methods.

---

## Architecture: Unified Scraper for Headed & Headless Runs

Instead of writing separate scripts for normal runs and live demos, I built a single core scraper module (`backend/src/services/scraper/productScraper.js`).

- **Production Mode (`headless: true`)**: Runs silently in the background on server environments like Render with minimal memory overhead.
- **Demo Mode (`headless: false`)**: Triggered via `npm run scrape:headed -- <id>`. It opens a visible Chrome window so you can watch Puppeteer navigate to the item, clear cookie banners, hover over the price area to fulfill the dwell requirement, click "Reveal price", and pull the numbers.

Having one shared module ensures that what you see during a headed demo is the exact same logic running in production background jobs.

---

## Handling Asynchronous Page States & Anti-Bot Constraints

Rather than relying on fixed `setTimeout` calls that break when network speeds vary, the scraper relies on explicit DOM events:

1. Loads the product URL with `waitUntil: 'domcontentloaded'`.
2. Checks for the cookie consent banner and clicks "Accept cookies" if present to clear pointer locks.
3. Calculates the bounding box of `.price-block`, moves the cursor to the center, and generates 12-15 synthetic mouse moves over ~800ms. It also dispatches `mousemove` events directly to satisfy the site's internal tracking requirement.
4. Waits for `button[aria-label="Reveal price"]:not([disabled])` to become clickable.
5. Clicks the button and waits for `.price-block.price-success` or `.price-block.price-error`.
6. Extracts raw price and stock text, stripping out any hidden decoy DOM elements (`.amount[data-price="true"]` or `style="display:none"`).

---

## Retry Strategy & Exponential Backoff

Network blips and occasional anti-bot challenge failures are inevitable when scraping. I wrapped the page workflow in a bounded retry wrapper (`backend/src/services/scraper/retry.js`):

- Max retries: 3 attempts (configurable via `SCRAPE_MAX_RETRIES`).
- Delay calculation: Exponential backoff with random jitter (`baseDelay * 2^(attempt-1) + jitter`).
- Every attempt records its status (`STARTING`, `RETRIED`, `FAILED`, `SUCCESS`), execution time, and error messages so we have full visibility into what happened.

---

## Data Integrity & Preventing Stale/Fake Overwrites

One of the most important rules I followed was: **never write bad data to the database**.

- If a scrape fails, the system **does not** overwrite the last known price with `$0` or `null`.
- The product's `current_price` and `current_stock` in `tracked_products` stay untouched.
- No record is added to `price_history` for a failed run.
- Instead, the failure is recorded honestly in `scrape_logs` with the exact error message and attempt log details.

---

## Production Scheduling (Handling Free-Tier Sleep Limits)

Free-tier hosts like Render put backend instances to sleep after short periods of inactivity, which means `setInterval()` or in-memory node schedulers will stop firing when idle.

To solve this:
- I exposed an authenticated endpoint: `POST /api/scrape/run`.
- The route requires a secret header (`x-cron-secret`) matching the server's `CRON_SECRET`.
- An external cron service (such as cron-job.org) triggers this endpoint every 2 hours.
- When called, the backend loops through active tracked products sequentially, scraping each item and persisting new price history records. If one item errors out, it logs the failure and keeps processing the rest.

---

## Lessons Learned During Technical Investigation

1. **Don't trust static HTML**: Checking page source initially made it look like prices were missing entirely. Running the page in Chrome DevTools network tab revealed the client-side `/api/quote/:id` API call triggered by hover + click.
2. **Hidden decoy numbers**: The storefront injects hidden `<span>` tags with fake numbers inside `.price-main`. A simple `.textContent` grab returned junk strings like `₹49,99949`. Filtering out decoy elements before reading `textContent` fixed price accuracy.
3. **Catalog Pagination**: The store catalog endpoint (`/api/catalog`) caps results at 60 items per page across 1,000 total products. Updating the search service to fetch all catalog pages asynchronously ensured all 1,000 products can be searched and tracked seamlessly.

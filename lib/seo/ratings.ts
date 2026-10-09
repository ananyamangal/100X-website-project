/**
 * B2 (2026-10-09): product `rating` / `reviewsCount` values in the products
 * collection have no visible customer reviews behind them (docs/FACTS.md,
 * "Reviews"). Until real, visible product reviews exist, the site neither
 * renders the star badges nor emits AggregateRating markup. The DB values
 * are left untouched (see docs/SEO_CHANGELOG.md for the suppressed values).
 * Flip to true only once each rated product shows its reviews on the page.
 */
export const SHOW_PRODUCT_RATINGS = false as boolean

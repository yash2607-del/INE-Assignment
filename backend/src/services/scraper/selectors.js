/**
 * Centralized DOM selectors for the INE mock storefront (https://demo.inelabteamdev.com)
 * Standardized in order of preference: ARIA/role attributes, stable data-* attributes, stable CSS relationships.
 */
export const SELECTORS = {
  // Cookie overlay & consent banner
  cookieBanner: '.cookie-banner, [role="dialog"][aria-label="Cookie consent"]',
  cookieAcceptBtn: 'button[aria-label="Accept cookies"]',

  // Price reveal container & states
  priceBlock: '.price-block',
  priceIdle: '.price-block.price-idle',
  priceSuccess: '.price-block.price-success',
  priceError: '.price-block.price-error',
  priceLoadingSpinner: '.price-block .spinner',
  priceStatusText: '.price-status',

  // Reveal Price Action Button
  revealPriceBtn: 'button[aria-label="Reveal price"]',
  revealPriceBtnEnabled: 'button[aria-label="Reveal price"]:not([disabled])',
  tryAgainBtn: '.price-block.price-error button',

  // Price & Stock Display Selectors
  priceMain: '.price-main',
  // Exclude decoy hidden element .amount[data-price="true"]
  decoyPriceAmount: '.amount[data-price="true"]',
  stockBadge: '.stock-badge',
  stockInStock: '.stock-badge.in-stock',
  stockOutStock: '.stock-badge.out-stock',

  // Product detail metadata
  productTitle: 'h1',
  productCategory: '.tile-category',
  productBrandSku: '.detail-brand',
};

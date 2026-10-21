/** Catalog vocabulary shared by the API contract and the site config. */
export const PRODUCT_CATEGORIES = ['boots', 'shoes', 'bags', 'belts', 'wallets', 'accessories', 'care'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_GENDERS = ['men', 'women', 'unisex'] as const;
export type ProductGender = (typeof PRODUCT_GENDERS)[number];

export type {
  Product,
  ProductVariant,
  ProductSpecValue,
  WarehouseStock,
  ProductFacets,
  SpecFacet,
  FacetCount,
  ProductQuery,
  ProductSort,
  CompareRow,
  Comparison,
} from './model/types';
export { fetchProducts, fetchFacets, fetchProduct, fetchLiveVariants, fetchComparison, toQuery } from './api/product-api';
export { ProductCard } from './ui/ProductCard';
export { StockLine } from './ui/StockLine';
export { SpecTable } from './ui/SpecTable';
export { variantPrice, lowestPrice } from './model/price';

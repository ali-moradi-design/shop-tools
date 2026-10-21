import type { Product } from '../domain/product.entity';
type ProductLike = Omit<Product, 'id'> & {
  id?: string;
  _id?: { toString(): string };
};

function idOf(doc: { id?: string; _id?: { toString(): string } }): string {
  return doc.id ?? doc._id!.toString();
}

export function mapProduct(doc: ProductLike): Product {
  return {
    id: idOf(doc),
    slug: doc.slug,
    title: doc.title,
    name: doc.name,
    style: doc.style,
    color: doc.color,
    colorFamily: doc.colorFamily,
    colorGroup: doc.colorGroup,
    category: doc.category,
    gender: doc.gender,
    description: doc.description,
    features: [...(doc.features ?? [])],
    leather: doc.leather,
    construction: doc.construction,
    sole: doc.sole,
    price: doc.price,
    compareAtPrice: doc.compareAtPrice,
    currency: doc.currency,
    images: [...(doc.images ?? [])],
    variants: (doc.variants ?? []).map((v) => ({
      sku: v.sku,
      size: v.size,
      width: v.width,
      stock: v.stock,
    })),
    stock: doc.stock,
    tags: [...(doc.tags ?? [])],
    featured: Boolean(doc.featured),
    featuredOrder: doc.featuredOrder,
    ratingAvg: doc.ratingAvg ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    deletedAt: doc.deletedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

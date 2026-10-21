export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
  populated?: {
    product?: {
      id: string;
      title: string;
      slug: string;
      price: number;
      image?: string;
    };
  };
}

export interface CreateFavoriteInput {
  userId: string;
  productId: string;
}

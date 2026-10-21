export interface Review {
  id: string;
  product: string;
  user: string;
  rating: number;
  comment?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** populated fields when requested */
  populated?: {
    user?: { name: string; email: string };
    product?: { title: string; slug: string };
  };
}

export interface CreateReviewInput {
  product: string;
  user: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

export interface ReviewListFilter {
  product?: string;
  user?: string;
  page?: number;
  limit?: number;
}

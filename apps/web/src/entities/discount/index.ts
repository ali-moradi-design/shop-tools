export interface Discount {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  /** Percent, or cents for a fixed amount. */
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  color: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface LineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selected: boolean;
  categoryId: string;
  categoryName: string | null;
}

export interface ParsedReceipt {
  merchant: string | null;
  date: string | null;
  currency: string | null;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
}

export type UploadStep = "upload" | "parsing" | "review" | "creating";

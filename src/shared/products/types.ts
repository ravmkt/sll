export type ProductFormat = 'simple' | 'variation' | 'kit';
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';
export type ExtraValue = string | number | boolean | null;

export interface ProductTax {
  origin?: string | null;
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  item_type?: string | null;
  icms_rate?: number | null;
  ipi_rate?: number | null;
  pis_rate?: number | null;
  cofins_rate?: number | null;
  icms_cst?: string | null;
  ipi_cst?: string | null;
  pis_cst?: string | null;
  cofins_cst?: string | null;
  additional_info?: string | null;
}

export interface ProductRow {
  id?: string;
  store_id?: string;
  name: string;
  sku: string | null;
  format: ProductFormat;
  unit: string;
  gtin: string | null;
  validity_date: string | null;
  tags: string[];
  min_stock: number | null;
  max_stock: number | null;
  stock_location: string | null;
  cost_price: number | null;
  video_url: string | null;
  notes: string | null;
  net_weight_kg: number | null;
  gross_weight_kg: number | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  tax: ProductTax | null;
  extra_fields: Record<string, ExtraValue> | null;
  origin?: string | null;
  // Catalogo (6b-4)
  category_id?: string | null;
  brand_id?: string | null;
  price?: number | null;
  description?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  link?: string | null;
  active?: boolean;
}

export interface PriceList {
  id: string;
  name: string;
  active: boolean;
}

export interface ProductPrice {
  id?: string;
  price_list_id: string;
  variant_id: string | null;
  price: number;
}

export interface ProductSupplier {
  id?: string;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_code: string | null;
  purchase_cost: number | null;
  is_default: boolean;
}

export interface KitItem {
  id?: string;
  component_product_id: string;
  component_variant_id?: string | null;
  qty: number;
}

export interface CustomFieldDef {
  id?: string;
  entity: 'product';
  key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  sort_order: number;
}

export interface ProductDraft {
  product: ProductRow;
  prices: ProductPrice[];
  suppliers: ProductSupplier[];
  kitItems: KitItem[];
}
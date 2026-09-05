export type TimestampType = string | Date | { seconds: number; nanoseconds: number };

// User Roles
export type UserRole = "customer" | "admin" | "merchant";

// Category Structure
export interface CategoryNode {
  name: string;
  subcategories?: string[];
}

export interface SystemCategory {
  id?: string;
  name: string;

  categories: CategoryNode[];
  createdAt?: TimestampType;
  updatedAt?: TimestampType;
}

// 1. Users Collection
// Path: users/{userId}
export interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  location?: string;
  phone?: string;
  onboardingComplete?: boolean;
  role: UserRole;
  createdAt: TimestampType;
  updatedAt: TimestampType;
}

export interface ProductVariant {
  id: string; // Document ID in the subcollection
  productId?: string;
  size?: string;
  color?: string;
  price: number;
  stock: number | null;
  imageUrl?: string;
  createdAt?: TimestampType;
  updatedAt?: TimestampType;
}

// 2. Cart Item Subcollection (Under Users)
// Path: users/{userId}/cart/{productId}
export interface CartItem {
  productId: string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  addedAt: TimestampType;
}

// 3. Products Collection
// Path: products/{productId}
export interface Product {
  id?: string; // ID is usually the document ID
  adminId: string; // The ID of the admin who created this product

  name: string;
  shortDescription?: string;
  description: string;
  sku?: string;
  price: number;
  salePrice?: number;
  saleStartDate?: TimestampType | null;
  saleEndDate?: TimestampType | null;
  discount?: number;
  rawDetails?: string;
  countryOfOrigin?: string;
  currency: string; // e.g., 'USD'
  trackInventory?: boolean;
  stock: number | null;
  lowStockAlert?: boolean;
  allowBackorders?: boolean;
  groupCategory?: string;
  category: string;
  subcategories?: string[];
  imageUrls: string[]; // Links to Cloud Storage
  imageAltTexts?: Record<string, string>;
  allowMultiplePurchases?: boolean;
  videoUrl?: string;
  tags?: string[];
  features?: string[];
  labels?: string[];
  colors?: string[];
  sizes?: string[];
  grades?: string[];
  capacity?: string;
  power?: string;
  weight?: number;
  weightUnit?: string;
  attributes?: any;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  supplierName?: string;
  costPrice?: number;

  createdAt: TimestampType;
  updatedAt: TimestampType;
}

// Order Status Types
export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

// Shipping Address for Orders
export interface ShippingAddress {
  street: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface ShippingInformation {
  method: string;
  cost: number;
  trackingNumber?: string;
  estimatedDelivery?: TimestampType;
}

export interface ContactInformation {
  fullName: string;
  email: string;
  phone?: string;
}

// Order Item Snapshot
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  variantName?: string | null;
  color?: string | null;
  size?: string | null;
  imageUrl?: string | null;
}

// 4. Orders Collection
// Path: orders/{orderId}
export interface Order {
  id?: string; // Document ID
  userId: string;
  adminId?: string; // The ID of the admin who handled this order
  cartId?: string;
  checkoutId?: string;
  status: OrderStatus;
  totalAmount: number;
  contactInformation?: ContactInformation;
  shippingAddress: ShippingAddress;
  shippingInformation?: ShippingInformation;
  items: OrderItem[];
  createdAt: TimestampType;
  updatedAt: TimestampType;
}

// 5. Cart Collection
// Path: carts/{cartId}
export interface Cart {
  id?: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  createdAt: TimestampType;
  updatedAt: TimestampType;
}

// 6. Checkout Collection
// Path: checkouts/{checkoutId}
export interface Checkout {
  id?: string;
  userId: string;
  cartId?: string;
  contactInformation?: ContactInformation;
  shippingAddress?: ShippingAddress;
  shippingInformation?: ShippingInformation;
  status: "pending" | "processing" | "completed" | "failed";
  totalAmount: number;
  createdAt: TimestampType;
  updatedAt: TimestampType;
}

// 7. Draft Collection
// Path: drafts/{adminId}
export interface Draft {
  id?: string; // Document ID (corresponds to adminId)
  adminId: string;
  editForm: any;
  isAdding: boolean;
  editingId: number | null;
  isQuickAdd: boolean;
  updatedAt: TimestampType;
}

// 8. ProductTemplate Collection
// Path: templates/{templateId}
export interface ProductTemplate {
  id?: string; // Document ID
  adminId: string;
  name: string;
  data: any;
  createdAt: TimestampType;
  updatedAt: TimestampType;
}

// 9. StoreSettings Collection
// Path: settings/store
export interface StoreSettings {
  storeName?: string;
  storeDescription?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialMediaLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    website?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  updatedAt: TimestampType;
}

// Cloud Storage Paths reference:
// - Product Images: products/{productId}/{filename}
// - User Profiles: users/{userId}/{filename}


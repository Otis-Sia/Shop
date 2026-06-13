import { Timestamp } from "firebase/firestore";

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
  type: 'goods' | 'services';
  categories: CategoryNode[];
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
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
  storeName?: string;
  storeDescription?: string;
  businessCategories?: string[];
  businessType?: string;
  offeringType?: 'goods' | 'services' | 'both';
  industry?: string;
  storeContactEmail?: string;
  storeContactPhone?: string;
  socialMediaLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    website?: string;
  };
  logoUrl?: string;
  bannerUrl?: string;
  onboardingComplete?: boolean;
  role: UserRole;
  merchantStatus?: 'pending' | 'approved' | 'rejected' | 'verified';
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// 2. Cart Item Subcollection (Under Users)
// Path: users/{userId}/cart/{productId}
export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: Timestamp | Date;
}

// 3. Products Collection
// Path: products/{productId}
export interface Product {
  id?: string; // ID is usually the document ID
  merchantId: string; // The ID of the merchant who owns this product
  itemType?: 'goods' | 'service';
  name: string;
  shortDescription?: string;
  description: string;
  sku?: string;
  price: number;
  salePrice?: number;
  saleStartDate?: Timestamp | Date | null;
  saleEndDate?: Timestamp | Date | null;
  discount?: number;
  brand?: string;
  currency: string; // e.g., 'USD'
  trackInventory?: boolean;
  stock: number;
  lowStockAlert?: boolean;
  allowBackorders?: boolean;
  groupCategory?: string;
  category: string;
  subcategories?: string[];
  imageUrls: string[]; // Links to Cloud Storage
  imageAltTexts?: Record<string, string>;
  videoUrl?: string;
  tags?: string[];
  labels?: string[];
  colors?: string[];
  sizes?: string[];
  duration?: number; // Duration of the service in minutes
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
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
  estimatedDelivery?: Timestamp | Date;
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
}

// 4. Orders Collection
// Path: orders/{orderId}
export interface Order {
  id?: string; // Document ID
  userId: string;
  merchantId: string; // The ID of the merchant this order belongs to
  cartId?: string;
  checkoutId?: string;
  status: OrderStatus;
  totalAmount: number;
  contactInformation?: ContactInformation;
  shippingAddress: ShippingAddress;
  shippingInformation?: ShippingInformation;
  items: OrderItem[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// 5. Cart Collection
// Path: carts/{cartId}
export interface Cart {
  id?: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
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
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Cloud Storage Paths reference:
// - Product Images: products/{productId}/{filename}
// - User Profiles: users/{userId}/{filename}

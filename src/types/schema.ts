import { Timestamp } from "firebase/firestore";

// User Roles
export type UserRole = "customer" | "admin" | "merchant";

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
  businessCategory?: string;
  businessType?: string;
  role: UserRole;
  merchantStatus?: 'pending' | 'approved' | 'rejected';
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
  name: string;
  description: string;
  price: number;
  discount?: number;
  brand?: string;
  currency: string; // e.g., 'USD'
  stock: number;
  category: string;
  imageUrls: string[]; // Links to Cloud Storage
  tags?: string[];
  colors?: string[];
  sizes?: string[];
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

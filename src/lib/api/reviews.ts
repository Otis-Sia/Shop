import { auth, db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  doc,
  deleteDoc,
} from 'firebase/firestore';

export interface Review {
  id?: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Timestamp | Date;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: number[]; // [1-star count, 2-star count, ..., 5-star count]
}

/**
 * Fetches all reviews for a product, sorted by newest first.
 */
export async function getProductReviews(productId: string | number): Promise<Review[]> {
  const reviewsRef = collection(db, 'products', String(productId), 'reviews');
  const q = query(reviewsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Review[];
}

/**
 * Adds a review for a product. Requires authentication.
 * Enforces one review per user per product.
 */
export async function addReview(
  productId: string | number,
  rating: number,
  comment: string
): Promise<Review> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to write a review.');
  }

  // Enforce one review per user per product
  const alreadyReviewed = await hasUserReviewed(productId);
  if (alreadyReviewed) {
    throw new Error('You have already reviewed this product.');
  }

  const reviewsRef = collection(db, 'products', String(productId), 'reviews');

  const reviewData: Omit<Review, 'id'> = {
    userId: user.uid,
    userName: user.displayName || user.email || 'Anonymous',
    rating,
    comment,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(reviewsRef, reviewData);

  return {
    id: docRef.id,
    ...reviewData,
  };
}

/**
 * Calculates average rating and star distribution for a product.
 */
export async function getReviewStats(productId: string | number): Promise<ReviewStats> {
  const reviews = await getProductReviews(productId);

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: [0, 0, 0, 0, 0],
    };
  }

  const distribution = [0, 0, 0, 0, 0]; // index 0 = 1-star, index 4 = 5-star
  let totalRating = 0;

  for (const review of reviews) {
    const starIndex = Math.max(0, Math.min(4, review.rating - 1));
    distribution[starIndex]++;
    totalRating += review.rating;
  }

  return {
    averageRating: totalRating / reviews.length,
    totalReviews: reviews.length,
    distribution,
  };
}

/**
 * Deletes a review. Only the review author can delete their own review.
 */
export async function deleteReview(
  productId: string | number,
  reviewId: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to delete a review.');
  }

  const reviewRef = doc(db, 'products', String(productId), 'reviews', reviewId);
  await deleteDoc(reviewRef);
}

/**
 * Checks if the current user has already reviewed a product.
 */
export async function hasUserReviewed(productId: string | number): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const reviewsRef = collection(db, 'products', String(productId), 'reviews');
  const q = query(reviewsRef, where('userId', '==', user.uid));
  const snapshot = await getDocs(q);

  return !snapshot.empty;
}

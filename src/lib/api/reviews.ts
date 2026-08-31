import { auth } from '@/lib/firebase';

export interface Review {
  id?: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string | Date;
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
  try {
    const res = await fetch(`/api/reviews?productId=${encodeURIComponent(String(productId))}`);
    if (res.ok) {
      const data = await res.json();
      return (data.reviews || []) as Review[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Adds a review for a product. Requires authentication.
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

  const token = await user.getIdToken();
  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      productId: String(productId),
      rating,
      comment
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit review');
  }

  const data = await res.json();
  return data.review as Review;
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
 * Deletes a review. Only the review author or admin can delete.
 */
export async function deleteReview(
  productId: string | number,
  reviewId: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to delete a review.');
  }

  const token = await user.getIdToken();
  const res = await fetch(`/api/reviews?id=${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete review');
  }
}

/**
 * Checks if the current user has already reviewed a product.
 */
export async function hasUserReviewed(productId: string | number): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const reviews = await getProductReviews(productId);
  return reviews.some(r => r.userId === user.uid);
}

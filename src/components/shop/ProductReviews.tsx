'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { subscribeToAuthChanges, getUserProfile } from '@/lib/api/auth';
import {
  getProductReviews,
  addReview,
  getReviewStats,
  deleteReview,
  hasUserReviewed,
  Review,
  ReviewStats,
} from '@/lib/api/reviews';
import Icon from '@/components/Icon';

interface ProductReviewsProps {
  productId: string | number;
}

function StarRating({
  rating,
  size = 'text-lg',
}: {
  rating: number;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name={star <= Math.round(rating) ? 'star' : 'star_border'}
          className={`${size} text-amber-500`}
        />
      ))}
    </div>
  );
}

function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className="transition-transform hover:scale-125 active:scale-95 cursor-pointer"
        >
          <Icon
            name={star <= (hoverValue || value) ? 'star' : 'star_border'}
            className="text-2xl text-amber-500"
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 font-body-md text-sm text-secondary">
          {value} / 5
        </span>
      )}
    </div>
  );
}

function formatDate(date: Timestamp | Date): string {
  const d = date instanceof Timestamp ? date.toDate() : new Date(date as any);
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userName, setUserName] = useState('');
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const fetchReviews = useCallback(async () => {
    try {
      const [fetchedReviews, fetchedStats] = await Promise.all([
        getProductReviews(productId),
        getReviewStats(productId),
      ]);
      setReviews(fetchedReviews);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  }, [productId]);

  const checkUserReview = useCallback(async () => {
    const reviewed = await hasUserReviewed(productId);
    setUserHasReviewed(reviewed);
  }, [productId]);

  // Subscribe to auth changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Try to get display name from profile
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setUserName(
              [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
                firebaseUser.email ||
                'Anonymous'
            );
          } else {
            setUserName(firebaseUser.displayName || firebaseUser.email || 'Anonymous');
          }
        } catch {
          setUserName(firebaseUser.displayName || firebaseUser.email || 'Anonymous');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Load reviews and check user review status
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchReviews();
      if (user) {
        await checkUserReview();
      }
      setLoading(false);
    };
    load();
  }, [fetchReviews, checkUserReview, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    if (!comment.trim()) {
      setError('Please write a comment.');
      return;
    }

    setSubmitting(true);
    try {
      await addReview(productId, rating, comment.trim());
      setRating(0);
      setComment('');
      await fetchReviews();
      await checkUserReview();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete your review?')) return;

    try {
      await deleteReview(productId, reviewId);
      await fetchReviews();
      await checkUserReview();
    } catch (err: any) {
      setError(err.message || 'Failed to delete review.');
    }
  };

  if (loading) {
    return (
      <div className="border-2 border-on-surface bg-surface p-8 shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="space-y-3 mt-6">
            <div className="h-20 bg-gray-200 rounded" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <h2 className="font-headline-md text-2xl text-on-surface font-bold uppercase tracking-wider">
        Customer Reviews
      </h2>

      {/* Stats Header */}
      {stats && stats.totalReviews > 0 && (
        <div className="border-2 border-on-surface bg-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Average Rating */}
            <div className="flex flex-col items-center justify-center md:min-w-[160px]">
              <span className="font-headline-md text-5xl font-black text-on-surface">
                {stats.averageRating.toFixed(1)}
              </span>
              <StarRating rating={stats.averageRating} size="text-xl" />
              <span className="font-body-md text-sm text-secondary mt-1">
                {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {/* Distribution Bars */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((starLevel) => {
                const count = stats.distribution[starLevel - 1];
                const percentage =
                  stats.totalReviews > 0
                    ? (count / stats.totalReviews) * 100
                    : 0;
                return (
                  <div key={starLevel} className="flex items-center gap-3">
                    <span className="font-body-md text-sm font-bold text-on-surface w-12 text-right">
                      {starLevel} star
                    </span>
                    <div className="flex-1 h-4 bg-gray-100 border-2 border-on-surface overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="font-body-md text-xs text-secondary w-8">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Write Review Section */}
      <div className="border-2 border-on-surface bg-surface p-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        {!user ? (
          /* Login Prompt */
          <div className="text-center py-4">
            <p className="font-body-md text-secondary mb-3">
              Sign in to write a review
            </p>
            <Link
              href="/login"
              className="inline-block bg-primary-container text-on-primary-container font-bold text-sm uppercase tracking-wider px-6 py-3 border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] active:scale-95 active:translate-y-0.5 transition-all"
            >
              Sign In
            </Link>
          </div>
        ) : userHasReviewed ? (
          <p className="font-body-md text-secondary text-center py-4">
            You have already reviewed this product.
          </p>
        ) : (
          /* Review Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="font-extrabold text-xs uppercase tracking-wider text-on-surface block">
              Write a Review
            </label>

            {/* Star Selector */}
            <div>
              <label className="font-extrabold text-xs uppercase tracking-wider text-secondary block mb-2">
                Your Rating
              </label>
              <StarSelector value={rating} onChange={setRating} />
            </div>

            {/* Comment */}
            <div>
              <label className="font-extrabold text-xs uppercase tracking-wider text-secondary block mb-2">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={4}
                className="w-full font-body-md text-sm text-on-surface bg-surface border-2 border-on-surface p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none placeholder:text-secondary/50"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-error-container text-error font-body-md text-sm p-3 border-2 border-error">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary-container text-on-primary-container font-bold text-sm uppercase tracking-wider px-6 py-3 border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] active:scale-95 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_var(--color-on-surface)]"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="border-2 border-on-surface border-dashed bg-surface p-8 text-center">
            <Icon name="star_border" className="text-4xl text-secondary/40 mx-auto mb-2" />
            <p className="font-body-md text-secondary">
              No reviews yet. Be the first to review!
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="border-2 border-on-surface bg-surface p-5 shadow-[4px_4px_0px_0px_var(--color-on-surface)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Name & Date */}
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-headline-md text-sm font-bold text-on-surface">
                      {review.userName}
                    </span>
                    <span className="font-body-md text-xs text-secondary">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  {/* Stars */}
                  <StarRating rating={review.rating} size="text-base" />

                  {/* Comment */}
                  <p className="font-body-md text-sm text-on-surface mt-2 leading-relaxed">
                    {review.comment}
                  </p>
                </div>

                {/* Delete Button (own review only) */}
                {user && user.uid === review.userId && (
                  <button
                    onClick={() => handleDelete(review.id!)}
                    className="text-secondary hover:text-error transition-colors p-1 cursor-pointer"
                    title="Delete review"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { getReviewStats, ReviewStats } from '@/lib/api/reviews';
import Icon from '@/components/Icon';

interface ProductRatingBadgeProps {
  productId: string | number;
  showCount?: boolean;
}

export default function ProductRatingBadge({ productId, showCount = true }: ProductRatingBadgeProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const s = await getReviewStats(productId);
        if (mounted) setStats(s);
      } catch (err) {
        console.error('Error fetching review stats:', err);
      }
    };
    fetchStats();
    return () => { mounted = false; };
  }, [productId]);

  if (!stats || stats.totalReviews === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary/50">
        <span>No reviews yet</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-container">
      <div className="flex items-center">
        <span className="font-bold mr-1">{stats.averageRating.toFixed(1)}</span>
        <Icon name="star" className="text-[14px]" />
      </div>
      {showCount && (
        <span className="text-secondary text-[10px]">({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})</span>
      )}
    </div>
  );
}

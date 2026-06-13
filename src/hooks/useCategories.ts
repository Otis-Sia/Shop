import { useState, useEffect } from 'react';
import { SystemCategory } from '@/types/schema';
import { getSystemCategories } from '@/lib/api/categories';

export function useCategories() {
  const [categories, setCategories] = useState<SystemCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCategories = async () => {
      try {
        const data = await getSystemCategories();
        if (isMounted) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, loading };
}

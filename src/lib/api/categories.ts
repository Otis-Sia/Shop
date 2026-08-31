import { SystemCategory } from '@/types/schema';
import { auth } from '@/lib/firebase';
import { CATEGORIES_DATA } from '../data/categories';

export const getSystemCategories = async (): Promise<SystemCategory[]> => {
  try {
    const res = await fetch('/api/categories');
    if (res.ok) {
      const data = await res.json();
      return (data.categories || []) as SystemCategory[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const createSystemCategory = async (category: Omit<SystemCategory, 'id'>): Promise<string> => {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(category)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create category');
    }

    const data = await res.json();
    return data.category.id;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const updateSystemCategory = async (id: string, updates: Partial<SystemCategory>): Promise<void> => {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ id, ...updates })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update category');
    }
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteSystemCategory = async (id: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const res = await fetch(`/api/categories?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete category');
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Utility to seed initial data if collection is empty
export const seedCategories = async (): Promise<void> => {
  const existing = await getSystemCategories();
  if (existing.length > 0) {
    return;
  }

  for (const group of CATEGORIES_DATA.goods) {
    await createSystemCategory({
      name: group.name,

      categories: group.categories
    });
  }

};

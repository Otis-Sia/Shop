import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { SystemCategory } from '@/types/schema';
import { CATEGORIES_DATA } from '../data/categories';

const COLLECTION_NAME = 'categories';

export const getSystemCategories = async (): Promise<SystemCategory[]> => {
  try {
    const q = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemCategory));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const createSystemCategory = async (category: Omit<SystemCategory, 'id'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, COLLECTION_NAME));
    await setDoc(docRef, { ...category, createdAt: new Date().toISOString() });
    return docRef.id;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const updateSystemCategory = async (id: string, updates: Partial<SystemCategory>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteSystemCategory = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Utility to seed initial data if collection is empty
export const seedCategories = async (): Promise<void> => {
  const existing = await getSystemCategories();
  if (existing.length > 0) {
    console.log('Categories already seeded.');
    return;
  }

  console.log('Seeding categories from local data...');
  for (const group of CATEGORIES_DATA.goods) {
    await createSystemCategory({
      name: group.name,
      type: 'goods',
      categories: group.categories
    });
  }

  for (const group of CATEGORIES_DATA.services) {
    await createSystemCategory({
      name: group.name,
      type: 'services',
      categories: group.categories
    });
  }
  console.log('Finished seeding categories.');
};

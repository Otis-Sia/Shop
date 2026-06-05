import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateProducts() {
  try {
    // 1. Create a demo merchant user "Sia" if it doesn't exist
    const siaRef = doc(db, "users", "Sia");
    await setDoc(siaRef, {
      first_name: "Sia",
      last_name: "Demo",
      email: "sia@demo.merchant",
      role: "merchant",
      merchantStatus: "approved",
      storeName: "Sia's Demo Store",
      businessCategory: "Apparel",
      businessType: "Individual",
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log("Demo merchant 'Sia' created/verified.");

    // 2. Fetch all products and update merchantId
    console.log("Fetching products...");
    const productsSnapshot = await getDocs(collection(db, "products"));
    
    let updatedCount = 0;
    
    for (const docSnap of productsSnapshot.docs) {
      const productData = docSnap.data();
      
      // Update the product to have merchantId: "Sia"
      await updateDoc(docSnap.ref, {
        merchantId: "Sia"
      });
      
      updatedCount++;
      console.log(`Updated product: ${productData.name} (ID: ${docSnap.id}) -> merchantId: "Sia"`);
    }

    console.log(`Successfully migrated ${updatedCount} products to merchant 'Sia'!`);
    process.exit(0);
  } catch (error) {
    console.error("Error migrating products:", error);
    process.exit(1);
  }
}

migrateProducts();

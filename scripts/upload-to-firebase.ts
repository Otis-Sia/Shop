import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";
import fs from "fs";
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

async function uploadData() {
  try {
    const dataPath = path.resolve(__dirname, "../src/lib/data/products.json");
    const productsJson = fs.readFileSync(dataPath, "utf8");
    const products = JSON.parse(productsJson);

    console.log(`Found ${products.length} products to upload.`);

    for (const product of products) {
      const docId = product.id.toString();
      const docRef = doc(db, "products", docId);
      
      const productData = {
        name: product.name || "",
        description: product.description || "",
        price: product.price || 0,
        discount: product.discount || 0,
        brand: product.brand || "",
        currency: "USD",
        stock: product.stock || 0,
        category: product.category || "",
        imageUrls: [] as string[],
        tags: product.tags || [],
        colors: product.colors || [],
        sizes: product.sizes || [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Handle image URLs
      if (product.image_url) {
        productData.imageUrls.push(product.image_url);
      }
      if (product.additional_images && Array.isArray(product.additional_images)) {
        productData.imageUrls.push(...product.additional_images);
      }

      await setDoc(docRef, productData);
      console.log(`Uploaded: ${productData.name} (ID: ${docId})`);
    }

    console.log("All products successfully uploaded to Firestore!");
    process.exit(0);
  } catch (error) {
    console.error("Error uploading data:", error);
    process.exit(1);
  }
}

uploadData();

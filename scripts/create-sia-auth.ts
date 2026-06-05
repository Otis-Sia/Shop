import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDocs, collection, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function setupSiaAuth() {
  const email = "sia-admin@demo.merchant"; // slightly different email
  const password = "password123";
  let uid = "";

  try {
    console.log(`Attempting to register ${email}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    uid = userCredential.user.uid;
    console.log("Created Auth user with UID:", uid);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Auth user already exists, signing in to get UID...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      uid = userCredential.user.uid;
      console.log("Logged in Auth user with UID:", uid);
    } else {
      console.error("Auth error:", error);
      process.exit(1);
    }
  }

  try {
    // 1. Create the user document with the real UID
    const realUserRef = doc(db, "users", uid);
    await setDoc(realUserRef, {
      first_name: "Sia",
      last_name: "Demo",
      email: email,
      role: "merchant",
      merchantStatus: "approved",
      storeName: "Sia's Demo Store",
      businessCategory: "Apparel",
      businessType: "Individual",
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log("Updated real user document for Sia.");

    // 2. Update all products that currently have merchantId: "Sia"
    const q = query(collection(db, "products"), where("merchantId", "==", "Sia"));
    const productsSnapshot = await getDocs(q);
    
    let updatedCount = 0;
    for (const docSnap of productsSnapshot.docs) {
      await updateDoc(docSnap.ref, {
        merchantId: uid
      });
      updatedCount++;
    }
    console.log(`Updated ${updatedCount} products to point to the real UID.`);

    // 3. Delete the dummy "Sia" document
    await deleteDoc(doc(db, "users", "Sia"));
    console.log("Deleted dummy 'Sia' user document.");

    console.log("--- Login Credentials ---");
    console.log("Email:", email);
    console.log("Password:", password);

    process.exit(0);
  } catch (error) {
    console.error("Error setting up Sia:", error);
    process.exit(1);
  }
}

setupSiaAuth();

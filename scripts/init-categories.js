/**
 * Category Config Initialization Script
 * 
 * This script helps initialize the /config/categories document in Firestore.
 * 
 * OPTION 1 - Manual Setup (Recommended for first-time):
 * ========================================================
 * 1. Go to Firebase Console > Firestore Database
 * 2. Create a collection called "config"
 * 3. Create a document with ID "categories"
 * 4. Add the following fields:
 *    - categories: [copy from src/constants/categories.ts defaultCategories array]
 *    - version: 1
 *    - updatedAt: [use timestamp]
 * 
 * OPTION 2 - Using Firebase Admin SDK (requires setup):
 * ========================================================
 * Prerequisites:
 * 1. Install firebase-admin: npm install firebase-admin --save-dev
 * 2. Download serviceAccountKey.json from Firebase Console
 * 3. Place serviceAccountKey.json in project root
 * 4. Build the project: npm run build
 * 5. Run: node scripts/init-categories.js
 * 
 * OPTION 3 - From Frontend (for testing):
 * ========================================================
 * Add this to a temporary admin page in your app:
 * 
 * import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
 * import { db } from './config/firebase';
 * import { defaultCategories } from './constants/categories';
 * 
 * const initCategories = async () => {
 *   await setDoc(doc(db, 'config', 'categories'), {
 *     categories: defaultCategories,
 *     version: 1,
 *     updatedAt: serverTimestamp()
 *   });
 *   console.log('✅ Categories initialized');
 * };
 */

// Uncomment this section if using firebase-admin (Option 2):
/*
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Import after build
const { defaultCategories } = require('../dist/constants/categories.js');

async function initCategories() {
  try {
    console.log('🚀 Initializing consolidated categories document...');
    console.log(`📦 Total categories: ${defaultCategories.length}`);

    await db.collection('config').doc('categories').set({
      categories: defaultCategories,
      version: 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Successfully created /config/categories');
    console.log('🎯 This reduces category reads from ~50 to 1');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initCategories();
*/

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CATEGORY CONFIG INITIALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Please see the instructions at the top of this file.
  
  Recommended: Use OPTION 3 (Frontend) for quick setup.
  
  Add a temporary admin button that calls:
  
  const initCategories = async () => {
    await setDoc(doc(db, 'config', 'categories'), {
      categories: defaultCategories,
      version: 1,
      updatedAt: serverTimestamp()
    });
  };

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

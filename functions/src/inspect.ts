import * as admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'financetracker-b00a6'
});

const db = admin.firestore();

async function run() {
  console.log('Starting inspect script...');
  const usersCollection = await db.collection('users').get();
  
  for (const userDoc of usersCollection.docs) {
    const userId = userDoc.id;
    console.log('Inspecting User ID:', userId);
    
    const txs = await db.collection(`users/${userId}/transactions`).get();
    console.log(`Found ${txs.size} transactions for user ${userId}`);
    
    txs.forEach(doc => {
      const data = doc.data();
      const amt = Math.abs(data.amount || 0);
      if (amt === 500 || amt === 299 || amt === 1000) {
        console.log('Match:', {
          docId: doc.id,
          date: data.date,
          description: data.description,
          category: data.category,
          amount: data.amount,
          type: data.type
        });
      }
    });
  }
}

run().catch(console.error);

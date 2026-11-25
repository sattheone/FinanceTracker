// Seeds the Firebase emulators with a synthetic "returning user" so the
// brand-new-browser / cold-start path can be verified without a real account.
//
// Usage:
//   1) npm run emulators          (in one terminal)
//   2) npm run seed:emulator      (in another)
//   3) npm run dev:emulators      then log in with the printed credentials
//
// All data is synthetic and lives only in the local emulator.

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'financetracker-b00a6';
const EMAIL = 'testuser@example.com';
const PASSWORD = 'test1234';

const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'fake-emulator-key' });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const nowIso = new Date().toISOString();

// ── Bank accounts (known initial balances) ──
const bankAccounts = [
  { id: 'acc_hdfc',  accountType: 'savings',     bank: 'HDFC Bank', number: '••1234', initialBalance: 100000, logo: '', },
  { id: 'acc_empty', accountType: 'savings',     bank: 'Axis Bank', number: '••5678', initialBalance: 0,      logo: '', },
  { id: 'acc_icici', accountType: 'savings',     bank: 'ICICI Bank', number: '••9012', initialBalance: 200000, logo: '', },
];

// ── Assets ──
const assets = [
  { id: 'ast_mf',   name: 'Index Mutual Fund', category: 'mutual_funds', currentValue: 1000000, investedValue: 800000, isSIP: true },
  { id: 'ast_gold', name: 'Sovereign Gold',    category: 'gold',         currentValue: 200000,  investedValue: 150000 },
  { id: 'ast_epf',  name: 'EPF',               category: 'epf',          currentValue: 300000,  investedValue: 300000, isSIP: true },
];

// ── Liabilities ──
const liabilities = [
  { id: 'lia_home', name: 'Home Loan', type: 'home_loan', currentBalance: 400000, emiAmount: 25000 },
];

// ── Transactions: a few balance-affecting ones + padding to exceed one page (>50) ──
const txns = [];
let seq = 0;
const addTx = (bankAccountId, type, amount, category, date) => {
  txns.push({
    id: `tx_${String(seq).padStart(4, '0')}`,
    userId: null, // filled below
    bankAccountId, type, amount, category,
    date, description: `${type} ${category}`, createdAt: nowIso,
  });
  seq++;
};

// Balance-affecting (deterministic)
addTx('acc_hdfc', 'income',  50000, 'salary',   '2026-08-01');
addTx('acc_hdfc', 'expense', 20000, 'rent',     '2026-08-02');
addTx('acc_icici','expense', 50000, 'shopping', '2026-08-03');

// Padding: 55 balance-neutral transfers so hasMore=true after the 50-item page.
for (let i = 0; i < 55; i++) {
  addTx('acc_hdfc', 'transfer', 100, 'transfer', `2026-07-${String((i % 27) + 1).padStart(2, '0')}`);
}

// ── Compute authoritative balances/totals (mirrors app formula) ──
const balanceOf = (accId) => {
  const init = bankAccounts.find(a => a.id === accId).initialBalance;
  const delta = txns.filter(t => t.bankAccountId === accId).reduce((s, t) => {
    if (t.type === 'income') return s + t.amount;
    if (['expense', 'investment', 'insurance'].includes(t.type)) return s - t.amount;
    return s; // transfer = neutral
  }, 0);
  return init + delta;
};

async function main() {
  console.log(`Creating auth user ${EMAIL} …`);
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    uid = cred.user.uid;
  } catch (e) {
    if (String(e).includes('email-already-in-use')) {
      console.log('User already exists — reusing. (Restart the auth emulator to reset.)');
      // Deterministic-ish: we can't easily fetch uid here; sign-in path in app will work.
      // Re-run against a fresh emulator for a clean uid. Abort to avoid orphan data.
      process.exit(0);
    }
    throw e;
  }
  console.log(`  uid = ${uid}`);

  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalBank = bankAccounts.reduce((s, a) => s + balanceOf(a.id), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.currentBalance, 0);
  const netWorth = totalAssets + totalBank - totalLiabilities;

  // users/{uid}: profile (onboarding complete) + a COMPLETE dashboardSummary,
  // representing a real returning user whose other device already persisted it.
  await setDoc(doc(db, 'users', uid), {
    personalInfo: { name: 'Test User', email: EMAIL },
    onboarding: { completed: true },
    syncSettings: { mode: 'auto', autoIntervalMinutes: 15 },
    dashboardSummary: {
      totalAssets, totalBankBalance: totalBank, totalLiabilities, netWorth,
      retirementProgress: 0, totalLICMaturity: 0,
      currentMonthIncome: 50000, currentMonthExpenses: 70000,
      currentMonthInvestments: 0, currentMonthSurplus: -20000,
      accountCount: bankAccounts.length, goalCount: 0, recurringCount: 0,
      periodType: 'current', periodMonthLabel: 'August 2026', updatedAt: nowIso,
    },
    dashboardSummaryUpdatedAt: nowIso,
  });

  for (const a of bankAccounts) await setDoc(doc(db, 'bankAccounts', a.id), { ...a, userId: uid, createdAt: nowIso });
  for (const a of assets)       await setDoc(doc(db, 'assets', a.id),       { ...a, userId: uid, createdAt: nowIso });
  for (const l of liabilities)  await setDoc(doc(db, 'liabilities', l.id),  { ...l, userId: uid, createdAt: nowIso });
  for (const t of txns)         await setDoc(doc(db, 'transactions', t.id), { ...t, userId: uid });

  console.log('\n──────── SEED COMPLETE ────────');
  console.log(`  Login:            ${EMAIL} / ${PASSWORD}`);
  console.log(`  Bank accounts:    ${bankAccounts.length}  (total balance ₹${totalBank.toLocaleString()})`);
  console.log(`  Assets:           ${assets.length}  (total ₹${totalAssets.toLocaleString()})`);
  console.log(`  Liabilities:      ₹${totalLiabilities.toLocaleString()}`);
  console.log(`  Transactions:     ${txns.length}  (>50 → forces pagination)`);
  console.log(`  EXPECTED NET WORTH: ₹${netWorth.toLocaleString()}`);
  console.log('────────────────────────────────');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

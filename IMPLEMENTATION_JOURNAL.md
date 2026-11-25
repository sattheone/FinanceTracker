# Implementation Journal

A running log of non-trivial changes, the reasoning behind them, and the data
that informed them. Newest entries on top. Each entry should answer: *what
changed, why, what data backed the decision, and what to watch next.*

---

## 2026-08-17 — Emulator harness + per-source completeness (found on first-run)

### Firebase emulator test harness
Added a local Auth+Firestore emulator setup so the brand-new-user / cold-start
path can be verified without a real account:
- `firebase.json` → `emulators` block (auth:9099, firestore:8080, ui:4000).
- `firebase.ts` connects to emulators when `VITE_USE_EMULATORS=true`
  ([firebase.ts:39](src/config/firebase.ts:39)) — guarded so it never touches prod.
- Scripts: `dev:emulators`, `emulators`, `seed:emulator`.
- `scripts/seedEmulator.mjs` seeds a synthetic **returning user**
  (`testuser@example.com` / `test1234`): 3 bank accounts, 3 assets, 1 liability,
  58 transactions (>50 to force pagination), plus a matching complete
  `dashboardSummary`. Expected net worth **₹13,80,000**.
- Note: the Firestore emulator needs JDK ≥ 11; system default was Java 8. Use the
  Homebrew JDK: `JAVA_HOME=/opt/homebrew/opt/openjdk npm run emulators`.

### Bug found by the harness: wrong balance on true first-run
Logging in as the seeded user in a **fresh browser** (empty localStorage) showed
**Net Worth ₹14.0L** and **Current Balance ₹3,00,000** — both wrong (should be
₹13.8L / ₹2,80,000). Diagnosis: on a cold start transactions aren't loaded and
no per-account snapshot exists yet, so `getAccountBalance` returned
**initialBalance-only** (₹3,00,000 = Σ initial balances, ignoring the −₹20,000 of
transactions). The authoritative `dashboardSummary.totalBankBalance` (₹2,80,000)
existed but the Dashboard preferred live-compute whenever bank accounts were
present — the same too-coarse `hasBalanceSourceData` heuristic.

### Fix: per-source completeness on the Dashboard
Replaced the single `hasBalanceSourceData` flag with per-source gates
([Dashboard.tsx:64](src/pages/Dashboard.tsx:64)):
- `totalAssets` → live if `assets` loaded, else `dashboardSummary.totalAssets`.
- `totalLiabilities` → live if `liabilities` loaded, else summary.
- `totalBankBalance` → live **only when the full transaction set is loaded**
  (`transactions.length > 0 && !hasMoreTransactions`), else
  `dashboardSummary.totalBankBalance`.
- `totalAccountBalance` (Account Overview) now reuses `totalBankBalance` so it
  can't show an initialBalance-only sum.

**Result (re-verified in emulator):** Net Worth **₹13.8L**, Current Balance
**₹2,80,000**, consistent on the Dashboard and the Transactions page, in **3
Firestore reads** on cold start, no console errors.

This closes the general half of assessment issue #2: derived metrics now fall
back to the authoritative summary per-source instead of trusting a partial live
computation.

---

## 2026-08-17 — Correct balances under partial data + smaller "Load More" page

### #2 — Bank balances no longer summed from a partial transaction set

**Problem.** `getAccountBalance` computed `initialBalance + Σ(loaded transactions)`,
but transactions are cursor-paginated (initial page = 50). On a cold start the
loaded set is partial, so every balance — and the Dashboard's bank-balance
aggregate built on it — was wrong until the user paged through full history.

**Fix — self-healing known-balance snapshot** ([DataContext.tsx:2068](src/contexts/DataContext.tsx:2068)):
- `isTransactionSetComplete()` = `initialTransactionsLoadedRef.current && !hasMoreTransactions`.
- `getAccountBalance(id)`:
  1. full set loaded → authoritative live computation;
  2. partial set → return the **last complete snapshot** (`knownAccountBalancesRef`);
  3. no snapshot yet → best-effort live compute (prior behaviour, last resort).
- An effect snapshots every account's balance to the ref + `localStorage`
  (`accountBalances:{userId}`) whenever a complete set is loaded. Seeded from
  localStorage in Phase 1 of `loadUserData`, cleared on `resetUserData`.

**Why this shape.** A full incremental running-balance (increment on every
add/edit/delete/split/transfer) would be more "correct" but is high-risk for a
finance app — many mutation paths, easy to corrupt a balance. The snapshot is
bounded, needs **0 extra Firestore reads/writes**, and converges: any time the
complete set is present (warm cache, or after paging) the snapshot refreshes.

**Trade-off.** While partial, a balance can lag by transactions added since the
last complete snapshot. That is strictly better than a sum over an incomplete
set, and self-corrects on the next complete load.

### #3 — "Load More" page size 800 → 200

`loadMoreTransactions` fetched **800 docs per click** (vs. 50 for page 1) — a big
read burst and inconsistent. Introduced named constants
(`TRANSACTIONS_INITIAL_PAGE_SIZE = 50`, `TRANSACTIONS_MORE_PAGE_SIZE = 200`,
[DataContext.tsx:13](src/contexts/DataContext.tsx:13)). 200 is a moderate burst
and, since #2 no longer depends on loading the entire history at once, the extra
clicks for very large histories are acceptable.

---

## 2026-08-17 — Wire up (and guard) the dashboardSummary fast-path

### Decision
Resolved issue #1 from the read-optimization assessment below by **wiring up the
precomputed summary** rather than deleting it. The single-doc read was already
free (it piggybacks on the shared user-doc cache), so populating the write side
turns a dead code path into a working cross-device / cold-start fast-paint.

### What changed
- `saveDashboardSummary(summary, isComplete)` now persists to Firestore via
  `FirebaseService.upsertDashboardSummary`, **debounced 4s**, and **only when
  `isComplete`** ([DataContext.tsx:1084](src/contexts/DataContext.tsx:1084)).
- The recompute effect computes `isComplete` = *all* source collections loaded
  **and** `!hasMoreTransactions` (full transaction set), then passes it to the
  save ([DataContext.tsx:1268](src/contexts/DataContext.tsx:1268)).
- Pending write timer is cleared on `resetUserData` (logout) to avoid a stray
  write for a logged-out user.

### Reasoning / the trap avoided
The summary is computed from whatever subset is currently loaded, falling back
to `baseSummary` for unloaded pieces. **Persisting a partial summary would push a
half-correct value to other devices and re-create the exact stale-value bug** we
just fixed. Hence the `isComplete` gate — a partial summary is still cached in
localStorage for *this* device (fast + free), but only a fully-derived summary is
written to Firestore. Bank balance specifically depends on the full transaction
set, so `!hasMoreTransactions` is part of the gate.

### Cost
- Writes: 1 debounced user-doc merge when the *complete* summary changes;
  coalesced across bulk edits/imports by the 4s debounce + signature dedup.
  Suppressed entirely in manual sync mode.
- Reads: unchanged (still shares the user-doc cache).

---

## 2026-08-17 — Dashboard net worth wrong on first paint

### Symptom
Net worth on the Dashboard showed a wrong value on initial load. It only
corrected itself **after** visiting the Assets page.

### Root cause
The app uses **lazy, per-collection loading** (see the read-optimization notes
below). On mount, the Dashboard called only `loadDashboardSummary()` — it never
triggered `loadAssets()` / `loadLiabilities()`. Meanwhile **bank accounts load
eagerly** during initial `loadUserData`.

The Dashboard decides whether to trust live-computed values with this heuristic
([Dashboard.tsx:59](src/pages/Dashboard.tsx:59)):

```ts
const hasBalanceSourceData = assets.length > 0 || bankAccounts.length > 0 || liabilities.length > 0;
```

Because bank accounts are non-empty, `hasBalanceSourceData` is `true` from the
start, so the Dashboard computed net worth **live** — but with `assets = []` and
`liabilities = []`:

```
netWorth = calculatedTotalAssets(0) + bankBalance − calculatedTotalLiabilities(0)
```

→ wrong (bank-only) figure. Opening the Assets page ran `loadAssets()`,
populating `assets`; returning to the Dashboard recomputed the correct value.

### Fix
[Dashboard.tsx:40](src/pages/Dashboard.tsx:40) now eagerly loads the
balance-source collections on mount:

```ts
React.useEffect(() => {
  loadDashboardSummary();
  loadAssets();
  loadLiabilities();
  loadInsurance();   // LIC maturity has the same lazy dependency
}, []);
```

These loaders are **idempotent** (guarded by `lazyLoadedRef`) and **cache-first**
(read localStorage before Firestore), so the extra cost is ~0 reads when data is
already cached, and at most one Firestore read per collection on a cold session.

### Data / trade-off
- Extra reads on a cold (uncached) dashboard: up to **3** (assets, liabilities,
  insurance) — one-time per session, deduped by `lazyLoadedRef`.
- Benefit: net worth is correct on first paint; no need to visit Assets first.

### Still to watch (latent, same bug class)
- **`computedTotalBankBalance` is derived from the *loaded* transaction set**
  ([DataContext.tsx:1158](src/contexts/DataContext.tsx:1158)). Initial load is
  only 50 transactions ([DataContext.tsx:1266](src/contexts/DataContext.tsx:1266)).
  If not all of an account's transactions are loaded, the computed bank balance
  can be off. Balances rely on `initialBalance + Σ(loaded transactions)`, not a
  stored running balance. Consider persisting a per-account balance, or compute
  balance from an aggregate doc rather than the paginated transaction list.

---

## 2026-08-17 — Assessment: database read optimization

**Overall: the strategy is strong and deliberate, not naïve.** The remaining
issues are *coherence/correctness* gaps (partial data → wrong derived values),
not read-count waste.

### What's in place (and good)

| Technique | Where | Effect |
|---|---|---|
| **Cache-then-network** (offline-first) | `loadUserData` Phase 1/2, [DataContext.tsx:605](src/contexts/DataContext.tsx:605) | First paint from localStorage = **0 Firestore reads**; background sync updates silently |
| **Firestore persistent IndexedDB cache** + multi-tab | [firebase.ts:24](src/config/firebase.ts:24) | SDK-level cache under the app cache; offline reads |
| **Time-throttled background sync** | `shouldSync`, [DataContext.tsx:807](src/contexts/DataContext.tsx:807) | Skips sync if last sync < `autoIntervalMinutes` (default 15m) → no reads on rapid nav/refresh |
| **Lazy per-collection loading** | `loadAssets/Goals/Insurance/…`, guarded by `lazyLoadedRef` | Each collection read at most **once per session**, and only if its page is used |
| **Shared user-doc cache + in-flight dedup** | `getUserDocCached`, [firebaseService.ts:84](src/services/firebaseService.ts:84) | `getUserProfile` and `getDashboardSummary` share **one** user-doc read (TTL + de-dup) |
| **Zero-read summary writes** | `incrementCategorySummary`, [categorySummaryService.ts:28](src/services/categorySummaryService.ts:28) | `setDoc(merge)` + `increment()` → update aggregates with **0 reads, 1 write** |
| **Paginated transactions (cursor)** | `getTransactionsPage`, page1=50 / more=800 | Avoids loading full history up front |
| **Manual sync mode** | `syncSettings.mode === 'manual'` | Power users can suppress all background reads |

### Issues / recommendations

1. ~~**The precomputed `dashboardSummary` fast-path is effectively dead code.**~~
   **RESOLVED 2026-08-17** (see entry above). `saveDashboardSummary` now calls
   `upsertDashboardSummary` (debounced, and only for a *complete* summary), so
   the field is populated and the fast-paint actually works. The `isComplete`
   gate prevents persisting a partial summary that would re-introduce the
   stale-value bug.

2. ~~**Derived values computed from partial data.**~~ **RESOLVED 2026-08-17**
   for bank balances via the known-balance snapshot (see entry above). The
   general heuristic caveat still applies to any *new* derived metric — prefer an
   explicit "fully loaded" signal over "non-empty ⇒ trust".

3. ~~**`loadMoreTransactions` pulls 800 docs per call.**~~ **RESOLVED 2026-08-17**
   — page size lowered to 200 via a named constant.

4. **Cache staleness is time-based only** (15 min default). Cross-device edits
   won't appear until the next sync window. Acceptable for a single-user finance
   app; documented here so it's a known trade-off, not a surprise.

5. **No real-time `onSnapshot` listeners** — deliberate, to save reads. Correct
   call for this app's access pattern (single user, infrequent external writes).

### Net read cost, cold vs. warm session (rough)
- **Warm** (cache present, sync window not elapsed): **0 reads** to render
  Dashboard + navigate — everything from localStorage/IndexedDB.
- **Cold** (first login / cleared cache): 1 user doc + 1 bank accounts + 1
  category rules (parallel), then 1 per lazily-visited collection + 1
  transactions page (50). The Dashboard change adds up to 3 collection reads,
  one-time.

---

## How to use this journal
- Add an entry when a change involves a non-obvious trade-off, a subtle bug, or
  a perf/read-cost decision.
- Lead with the **symptom** (for bugs) or the **decision** (for design), then the
  **data/reasoning**, then **what to watch next**.
- Link to `file:line` so future readers can jump straight to the code.

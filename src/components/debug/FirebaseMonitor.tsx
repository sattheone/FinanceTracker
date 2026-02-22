/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              🔥 FIREBASE MONITOR — Advanced Analytics Widget                 ║
 * ║                                                                              ║
 * ║         Standalone • Drop-in • Zero-config • Copy to Any Project            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 *  TABLE OF CONTENTS
 * ─────────────────────────────────────────────────────────────────────────────────
 *  A. WHAT THIS FILE DOES
 *  B. REQUIREMENTS / PREREQUISITES
 *  C. INTEGRATION GUIDE — STEP BY STEP
 *     Step 1: Copy this file
 *     Step 2: Create the Firestore interceptor
 *     Step 3: Configure your bundler (Vite / Webpack / Next.js)
 *     Step 4: Render the widget in your app root
 *     Step 5: Track screen/route changes
 *  D. FRAMEWORK-SPECIFIC EXAMPLES
 *     • Vite + React (most common)
 *     • Next.js (App Router & Pages Router)
 *     • Webpack / Create React App (CRA)
 *     • Capacitor / Ionic + React
 *  E. HOW TO READ THE MONITOR (for non-developers)
 *  F. HOW TO SHARE REPORTS WITH AI
 *  G. TROUBLESHOOTING
 *  H. FEATURES LIST
 *  I. FULL INTERCEPTOR CODE (ready to copy — see SECTION 4 at bottom of file)
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 *  A. WHAT THIS FILE DOES
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *  This is a self-contained Firebase/Firestore monitoring widget. It automatically
 *  tracks every Firestore read, write, delete, and realtime listener in your app.
 *  It shows a small floating pill in the bottom-left corner of your screen. Click
 *  it to expand a full dashboard with health scoring, cost projections, per-screen
 *  and per-collection breakdowns, plain-English recommendations, and an AI-ready
 *  report you can copy and paste to any AI assistant for instant diagnosis.
 *
 *  HOW THE TRACKING WORKS (Vite alias trick):
 *  Your code does `import { getDoc } from 'firebase/firestore'`. Normally that
 *  loads the real Firebase SDK. With a Vite alias, we redirect that import to our
 *  "interceptor" file instead. The interceptor re-exports everything from the real
 *  SDK (`export * from '@firebase/firestore'`) AND overrides specific functions
 *  (getDoc, getDocs, setDoc, etc.) with wrapped versions that call
 *  `UsageTracker.trackRead(...)` before passing through to the real function.
 *
 *  Result: every existing Firestore call in your project is automatically tracked.
 *  No code changes needed in any of your components, hooks, or services.
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 *  B. REQUIREMENTS / PREREQUISITES
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *  1. React 16.8+ (uses hooks: useState, useEffect, useCallback, useMemo)
 *  2. Tailwind CSS (all styling uses Tailwind utility classes)
 *  3. Firebase JS SDK v9+ (modular SDK — the one with `import { getDoc } from 'firebase/firestore'`)
 *  4. TypeScript (optional but recommended — this file is .tsx)
 *  5. A bundler that supports import aliases: Vite, Webpack, or Next.js
 *
 *  If you don't have Tailwind CSS, you can still use this — the widget will just
 *  look unstyled. Add Tailwind or replace the class names with your own CSS.
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 *  C. INTEGRATION GUIDE — STEP BY STEP
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *  STEP 1: COPY THIS FILE
 *  ──────────────────────
 *  Copy this entire file into your project. Recommended location:
 *
 *    your-project/
 *    └── src/
 *        └── components/
 *            └── debug/
 *                └── FirebaseMonitor.tsx   ← this file
 *
 *  You can put it anywhere — just adjust import paths in the next steps.
 *
 *
 *  STEP 2: CREATE THE FIRESTORE INTERCEPTOR
 *  ─────────────────────────────────────────
 *  Create a new file called `firestoreInterceptor.ts` in your services folder:
 *
 *    your-project/
 *    └── src/
 *        └── services/
 *            └── firestoreInterceptor.ts   ← create this
 *
 *  Paste the FULL interceptor code from SECTION 4 at the bottom of this file.
 *  (Scroll all the way down — it's a complete, ready-to-copy file.)
 *
 *  The interceptor does 3 things:
 *    a) Re-exports everything from the real Firebase SDK (so all existing code works)
 *    b) Overrides read functions (getDoc, getDocs, etc.) to call UsageTracker.trackRead()
 *    c) Overrides write functions (setDoc, updateDoc, etc.) to call UsageTracker.trackWrite()
 *
 *  ⚠ IMPORTANT: Update the import path on this line inside the interceptor:
 *      import { UsageTracker } from '../components/debug/FirebaseMonitor';
 *  Make sure it points to wherever YOU placed FirebaseMonitor.tsx in Step 1.
 *
 *
 *  STEP 3: CONFIGURE YOUR BUNDLER
 *  ───────────────────────────────
 *  Tell your bundler to redirect `'firebase/firestore'` to your interceptor.
 *  This is what makes tracking automatic — zero changes to your app code.
 *
 *  ┌─ VITE (vite.config.ts) ────────────────────────────────────────────────┐
 *  │                                                                         │
 *  │  import { defineConfig } from 'vite';                                   │
 *  │  import react from '@vitejs/plugin-react';                              │
 *  │  import path from 'path';                                               │
 *  │                                                                         │
 *  │  export default defineConfig({                                          │
 *  │    plugins: [react()],                                                  │
 *  │    resolve: {                                                           │
 *  │      alias: {                                                           │
 *  │        'firebase/firestore': path.resolve(                              │
 *  │          './src/services/firestoreInterceptor.ts'  // ← your path      │
 *  │        ),                                                               │
 *  │      },                                                                 │
 *  │    },                                                                   │
 *  │  });                                                                    │
 *  │                                                                         │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 *  ┌─ WEBPACK / CRA (config-overrides.js or webpack.config.js) ─────────────┐
 *  │                                                                         │
 *  │  // In webpack.config.js (or via react-app-rewired / craco):           │
 *  │  module.exports = {                                                     │
 *  │    resolve: {                                                           │
 *  │      alias: {                                                           │
 *  │        'firebase/firestore': path.resolve(                              │
 *  │          __dirname, 'src/services/firestoreInterceptor.ts'             │
 *  │        ),                                                               │
 *  │      },                                                                 │
 *  │    },                                                                   │
 *  │  };                                                                     │
 *  │                                                                         │
 *  │  // For CRA without ejecting, use craco or react-app-rewired:          │
 *  │  // npm install @craco/craco                                            │
 *  │  // Create craco.config.js:                                             │
 *  │  // module.exports = {                                                  │
 *  │  //   webpack: {                                                        │
 *  │  //     alias: {                                                        │
 *  │  //       'firebase/firestore': path.resolve(                           │
 *  │  //         __dirname, 'src/services/firestoreInterceptor.ts'          │
 *  │  //       ),                                                            │
 *  │  //     },                                                              │
 *  │  //   },                                                                │
 *  │  // };                                                                  │
 *  │  // Then change package.json scripts to use craco instead of react-scripts│
 *  │                                                                         │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 *  ┌─ NEXT.JS (next.config.js) ─────────────────────────────────────────────┐
 *  │                                                                         │
 *  │  const path = require('path');                                          │
 *  │  /** @type {import('next').NextConfig} *\/                              │
 *  │  module.exports = {                                                     │
 *  │    webpack: (config) => {                                               │
 *  │      config.resolve.alias['firebase/firestore'] = path.resolve(        │
 *  │        __dirname, 'src/services/firestoreInterceptor.ts'               │
 *  │      );                                                                 │
 *  │      return config;                                                     │
 *  │    },                                                                   │
 *  │  };                                                                     │
 *  │                                                                         │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 *
 *  STEP 4: RENDER THE WIDGET IN YOUR APP ROOT
 *  ────────────────────────────────────────────
 *  Import and render <FirebaseMonitor /> at the root level of your app.
 *  It renders as a fixed-position floating widget — does NOT affect layout.
 *  It automatically hides in production (import.meta.env.PROD) and on
 *  native mobile (Capacitor).
 *
 *    // App.tsx (or your root component)
 *    import { FirebaseMonitor } from './components/debug/FirebaseMonitor';
 *
 *    function App() {
 *      return (
 *        <>
 *          {/* your app content *\/}
 *          <Router>...</Router>
 *
 *          {/* Add this at the very end, OUTSIDE your router *\/}
 *          <FirebaseMonitor />
 *        </>
 *      );
 *    }
 *
 *  That's it for basic setup! The monitor will now appear as a small pill
 *  in the bottom-left corner showing reads/writes/listeners in real time.
 *
 *
 *  STEP 5: TRACK SCREEN/ROUTE CHANGES (recommended)
 *  ─────────────────────────────────────────────────
 *  For per-screen breakdown, call UsageTracker.setScreen() when routes change.
 *  This tells the monitor which screen the user is on, so it can report
 *  "HomeScreen: 45 reads" vs "SettingsScreen: 3 reads".
 *
 *    // Option A: In a useEffect inside each screen/page component
 *    import { UsageTracker } from './components/debug/FirebaseMonitor';
 *
 *    function HomeScreen() {
 *      useEffect(() => {
 *        UsageTracker.setScreen('HomeScreen');
 *      }, []);
 *      return <div>...</div>;
 *    }
 *
 *    // Option B: Centralized — in a layout or router wrapper
 *    import { useLocation } from 'react-router-dom';
 *    import { UsageTracker } from './components/debug/FirebaseMonitor';
 *
 *    function ScreenTracker() {
 *      const location = useLocation();
 *      useEffect(() => {
 *        // Extract a friendly name from the pathname
 *        const name = location.pathname === '/' ? 'Home'
 *          : location.pathname.split('/').filter(Boolean)[0] || 'Unknown';
 *        UsageTracker.setScreen(name);
 *      }, [location.pathname]);
 *      return null;
 *    }
 *
 *    // Then place <ScreenTracker /> inside your <Router>:
 *    <Router>
 *      <ScreenTracker />
 *      <Routes>...</Routes>
 *    </Router>
 *
 *    // Option C: Next.js App Router — in layout.tsx
 *    'use client';
 *    import { usePathname } from 'next/navigation';
 *    import { useEffect } from 'react';
 *    import { UsageTracker } from '@/components/debug/FirebaseMonitor';
 *
 *    export default function RootLayout({ children }) {
 *      const pathname = usePathname();
 *      useEffect(() => {
 *        const name = pathname === '/' ? 'Home'
 *          : pathname.split('/').filter(Boolean)[0] || 'Unknown';
 *        UsageTracker.setScreen(name);
 *      }, [pathname]);
 *      return <html>...<FirebaseMonitor />{children}...</html>;
 *    }
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 *  D. FRAMEWORK-SPECIFIC EXAMPLES
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *  VITE + REACT (most common):
 *  ───────────────────────────
 *  Files to create/edit:
 *    1. src/components/debug/FirebaseMonitor.tsx  ← copy this file
 *    2. src/services/firestoreInterceptor.ts      ← copy from Section 4 below
 *    3. vite.config.ts                            ← add alias (see Step 3)
 *    4. src/App.tsx                                ← add <FirebaseMonitor /> (see Step 4)
 *
 *  NEXT.JS (App Router):
 *  ─────────────────────
 *  Files to create/edit:
 *    1. src/components/debug/FirebaseMonitor.tsx  ← copy this file
 *    2. src/services/firestoreInterceptor.ts      ← copy from Section 4 below
 *    3. next.config.js                            ← add webpack alias (see Step 3)
 *    4. src/app/layout.tsx                        ← add <FirebaseMonitor /> + screen tracking
 *  ⚠ Note: This component uses `import.meta.env.PROD` which is Vite-specific.
 *  For Next.js, change it to `process.env.NODE_ENV === 'production'`.
 *  Search for `import.meta.env.PROD` in this file and replace it.
 *
 *  NEXT.JS (Pages Router):
 *  ───────────────────────
 *    Same as above, but add <FirebaseMonitor /> in `_app.tsx` instead of layout.tsx.
 *
 *  CAPACITOR / IONIC + REACT:
 *  ──────────────────────────
 *  Works exactly like Vite + React. The widget auto-hides on native platforms
 *  (checks `window.Capacitor.isNativePlatform()`). It only shows in the browser
 *  during development. No extra config needed.
 *
 *  WEBPACK / CRA:
 *  ──────────────
 *  Use craco or react-app-rewired to add the alias without ejecting.
 *  See the Webpack section in Step 3 above.
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 *  E. HOW TO READ THE MONITOR (for non-developers)
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *  THE FLOATING PILL (collapsed view):
 *  ┌──────────────────────────────────┐
 *  │ 🟢 45R | 3W | 2L               │   ← click to expand
 *  └──────────────────────────────────┘
 *    🟢/🟡/🔴 = Health (green=good, yellow=warning, red=problem)
 *    45R = 45 database reads so far
 *    3W  = 3 database writes so far
 *    2L  = 2 active realtime listeners
 *
 *  COLORS MEANING:
 *    🟢 GREEN  = Everything is normal. No issues.
 *    🟡 YELLOW = Getting high. Some things need attention.
 *    🔴 RED    = Something is wrong. Too many reads/writes or a possible bug.
 *
 *  DASHBOARD TAB:
 *    - Health box at top: shows overall status and any alerts
 *    - Session Rates: how many reads/writes per minute
 *    - Cache Hit Rate: higher is better (means data comes from local cache, not server)
 *    - Cost Projection: estimates daily usage vs Firebase free tier (50K reads / 20K writes)
 *    - Recommendations: plain-English suggestions to fix issues
 *
 *  SCREENS TAB:
 *    Shows each screen/page in your app with its own read/write/listener counts.
 *    Screens with 🔴 or 🟡 badges have issues — those are the screens to investigate.
 *
 *  COLLECTIONS TAB:
 *    Shows each Firestore collection (like "users", "matches", "tournaments")
 *    ranked by total operations. The bar chart shows relative usage.
 *    If one collection dominates, that's where to look for optimizations.
 *
 *  ALERTS TAB:
 *    Lists all warnings and critical issues detected during the session.
 *    Each alert has a title and plain-English explanation of what's wrong.
 *    Below alerts, you'll find Recommendations — suggested fixes.
 *
 *  LOGS TAB:
 *    Raw activity log showing every Firestore operation in real time.
 *    READ = fetched from server, CACHE = fetched from local cache (free!)
 *    WRITE = saved data, DEL = deleted data, L+ = listener started, L- = listener stopped
 *
 *  NUMBERS TO WORRY ABOUT:
 *    - Reads per screen > 30     → 🟡 warning, > 80 → 🔴 critical
 *    - Writes per screen > 5     → 🟡 warning, > 15 → 🔴 critical
 *    - Active listeners > 12     → 🟡 warning, > 25 → 🔴 critical
 *    - Total session reads > 200 → 🟡 warning, > 500 → 🔴 critical
 *    - Cost projection > 40% of free tier → 🟡, > 80% → 🔴
 *    - Cache hit rate < 20%      → 🟡 (means offline persistence may not be enabled)
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 *  F. HOW TO SHARE REPORTS WITH AI
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *  1. Open the Firebase Monitor (click the floating pill)
 *  2. Click the "📋 Copy" button in the top-right corner
 *  3. Go to your AI assistant (ChatGPT, Claude, Copilot, etc.)
 *  4. Paste the report and ask:
 *     "Analyze this Firebase Monitor report. What problems do you see?
 *      What should I fix first? Give me the exact code changes."
 *
 *  The report includes:
 *    - Plain text summary (readable by humans)
 *    - JSON block at the bottom (structured data for AI to parse precisely)
 *    - Screen-by-screen and collection-by-collection breakdown
 *    - All alerts and recommendations
 *    - Recent activity log
 *
 *  The AI can then tell you exactly which screen or collection has a problem,
 *  and suggest specific code fixes (like adding caching, removing duplicate reads,
 *  fixing listener leaks, etc.).
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 *  G. TROUBLESHOOTING
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *  Q: Monitor shows 0 reads / 0 writes — nothing is being tracked.
 *  A: The bundler alias is probably not working. Check:
 *     1. Restart your dev server after changing vite.config / webpack.config
 *     2. Make sure the alias path is correct (absolute path with path.resolve)
 *     3. Check the console for import errors
 *     4. Verify you import from 'firebase/firestore' (not '@firebase/firestore')
 *        in your app code — the alias only intercepts 'firebase/firestore'
 *
 *  Q: Monitor doesn't appear at all.
 *  A: It auto-hides in production and on native platforms. Check:
 *     1. You're running in development mode (npm run dev)
 *     2. You're in a browser, not a Capacitor/Cordova native build
 *     3. <FirebaseMonitor /> is rendered in your component tree
 *     4. Check for JavaScript errors in the browser console
 *
 *  Q: TypeScript errors after adding the file.
 *  A: Make sure you have:
 *     - "jsx": "react-jsx" or "react" in tsconfig.json
 *     - react and react-dom in your dependencies
 *     - If using Next.js, change `import.meta.env.PROD` to
 *       `process.env.NODE_ENV === 'production'`
 *
 *  Q: "Cannot find module '@firebase/firestore'" in the interceptor.
 *  A: The interceptor imports from '@firebase/firestore' (with @), not
 *     'firebase/firestore'. The @ version is the internal package that gets
 *     installed automatically when you install 'firebase'. Make sure firebase
 *     is in your package.json dependencies.
 *
 *  Q: Screen names show "init" instead of actual screen names.
 *  A: You need to call UsageTracker.setScreen('ScreenName') on route changes.
 *     See Step 5 above for examples with React Router and Next.js.
 *
 *  Q: I'm using Realtime Database, not Firestore.
 *  A: This monitor only tracks Firestore operations. Realtime Database uses
 *     different APIs. You would need a separate interceptor for firebase/database.
 *
 *  Q: Can I use this without Tailwind CSS?
 *  A: Yes, but the UI will be unstyled. You have two options:
 *     1. Install Tailwind CSS (recommended): npm install -D tailwindcss
 *     2. Replace Tailwind classes with your own CSS (search for className=)
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 *  H. FEATURES LIST
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *   • Automatic Firestore read/write/delete/listener tracking (zero code changes)
 *   • Per-screen breakdown (see which page uses the most reads)
 *   • Per-collection breakdown with heatmap bar chart
 *   • Per-document tracking (see which specific document is read most often)
 *   • Health scoring: green → yellow → red (auto-detected from thresholds)
 *   • Burst detection (catches infinite loops — 50 reads in 5 seconds)
 *   • Listener leak detection (too many listeners never unsubscribed)
 *   • Duplicate read detection (same collection read 5+ times in 5 sec)
 *   • Cost projection (daily reads/writes extrapolated from session rate)
 *   • Cache hit rate monitoring (catches missing offline persistence)
 *   • Session rate tracking (reads/min, writes/min)
 *   • Plain-English recommendations ("This screen does 85 reads — add caching")
 *   • Bundle size + network transfer monitoring
 *   • AI-ready structured report export (text + JSON)
 *   • Copy-to-clipboard for instant sharing
 *   • Auto-hides in production and on native mobile
 *   • 5-tab UI: Dashboard, Screens, Collections, Alerts, Logs
 *   • Fixed-position floating widget — does not affect page layout
 *   • Single-file, zero dependencies beyond React + Tailwind
 *
 * REQUIREMENTS: React 16.8+, Tailwind CSS, Firebase/Firestore SDK v9+
 */

import React, { useEffect, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════
// SECTION 1 — TYPES & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export interface LogEntry {
    type: string;
    count: number;
    collection?: string;
    docPath?: string;
    timestamp: number;
    screen?: string;
}

export interface ScreenStats {
    reads: number;
    writes: number;
    deletes: number;
    cacheHits: number;
    listenerAdds: number;
}

export interface CollectionStats {
    reads: number;
    writes: number;
    deletes: number;
    listenerAdds: number;
}

export type AlertSeverity = 'warning' | 'critical';

export interface HealthAlert {
    id: string;
    severity: AlertSeverity;
    title: string;
    detail: string;
    screen?: string;
    collection?: string;
    timestamp: number;
}

export interface Recommendation {
    severity: AlertSeverity;
    title: string;
    detail: string;
    screen?: string;
    collection?: string;
}

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface TrackerStats {
    reads: number;
    writes: number;
    deletes: number;
    cacheHits: number;
    activeListeners: number;
    logs: LogEntry[];
    currentScreen: string;
    screenStats: Record<string, ScreenStats>;
    collectionStats: Record<string, CollectionStats>;
    networkBytes: number;
    bundleSizeKB: number;
    health: HealthStatus;
    alerts: HealthAlert[];
    recommendations: Recommendation[];
    sessionDurationMs: number;
    readsPerMin: number;
    writesPerMin: number;
    cacheHitRate: number;
    costProjection: { dailyReads: number; dailyWrites: number; readPct: number; writePct: number };
    topDocPaths: Array<{ path: string; count: number }>;
}

// ─── Thresholds ─────────────────────────────────────────────────

const SCREEN_THRESHOLDS = {
    reads:     { warn: 30, crit: 80 },
    writes:    { warn: 5,  crit: 15 },
    deletes:   { warn: 5,  crit: 15 },
    listeners: { warn: 8,  crit: 15 },
} as const;

const GLOBAL_THRESHOLDS = {
    reads:           { warn: 200, crit: 500 },
    writes:          { warn: 30,  crit: 80 },
    deletes:         { warn: 30,  crit: 80 },
    activeListeners: { warn: 12,  crit: 25 },
} as const;

const BURST_WINDOW_MS = 5_000;
const BURST_THRESHOLDS = {
    read:  { warn: 20, crit: 50 },
    write: { warn: 5,  crit: 12 },
} as const;

type UpdateListener = (stats: TrackerStats) => void;

// ═══════════════════════════════════════════════════════════════════
// SECTION 2 — TRACKER ENGINE
// ═══════════════════════════════════════════════════════════════════

class UsageTrackerService {
    private reads = 0;
    private writes = 0;
    private deletes = 0;
    private cacheHits = 0;
    private activeListeners = 0;
    private logs: LogEntry[] = [];
    private updateListeners: UpdateListener[] = [];
    private currentScreen = 'init';
    private screenStats: Record<string, ScreenStats> = {};
    private collStats: Record<string, CollectionStats> = {};
    private docPathReads: Record<string, number> = {};
    private networkBytes = 0;
    private bundleSizeKB = 0;
    private _bundleComputed = false;
    private sessionStart = Date.now();
    private firedAlertIds = new Set<string>();
    private alerts: HealthAlert[] = [];

    constructor() {
        if (typeof window !== 'undefined') {
            setTimeout(() => this.computeBundleSize(), 2000);
        }
    }

    // ─── Public API ─────────────────────────────────────────────

    setScreen(name: string) {
        if (name && name !== this.currentScreen) {
            this.currentScreen = name;
            if (!this.screenStats[name]) {
                this.screenStats[name] = { reads: 0, writes: 0, deletes: 0, cacheHits: 0, listenerAdds: 0 };
            }
            this.notify();
        }
    }

    trackRead(count = 1, collection?: string, fromCache = false, docPath?: string) {
        const screen = this.currentScreen;
        if (fromCache) {
            this.cacheHits += count;
            this.addLog('cache_read', count, collection, docPath, screen);
            this.bumpScreen(screen, 'cacheHits', count);
        } else {
            this.reads += count;
            this.addLog('read', count, collection, docPath, screen);
            this.bumpScreen(screen, 'reads', count);
            if (docPath) this.docPathReads[docPath] = (this.docPathReads[docPath] || 0) + count;
        }
        this.bumpCollection(collection, 'reads', count);
        this.checkHealth();
        this.notify();
    }

    trackWrite(count = 1, collection?: string, docPath?: string) {
        const screen = this.currentScreen;
        this.writes += count;
        this.addLog('write', count, collection, docPath, screen);
        this.bumpScreen(screen, 'writes', count);
        this.bumpCollection(collection, 'writes', count);
        this.checkHealth();
        this.notify();
    }

    trackDelete(count = 1, collection?: string, docPath?: string) {
        const screen = this.currentScreen;
        this.deletes += count;
        this.addLog('delete', count, collection, docPath, screen);
        this.bumpScreen(screen, 'deletes', count);
        this.bumpCollection(collection, 'deletes', count);
        this.checkHealth();
        this.notify();
    }

    trackListener(delta: number, collection?: string) {
        const screen = this.currentScreen;
        this.activeListeners += delta;
        if (delta > 0) {
            this.addLog('listener_add', 1, collection, undefined, screen);
            this.bumpScreen(screen, 'listenerAdds', 1);
            this.bumpCollection(collection, 'listenerAdds', 1);
        } else {
            this.addLog('listener_remove', 1, collection, undefined, screen);
        }
        this.checkHealth();
        this.notify();
    }

    addNetworkBytes(bytes: number) { this.networkBytes += bytes; }

    // ─── Derived metrics ────────────────────────────────────────

    getSessionDurationMs(): number { return Date.now() - this.sessionStart; }

    getRates() {
        const mins = Math.max(1, this.getSessionDurationMs() / 60_000);
        return {
            readsPerMin: Math.round(this.reads / mins * 10) / 10,
            writesPerMin: Math.round(this.writes / mins * 10) / 10,
        };
    }

    getCostProjection() {
        const { readsPerMin, writesPerMin } = this.getRates();
        const activeMinPerDay = 480; // assume 8hr active day
        const dailyReads = Math.round(readsPerMin * activeMinPerDay);
        const dailyWrites = Math.round(writesPerMin * activeMinPerDay);
        return {
            dailyReads,
            dailyWrites,
            readPct: Math.round(dailyReads / 50_000 * 100),
            writePct: Math.round(dailyWrites / 20_000 * 100),
        };
    }

    getCacheHitRate(): number {
        const total = this.reads + this.cacheHits;
        return total > 0 ? Math.round(this.cacheHits / total * 100) : 0;
    }

    getTopDocPaths(n = 10): Array<{ path: string; count: number }> {
        return Object.entries(this.docPathReads)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([path, count]) => ({ path, count }));
    }

    getFirestoreNetworkKB(): number {
        try {
            const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            let bytes = 0;
            for (const e of entries) {
                if (e.name.includes('firestore.googleapis.com') || e.name.includes('firestore.') || e.name.includes('google.firestore')) {
                    bytes += (e.transferSize || e.encodedBodySize || 0);
                }
            }
            return Math.round(bytes / 1024);
        } catch (_) { return 0; }
    }

    // ─── Health engine ──────────────────────────────────────────

    getHealth(): HealthStatus {
        if (this.alerts.some(a => a.severity === 'critical')) return 'red';
        if (this.alerts.some(a => a.severity === 'warning')) return 'yellow';
        return 'green';
    }

    getScreenHealth(screen: string): HealthStatus {
        const sa = this.alerts.filter(a => a.screen === screen);
        if (sa.some(a => a.severity === 'critical')) return 'red';
        if (sa.some(a => a.severity === 'warning')) return 'yellow';
        return 'green';
    }

    getMetricHealth(metric: 'reads' | 'writes' | 'deletes' | 'activeListeners'): HealthStatus {
        const v = (this as any)[metric] ?? 0;
        const t = GLOBAL_THRESHOLDS[metric];
        if (!t) return 'green';
        if (v >= t.crit) return 'red';
        if (v >= t.warn) return 'yellow';
        return 'green';
    }

    getScreenMetricHealth(screen: string, metric: 'reads' | 'writes' | 'deletes' | 'listeners'): HealthStatus {
        const ss = this.screenStats[screen];
        if (!ss) return 'green';
        const key = metric === 'listeners' ? 'listenerAdds' : metric;
        const v = (ss as any)[key] || 0;
        const t = SCREEN_THRESHOLDS[metric];
        if (!t) return 'green';
        if (v >= t.crit) return 'red';
        if (v >= t.warn) return 'yellow';
        return 'green';
    }

    getCollectionHealth(collection: string): HealthStatus {
        const cs = this.collStats[collection];
        if (!cs) return 'green';
        if (cs.reads >= 60 || cs.writes >= 15) return 'red';
        if (cs.reads >= 25 || cs.writes >= 8) return 'yellow';
        return 'green';
    }

    // ─── Recommendations ────────────────────────────────────────

    getRecommendations(): Recommendation[] {
        const recs: Recommendation[] = [];

        // Per-screen analysis
        for (const [screen, ss] of Object.entries(this.screenStats)) {
            if (ss.reads > 30)
                recs.push({ severity: ss.reads > 80 ? 'critical' : 'warning', screen,
                    title: `${screen}: ${ss.reads} reads`,
                    detail: `This screen makes ${ss.reads} database reads. Consider caching data, reducing re-renders, or using Firestore listeners instead of repeated fetches.` });
            if (ss.writes > 5)
                recs.push({ severity: ss.writes > 15 ? 'critical' : 'warning', screen,
                    title: `${screen}: ${ss.writes} writes`,
                    detail: `This screen performs ${ss.writes} writes. Check for duplicate writes, debounce rapid saves, or batch with writeBatch().` });
            if (ss.listenerAdds > 8)
                recs.push({ severity: ss.listenerAdds > 15 ? 'critical' : 'warning', screen,
                    title: `${screen}: ${ss.listenerAdds} listeners created`,
                    detail: `Many listeners created on this screen. Ensure every onSnapshot() unsubscribes in the useEffect cleanup. Possible listener leak.` });
        }

        // Per-collection analysis
        for (const [col, cs] of Object.entries(this.collStats)) {
            if (cs.reads > 25)
                recs.push({ severity: cs.reads > 60 ? 'critical' : 'warning', collection: col,
                    title: `Collection "${col}": ${cs.reads} reads`,
                    detail: `High read volume on this collection. Use a single listener instead of repeated getDocs(). Cache results in React state/context.` });
        }

        // Duplicate document reads
        const topPaths = this.getTopDocPaths(3);
        for (const { path, count } of topPaths) {
            if (count >= 5)
                recs.push({ severity: count >= 10 ? 'critical' : 'warning',
                    title: `Document read ${count} times: ${path.split('/').pop()}`,
                    detail: `"${path}" was fetched ${count} times. Lift the data into shared state or React context so it's fetched once and reused.` });
        }

        // Cache hit rate
        const chr = this.getCacheHitRate();
        const totalReads = this.reads + this.cacheHits;
        if (totalReads > 10 && chr < 20)
            recs.push({ severity: 'warning',
                title: `Low cache hit rate: ${chr}%`,
                detail: `Only ${chr}% of reads come from cache. Enable Firestore offline persistence (enableIndexedDbPersistence) for better performance and lower costs.` });

        // Active listeners
        if (this.activeListeners > 10)
            recs.push({ severity: this.activeListeners > 20 ? 'critical' : 'warning',
                title: `${this.activeListeners} active listeners`,
                detail: `Each listener holds an open connection and is billed for reads on every data change. Consolidate or unsubscribe unused listeners.` });

        return recs;
    }

    // ─── Internal helpers ───────────────────────────────────────

    private bumpScreen(screen: string, key: keyof ScreenStats, n: number) {
        if (this.screenStats[screen]) (this.screenStats[screen] as any)[key] += n;
    }

    private bumpCollection(col: string | undefined, key: keyof CollectionStats, n: number) {
        if (!col) return;
        if (!this.collStats[col]) this.collStats[col] = { reads: 0, writes: 0, deletes: 0, listenerAdds: 0 };
        (this.collStats[col] as any)[key] += n;
    }

    private addLog(type: string, count: number, collection?: string, docPath?: string, screen?: string) {
        this.logs.unshift({ type, count, collection, docPath, timestamp: Date.now(), screen });
        if (this.logs.length > 200) this.logs.length = 200;
    }

    private computeBundleSize() {
        if (this._bundleComputed) return;
        try {
            const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            let totalKB = 0;
            for (const e of entries) {
                if (e.name.match(/\.(js|css|wasm)(\?.*)?$/)) totalKB += (e.transferSize || e.encodedBodySize || 0) / 1024;
            }
            this.bundleSizeKB = Math.round(totalKB);
            this._bundleComputed = true;
            this.notify();
        } catch (_) { /* Performance API not available */ }
    }

    private pushAlert(severity: AlertSeverity, id: string, title: string, detail: string, screen?: string, collection?: string) {
        if (this.firedAlertIds.has(id)) return;
        this.firedAlertIds.add(id);
        this.alerts.unshift({ id, severity, title, detail, screen, collection, timestamp: Date.now() });
        if (this.alerts.length > 50) this.alerts.length = 50;
    }

    private checkHealth() {
        const screen = this.currentScreen;
        const ss = this.screenStats[screen];
        const now = Date.now();

        // Per-screen checks
        if (ss) {
            const checks: Array<[keyof typeof SCREEN_THRESHOLDS, number, string]> = [
                ['reads', ss.reads, 'reads'], ['writes', ss.writes, 'writes'],
                ['deletes', ss.deletes, 'deletes'], ['listeners', ss.listenerAdds, 'listeners added'],
            ];
            for (const [key, val, label] of checks) {
                const t = SCREEN_THRESHOLDS[key];
                if (val >= t.crit) this.pushAlert('critical', `scr_${key}_crit_${screen}`, `${screen}: Excessive ${label}`, `${val} ${label} on this screen (limit: ${t.crit})`, screen);
                else if (val >= t.warn) this.pushAlert('warning', `scr_${key}_warn_${screen}`, `${screen}: High ${label}`, `${val} ${label} on this screen (limit: ${t.warn})`, screen);
            }
        }

        // Global checks
        const gChecks: Array<[keyof typeof GLOBAL_THRESHOLDS, number, string]> = [
            ['reads', this.reads, 'reads'], ['writes', this.writes, 'writes'],
            ['deletes', this.deletes, 'deletes'], ['activeListeners', this.activeListeners, 'active listeners'],
        ];
        for (const [key, val, label] of gChecks) {
            const t = GLOBAL_THRESHOLDS[key];
            if (val >= t.crit) this.pushAlert('critical', `glob_${key}_crit`, `Session: Excessive ${label}`, `${val} total ${label} (limit: ${t.crit})`);
            else if (val >= t.warn) this.pushAlert('warning', `glob_${key}_warn`, `Session: High ${label}`, `${val} total ${label} (limit: ${t.warn})`);
        }

        // Burst detection
        const windowStart = now - BURST_WINDOW_MS;
        const recent = this.logs.filter(l => l.timestamp >= windowStart);
        const rReads = recent.filter(l => l.type === 'read').reduce((s, l) => s + l.count, 0);
        const rWrites = recent.filter(l => l.type === 'write').reduce((s, l) => s + l.count, 0);
        const bucket = Math.floor(now / 10_000);

        if (rReads >= BURST_THRESHOLDS.read.crit) this.pushAlert('critical', `burst_r_c_${bucket}`, 'Read burst detected', `${rReads} reads in 5 sec on [${screen}]. Possible infinite loop or missing cache.`, screen);
        else if (rReads >= BURST_THRESHOLDS.read.warn) this.pushAlert('warning', `burst_r_w_${bucket}`, 'Read burst', `${rReads} reads in 5 sec on [${screen}]`, screen);
        if (rWrites >= BURST_THRESHOLDS.write.crit) this.pushAlert('critical', `burst_w_c_${bucket}`, 'Write storm detected', `${rWrites} writes in 5 sec on [${screen}]. Check for duplicate saves.`, screen);
        else if (rWrites >= BURST_THRESHOLDS.write.warn) this.pushAlert('warning', `burst_w_w_${bucket}`, 'Write burst', `${rWrites} writes in 5 sec on [${screen}]`, screen);

        // Repeated collection reads in burst window
        const collCounts: Record<string, number> = {};
        for (const l of recent) { if (l.type === 'read' && l.collection) collCounts[l.collection] = (collCounts[l.collection] || 0) + l.count; }
        for (const [col, cnt] of Object.entries(collCounts)) {
            if (cnt >= 10) this.pushAlert('critical', `dup_c_${col}_${bucket}`, `Repeated reads: ${col}`, `${cnt} reads to "${col}" in 5 sec on [${screen}]`, screen, col);
            else if (cnt >= 5) this.pushAlert('warning', `dup_w_${col}_${bucket}`, `Repeated reads: ${col}`, `${cnt} reads to "${col}" in 5 sec on [${screen}]`, screen, col);
        }
    }

    // ─── Reset & Stats ──────────────────────────────────────────

    reset() {
        this.reads = this.writes = this.deletes = this.cacheHits = this.networkBytes = 0;
        this.logs = []; this.alerts = []; this.firedAlertIds.clear();
        this.collStats = {}; this.docPathReads = {};
        this.screenStats = {};
        this.sessionStart = Date.now();
        if (this.currentScreen) this.screenStats[this.currentScreen] = { reads: 0, writes: 0, deletes: 0, cacheHits: 0, listenerAdds: 0 };
        this.notify();
    }

    getStats(): TrackerStats {
        const rates = this.getRates();
        return {
            reads: this.reads, writes: this.writes, deletes: this.deletes,
            cacheHits: this.cacheHits, activeListeners: this.activeListeners,
            logs: this.logs, currentScreen: this.currentScreen,
            screenStats: { ...this.screenStats },
            collectionStats: { ...this.collStats },
            networkBytes: this.networkBytes, bundleSizeKB: this.bundleSizeKB,
            health: this.getHealth(), alerts: [...this.alerts],
            recommendations: this.getRecommendations(),
            sessionDurationMs: this.getSessionDurationMs(),
            readsPerMin: rates.readsPerMin, writesPerMin: rates.writesPerMin,
            cacheHitRate: this.getCacheHitRate(),
            costProjection: this.getCostProjection(),
            topDocPaths: this.getTopDocPaths(10),
        };
    }

    // ─── Report builders (for copy/share) ───────────────────────

    buildTextReport(): string {
        const s = this.getStats();
        const hr = '─'.repeat(55);
        const dur = fmtDuration(s.sessionDurationMs);
        const L: string[] = [];

        L.push('🔥 FIREBASE MONITOR REPORT v2.0');
        L.push(`📅 ${new Date().toLocaleString()}`);
        L.push(`📍 ${typeof window !== 'undefined' ? window.location.href : ''}`);
        L.push(`📱 Screen: ${s.currentScreen}  |  🩺 Health: ${s.health.toUpperCase()}${s.alerts.length ? ` (${s.alerts.length} alerts)` : ''}`);
        L.push(`⏱ Session: ${dur}  |  Rate: ${s.readsPerMin} reads/min, ${s.writesPerMin} writes/min`);
        L.push(hr);

        L.push('📊 TOTALS');
        L.push(`  Reads (server):   ${s.reads}`);
        L.push(`  Writes:           ${s.writes}`);
        L.push(`  Deletes:          ${s.deletes}`);
        L.push(`  Cache Hits:       ${s.cacheHits}  (${s.cacheHitRate}% hit rate)`);
        L.push(`  Active Listeners: ${s.activeListeners}`);
        L.push(`  Bundle (JS+CSS):  ${s.bundleSizeKB} KB`);
        L.push(`  Firestore Net:    ~${this.getFirestoreNetworkKB()} KB`);
        L.push(hr);

        L.push('💰 COST PROJECTION (daily @ 8hr active)');
        L.push(`  Reads:  ~${s.costProjection.dailyReads.toLocaleString()}/day  (${s.costProjection.readPct}% of 50K free)`);
        L.push(`  Writes: ~${s.costProjection.dailyWrites.toLocaleString()}/day  (${s.costProjection.writePct}% of 20K free)`);
        L.push(hr);

        const screens = Object.entries(s.screenStats).filter(([, v]) => v.reads + v.writes + v.deletes + v.listenerAdds > 0);
        if (screens.length) {
            L.push('📱 PER-SCREEN BREAKDOWN');
            for (const [name, sc] of screens) {
                const h = this.getScreenHealth(name);
                const badge = h === 'red' ? ' 🔴' : h === 'yellow' ? ' 🟡' : ' 🟢';
                L.push(`  [${name}]${badge}`);
                L.push(`    R:${sc.reads}  W:${sc.writes}  D:${sc.deletes}  Cache:${sc.cacheHits}  L+:${sc.listenerAdds}`);
            }
            L.push(hr);
        }

        const cols = Object.entries(s.collectionStats).sort((a, b) => (b[1].reads + b[1].writes) - (a[1].reads + a[1].writes));
        if (cols.length) {
            L.push('📦 COLLECTION BREAKDOWN');
            for (const [name, cs] of cols) {
                const h = this.getCollectionHealth(name);
                const badge = h === 'red' ? ' 🔴' : h === 'yellow' ? ' 🟡' : '';
                L.push(`  ${name}${badge}  R:${cs.reads}  W:${cs.writes}  D:${cs.deletes}  L+:${cs.listenerAdds}`);
            }
            L.push(hr);
        }

        if (s.topDocPaths.length) {
            L.push('🔝 TOP READ DOCUMENTS');
            for (const { path, count } of s.topDocPaths.slice(0, 5)) L.push(`  ${path}  ×${count}`);
            L.push(hr);
        }

        if (s.alerts.length) {
            L.push('⚠️  ALERTS');
            for (const a of s.alerts) {
                L.push(`  ${a.severity === 'critical' ? '🔴' : '🟡'} [${new Date(a.timestamp).toLocaleTimeString()}] ${a.title}`);
                L.push(`     ${a.detail}`);
            }
            L.push(hr);
        }

        if (s.recommendations.length) {
            L.push('💡 RECOMMENDATIONS');
            for (const r of s.recommendations)
                L.push(`  ${r.severity === 'critical' ? '🔴' : '🟡'} ${r.title}\n     ${r.detail}`);
            L.push(hr);
        }

        L.push('📝 ACTIVITY LOG (newest first, last 50)');
        for (const log of s.logs.slice(0, 50)) {
            const t = new Date(log.timestamp).toLocaleTimeString();
            const col = log.collection ? ` [${log.collection}]` : '';
            const p = log.docPath ? ` → ${log.docPath}` : '';
            const c = log.count > 1 ? ` x${log.count}` : '';
            const scr = log.screen ? ` (${log.screen})` : '';
            L.push(`  ${t}  ${log.type.toUpperCase().padEnd(14)}${col}${p}${c}${scr}`);
        }
        L.push(hr);

        // JSON block for AI analysis
        L.push('');
        L.push('📋 JSON (for AI analysis — paste this to your AI assistant):');
        L.push(this.buildJsonReport());

        return L.join('\n');
    }

    buildJsonReport(): string {
        const s = this.getStats();
        return JSON.stringify({
            version: '2.0',
            timestamp: new Date().toISOString(),
            url: typeof window !== 'undefined' ? window.location.href : '',
            screen: s.currentScreen,
            health: s.health,
            session: { durationMs: s.sessionDurationMs, duration: fmtDuration(s.sessionDurationMs) },
            summary: {
                reads: s.reads, writes: s.writes, deletes: s.deletes,
                cacheHits: s.cacheHits, cacheHitRate: s.cacheHitRate,
                activeListeners: s.activeListeners,
                bundleSizeKB: s.bundleSizeKB, firestoreNetKB: this.getFirestoreNetworkKB(),
                readsPerMin: s.readsPerMin, writesPerMin: s.writesPerMin,
            },
            costProjection: s.costProjection,
            screens: s.screenStats,
            collections: s.collectionStats,
            topDocPaths: s.topDocPaths,
            alerts: s.alerts.map(a => ({ severity: a.severity, title: a.title, detail: a.detail, screen: a.screen, collection: a.collection })),
            recommendations: s.recommendations.map(r => ({ severity: r.severity, title: r.title, detail: r.detail, screen: r.screen, collection: r.collection })),
            recentLogs: s.logs.slice(0, 100).map(l => ({ type: l.type, count: l.count, collection: l.collection, docPath: l.docPath, screen: l.screen, time: new Date(l.timestamp).toLocaleTimeString() })),
        }, null, 2);
    }

    // ─── Event system ───────────────────────────────────────────

    on(event: 'update', listener: UpdateListener) { if (event === 'update') this.updateListeners.push(listener); }
    off(event: 'update', listener: UpdateListener) { if (event === 'update') this.updateListeners = this.updateListeners.filter(l => l !== listener); }
    private notify() { const s = this.getStats(); this.updateListeners.forEach(l => l(s)); }
}

function fmtDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export const UsageTracker = new UsageTrackerService();

// ═══════════════════════════════════════════════════════════════════
// SECTION 3 — REACT UI COMPONENT
// ═══════════════════════════════════════════════════════════════════

type Tab = 'dashboard' | 'screens' | 'collections' | 'alerts' | 'logs';

const H_DOT: Record<HealthStatus, string> = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500' };
const H_PILL_BG: Record<HealthStatus, string> = { green: 'bg-black/80 border-white/10', yellow: 'bg-amber-950/90 border-amber-500/40', red: 'bg-red-950/90 border-red-500/50' };
const H_PANEL_BG: Record<HealthStatus, string> = { green: 'bg-slate-900/95 border-white/10', yellow: 'bg-slate-900/95 border-amber-500/30', red: 'bg-red-950/95 border-red-500/40' };

function mc(h: HealthStatus, base: string): string { return h === 'red' ? 'text-red-400' : h === 'yellow' ? 'text-amber-400' : base; }

export const FirebaseMonitor: React.FC = () => {
    // Hide in production & native
    const isNative = typeof (window as any)?.Capacitor?.isNativePlatform === 'function' ? (window as any).Capacitor.isNativePlatform() : false;
    if (isNative || import.meta.env.PROD) return null;

    const [stats, setStats] = useState<TrackerStats>(UsageTracker.getStats());
    const [isExpanded, setIsExpanded] = useState(false);
    const [tab, setTab] = useState<Tab>('dashboard');
    const [copied, setCopied] = useState(false);
    const [firestoreNetKB, setFirestoreNetKB] = useState(0);

    useEffect(() => {
        const handle = (s: TrackerStats) => setStats(s);
        UsageTracker.on('update', handle);
        const iv = setInterval(() => { setStats(UsageTracker.getStats()); setFirestoreNetKB(UsageTracker.getFirestoreNetworkKB()); }, 2000);
        return () => { UsageTracker.off('update', handle); clearInterval(iv); };
    }, []);

    const health = stats.health;
    const alertCount = stats.alerts.length;
    const critCount = stats.alerts.filter(a => a.severity === 'critical').length;

    const handleCopy = useCallback(async () => {
        const text = UsageTracker.buildTextReport();
        try { await navigator.clipboard.writeText(text); }
        catch (_) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    }, []);

    // ─── Collapsed Pill ─────────────────────────────────────
    if (!isExpanded) {
        return (
            <div className={`fixed bottom-4 left-4 z-[9999] backdrop-blur-md text-white text-xs p-2 rounded-full cursor-pointer shadow-lg hover:scale-105 transition-all border flex items-center gap-2 ${H_PILL_BG[health]}`} onClick={() => setIsExpanded(true)}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${H_DOT[health]}`} />
                <span className={`font-mono font-bold ${mc(UsageTracker.getMetricHealth('reads'), 'text-white')}`}>{stats.reads}R</span>
                <span className="text-white/30">|</span>
                <span className={`font-mono font-bold ${mc(UsageTracker.getMetricHealth('writes'), 'text-white')}`}>{stats.writes}W</span>
                <span className="text-white/30">|</span>
                <span className={`font-mono font-bold ${mc(UsageTracker.getMetricHealth('activeListeners'), 'text-blue-400')}`}>{stats.activeListeners}L</span>
                {alertCount > 0 && <>
                    <span className="text-white/30">|</span>
                    <span className={`font-mono font-bold ${critCount > 0 ? 'text-red-400' : 'text-amber-400'}`}>{critCount > 0 ? `🔴${critCount}` : `⚠${alertCount}`}</span>
                </>}
            </div>
        );
    }

    // ─── Expanded Panel ─────────────────────────────────────
    const screenEntries = Object.entries(stats.screenStats).filter(([, v]) => v.reads + v.writes + v.deletes + v.cacheHits + v.listenerAdds > 0);
    const collEntries = Object.entries(stats.collectionStats).sort((a, b) => (b[1].reads + b[1].writes) - (a[1].reads + a[1].writes));
    const maxCollOps = collEntries.length ? Math.max(1, collEntries[0][1].reads + collEntries[0][1].writes) : 1;

    return (
        <div className={`fixed bottom-4 left-4 z-[9999] backdrop-blur-md text-slate-200 text-xs p-4 rounded-xl shadow-2xl border w-[380px] max-h-[75vh] flex flex-col transition-all duration-200 ${H_PANEL_BG[health]}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${H_DOT[health]}`} />
                    <span className="font-bold text-white text-[11px]">Firebase Monitor</span>
                    <span className="text-[9px] text-slate-500 bg-white/5 px-1.5 rounded">{stats.currentScreen}</span>
                    {health !== 'green' && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${health === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{health === 'red' ? `${critCount} CRITICAL` : `${alertCount} WARN`}</span>}
                </div>
                <div className="flex gap-1">
                    <button onClick={handleCopy} className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${copied ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-400 hover:text-white hover:bg-white/20'}`} title="Copy full report (text + JSON)">{copied ? '✓ Copied!' : '📋 Copy'}</button>
                    <button onClick={() => UsageTracker.reset()} className="px-1.5 py-0.5 rounded text-[9px] bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 transition-colors" title="Reset">Reset</button>
                    <button onClick={() => setIsExpanded(false)} className="px-1.5 py-0.5 rounded text-[9px] bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 transition-colors" title="Collapse monitor">Collapse</button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                    { label: 'Reads', val: stats.reads, color: 'text-emerald-400', hk: 'reads' as const },
                    { label: 'Writes', val: stats.writes, color: 'text-amber-400', hk: 'writes' as const },
                    { label: 'Deletes', val: stats.deletes, color: 'text-red-400', hk: 'deletes' as const },
                    { label: 'Listeners', val: stats.activeListeners, color: 'text-blue-400', hk: 'activeListeners' as const },
                    { label: 'Cache', val: stats.cacheHits, color: 'text-purple-400', hk: null },
                    { label: 'Bundle', val: stats.bundleSizeKB, color: 'text-cyan-400', hk: null, suffix: 'KB' },
                ].map(m => (
                    <div key={m.label} className="bg-white/5 p-1.5 rounded-lg flex flex-col items-center">
                        <span className="text-slate-500 text-[8px] uppercase tracking-wider">{m.label}</span>
                        <span className={`text-lg font-mono font-bold ${m.hk ? mc(UsageTracker.getMetricHealth(m.hk), m.color) : m.color}`}>{m.val}{m.suffix && <span className="text-[8px] text-slate-500">{m.suffix}</span>}</span>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 mb-2 border-b border-white/10 overflow-x-auto">
                {(['dashboard', 'screens', 'collections', 'alerts', 'logs'] as Tab[]).map(t => (
                    <button key={t} className={`pb-1 px-1.5 text-[10px] transition-colors relative capitalize whitespace-nowrap ${tab === t ? 'text-white font-medium' : 'text-slate-500 hover:text-slate-300'}`} onClick={() => setTab(t)}>
                        {t === 'alerts' ? <>alerts{alertCount > 0 && <span className={`ml-0.5 text-[8px] font-bold px-1 rounded-full ${critCount > 0 ? 'bg-red-500/30 text-red-400' : 'bg-amber-500/30 text-amber-400'}`}>{alertCount}</span>}</>
                         : t === 'collections' ? <>collections{collEntries.length > 0 && <span className="ml-0.5 text-[8px] text-slate-500">{collEntries.length}</span>}</>
                         : t}
                        {tab === t && <span className="absolute bottom-[-1px] left-0 w-full h-[1px] bg-emerald-500" />}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">

                {/* ── DASHBOARD ─────────────────────────────── */}
                {tab === 'dashboard' && (
                    <div className="space-y-2 text-[10px]">
                        {/* Health indicator */}
                        <div className={`rounded p-2 ${health === 'red' ? 'bg-red-500/10 border border-red-500/20' : health === 'yellow' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${H_DOT[health]}`} />
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${health === 'red' ? 'text-red-400' : health === 'yellow' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {health === 'green' ? 'All Clear — No Issues' : health === 'yellow' ? `${alertCount} Warning${alertCount > 1 ? 's' : ''} Found` : `${critCount} Critical Issue${critCount > 1 ? 's' : ''} Found`}
                                </span>
                            </div>
                            {health === 'green' && <div className="text-slate-500 text-[9px] pl-3.5">Firestore usage looks healthy. Keep navigating to track more.</div>}
                            {health !== 'green' && stats.alerts.slice(0, 3).map(a => (
                                <div key={a.id} className={`text-[9px] pl-3.5 mt-0.5 ${a.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>• {a.title}</div>
                            ))}
                            {alertCount > 3 && <button onClick={() => setTab('alerts')} className="text-[9px] text-blue-400 hover:underline pl-3.5 mt-0.5">+ {alertCount - 3} more → Alerts tab</button>}
                        </div>

                        {/* Rates */}
                        <div className="bg-white/5 rounded p-2 space-y-1">
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider mb-1">Session Rates ({fmtDuration(stats.sessionDurationMs)})</div>
                            <div className="flex justify-between"><span className="text-slate-400">Reads / min</span><span className={`font-mono ${mc(UsageTracker.getMetricHealth('reads'), 'text-emerald-400')}`}>{stats.readsPerMin}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Writes / min</span><span className={`font-mono ${mc(UsageTracker.getMetricHealth('writes'), 'text-amber-400')}`}>{stats.writesPerMin}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Cache hit rate</span><span className={`font-mono ${stats.cacheHitRate < 20 && (stats.reads + stats.cacheHits) > 10 ? 'text-amber-400' : 'text-purple-400'}`}>{stats.cacheHitRate}%</span></div>
                        </div>

                        {/* Cost projection */}
                        <div className="bg-white/5 rounded p-2 space-y-1">
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider mb-1">💰 Cost Projection (daily @ 8hr)</div>
                            <div className="flex justify-between"><span className="text-slate-400">Reads</span><span className={`font-mono ${stats.costProjection.readPct > 80 ? 'text-red-400' : stats.costProjection.readPct > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>~{stats.costProjection.dailyReads.toLocaleString()}/day ({stats.costProjection.readPct}% of 50K)</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Writes</span><span className={`font-mono ${stats.costProjection.writePct > 80 ? 'text-red-400' : stats.costProjection.writePct > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>~{stats.costProjection.dailyWrites.toLocaleString()}/day ({stats.costProjection.writePct}% of 20K)</span></div>
                        </div>

                        {/* Network */}
                        <div className="bg-white/5 rounded p-2 space-y-1">
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider mb-1">Network Transfer</div>
                            <div className="flex justify-between"><span className="text-slate-400">Firestore data (est.)</span><span className="text-cyan-400 font-mono">{firestoreNetKB} KB</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">JS + CSS bundle</span><span className="text-cyan-400 font-mono">{stats.bundleSizeKB} KB</span></div>
                        </div>

                        {/* Top recommendations */}
                        {stats.recommendations.length > 0 && (
                            <div className="bg-white/5 rounded p-2 space-y-1">
                                <div className="text-slate-400 text-[9px] uppercase tracking-wider mb-1">💡 Top Recommendations</div>
                                {stats.recommendations.slice(0, 3).map((r, i) => (
                                    <div key={i} className={`text-[9px] ${r.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                                        {r.severity === 'critical' ? '🔴' : '🟡'} {r.title}<br />
                                        <span className="text-slate-500 pl-4">{r.detail}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="text-slate-600 text-[8px] text-center">Copy report with 📋 button → share with AI to analyse</div>
                    </div>
                )}

                {/* ── SCREENS ──────────────────────────────── */}
                {tab === 'screens' && (
                    <div className="space-y-1.5 text-[10px]">
                        {screenEntries.length === 0 ? <div className="text-center text-slate-500 py-4">Navigate around to collect screen data.</div> : screenEntries.map(([name, sc]) => {
                            const sh = UsageTracker.getScreenHealth(name);
                            return (
                                <div key={name} className={`rounded p-2 ${sh === 'red' ? 'bg-red-500/10 border border-red-500/20' : sh === 'yellow' ? 'bg-amber-500/10 border border-amber-500/15' : 'bg-white/5'}`}>
                                    <div className="font-bold text-white text-[10px] mb-1 flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${name === stats.currentScreen ? H_DOT[sh] : 'bg-slate-600'}`} />
                                        {name}
                                        {sh !== 'green' && <span className={`text-[8px] ml-auto px-1 rounded ${sh === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{sh === 'red' ? '⚠ ISSUE' : '⚠ WARN'}</span>}
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 text-[9px]">
                                        {[
                                            { v: sc.reads, l: 'R', mk: 'reads' as const, c: 'text-emerald-400' },
                                            { v: sc.writes, l: 'W', mk: 'writes' as const, c: 'text-amber-400' },
                                            { v: sc.deletes, l: 'D', mk: 'deletes' as const, c: 'text-red-400' },
                                            { v: sc.cacheHits, l: 'C', mk: null, c: 'text-purple-400' },
                                            { v: sc.listenerAdds, l: 'L', mk: 'listeners' as const, c: 'text-blue-400' },
                                        ].map(({ v, l, mk, c }) => (
                                            <div key={l} className="text-center">
                                                <div className={`font-mono font-bold ${mk ? mc(UsageTracker.getScreenMetricHealth(name, mk), c) : c}`}>{v}</div>
                                                <div className="text-slate-500">{l}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {stats.alerts.filter(a => a.screen === name).slice(0, 2).map(a => (
                                        <div key={a.id} className={`text-[8px] mt-1 ${a.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>{a.severity === 'critical' ? '🔴' : '🟡'} {a.title}</div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── COLLECTIONS ───────────────────────────── */}
                {tab === 'collections' && (
                    <div className="space-y-1.5 text-[10px]">
                        {collEntries.length === 0 ? <div className="text-center text-slate-500 py-4">No collection data yet.</div> : (
                            <>
                                {collEntries.map(([name, cs]) => {
                                    const ch = UsageTracker.getCollectionHealth(name);
                                    const ops = cs.reads + cs.writes;
                                    const barPct = Math.min(100, ops / maxCollOps * 100);
                                    return (
                                        <div key={name} className={`rounded p-2 ${ch === 'red' ? 'bg-red-500/10 border border-red-500/20' : ch === 'yellow' ? 'bg-amber-500/10 border border-amber-500/15' : 'bg-white/5'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-white text-[10px]">{name}</span>
                                                <span className={`text-[8px] font-mono ${ch === 'red' ? 'text-red-400' : ch === 'yellow' ? 'text-amber-400' : 'text-slate-400'}`}>{ops} ops</span>
                                            </div>
                                            <div className="h-1 bg-white/5 rounded overflow-hidden mb-1">
                                                <div className={`h-full rounded ${ch === 'red' ? 'bg-red-500/60' : ch === 'yellow' ? 'bg-amber-500/60' : 'bg-emerald-500/60'}`} style={{ width: `${barPct}%` }} />
                                            </div>
                                            <div className="grid grid-cols-4 gap-1 text-[9px]">
                                                <div className="text-center"><div className="text-emerald-400 font-mono font-bold">{cs.reads}</div><div className="text-slate-500">R</div></div>
                                                <div className="text-center"><div className="text-amber-400 font-mono font-bold">{cs.writes}</div><div className="text-slate-500">W</div></div>
                                                <div className="text-center"><div className="text-red-400 font-mono font-bold">{cs.deletes}</div><div className="text-slate-500">D</div></div>
                                                <div className="text-center"><div className="text-blue-400 font-mono font-bold">{cs.listenerAdds}</div><div className="text-slate-500">L</div></div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Top document paths */}
                                {stats.topDocPaths.length > 0 && (
                                    <div className="bg-white/5 rounded p-2 mt-2">
                                        <div className="text-slate-400 text-[9px] uppercase tracking-wider mb-1">🔝 Most-Read Documents</div>
                                        {stats.topDocPaths.slice(0, 5).map(({ path, count }) => (
                                            <div key={path} className="flex justify-between text-[9px] py-0.5 border-b border-white/5 last:border-0">
                                                <span className="text-slate-300 truncate mr-2" title={path}>{path}</span>
                                                <span className={`font-mono shrink-0 ${count >= 10 ? 'text-red-400' : count >= 5 ? 'text-amber-400' : 'text-slate-400'}`}>×{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── ALERTS ───────────────────────────────── */}
                {tab === 'alerts' && (
                    <div className="space-y-1.5 text-[10px]">
                        {stats.alerts.length === 0 && stats.recommendations.length === 0 ? (
                            <div className="text-center text-slate-500 py-6"><div className="text-2xl mb-1">✅</div>No alerts — everything looks healthy!</div>
                        ) : (
                            <>
                                {stats.alerts.map(a => (
                                    <div key={a.id} className={`rounded p-2 ${a.severity === 'critical' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-[10px] mt-px">{a.severity === 'critical' ? '🔴' : '🟡'}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold text-[10px] ${a.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>{a.title}</div>
                                                <div className="text-slate-400 text-[9px] mt-0.5">{a.detail}</div>
                                                <div className="text-slate-600 text-[8px] mt-0.5">{new Date(a.timestamp).toLocaleTimeString()}{a.collection && ` · ${a.collection}`}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {stats.recommendations.length > 0 && (
                                    <>
                                        <div className="text-slate-400 text-[9px] uppercase tracking-wider pt-1">💡 Recommendations</div>
                                        {stats.recommendations.map((r, i) => (
                                            <div key={i} className="bg-white/5 rounded p-2">
                                                <div className={`font-bold text-[10px] ${r.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>{r.severity === 'critical' ? '🔴' : '🟡'} {r.title}</div>
                                                <div className="text-slate-400 text-[9px] mt-0.5">{r.detail}</div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── LOGS ─────────────────────────────────── */}
                {tab === 'logs' && (
                    <div className="font-mono text-[9px] space-y-0.5 bg-black/20 rounded p-2">
                        {stats.logs.length > 0 ? stats.logs.map((log, i) => (
                            <div key={i} className="flex justify-between items-start gap-1 border-b border-white/5 pb-0.5 last:border-0">
                                <div className="flex items-center gap-1 min-w-0">
                                    <span className={`font-bold whitespace-nowrap ${log.type.includes('delete') ? 'text-red-400' : log.type.includes('write') ? 'text-amber-400' : log.type.includes('listener') ? 'text-blue-400' : log.type.includes('cache') ? 'text-purple-400' : 'text-emerald-400'}`}>
                                        {log.type === 'read' ? 'READ' : log.type === 'cache_read' ? 'CACHE' : log.type === 'write' ? 'WRITE' : log.type === 'delete' ? 'DEL' : log.type === 'listener_add' ? 'L+' : log.type === 'listener_remove' ? 'L-' : log.type.toUpperCase()}
                                    </span>
                                    {log.collection && <span className="text-slate-400 truncate" title={log.docPath || log.collection}>{log.collection}</span>}
                                    {log.count > 1 && <span className="text-white/60">x{log.count}</span>}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {log.screen && <span className="text-slate-600 text-[8px]">{log.screen}</span>}
                                    <span className="text-slate-600 text-[8px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        )) : <div className="text-center text-slate-500 py-4">No activity yet</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — COMPLETE FIRESTORE INTERCEPTOR (COPY THIS INTO A NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Create a file at: src/services/firestoreInterceptor.ts
// Paste EVERYTHING below between the ── COPY START ── and ── COPY END ── markers.
//
// ⚠ IMPORTANT: Update the UsageTracker import path on line 20 to match
//   where YOU placed FirebaseMonitor.tsx in your project.
//
// ──────────────────────── COPY START ────────────────────────────────────────────
//
// /**
//  * Firestore Interceptor — Automatic tracking of ALL Firestore operations.
//  *
//  * HOW IT WORKS:
//  * Vite/Webpack alias redirects 'firebase/firestore' → this file.
//  * We re-export everything from '@firebase/firestore' (the real SDK),
//  * then override read/write/listener functions with tracked versions.
//  *
//  * In ES modules, named exports override wildcard re-exports,
//  * so our tracked `getDoc` wins over the one from `export *`.
//  *
//  * ZERO changes required in any component or service file.
//  * Dev-only overhead: ~0.01ms per operation (just counter increments).
//  */
//
// // Re-export EVERYTHING from the real SDK (types, helpers, constants, classes)
// export * from '@firebase/firestore';
//
// // Import specific functions we want to intercept
// import {
//     getDoc as _getDoc,
//     getDocs as _getDocs,
//     getDocFromServer as _getDocFromServer,
//     getDocFromCache as _getDocFromCache,
//     getDocsFromServer as _getDocsFromServer,
//     getDocsFromCache as _getDocsFromCache,
//     getCountFromServer as _getCountFromServer,
//     getAggregateFromServer as _getAggregateFromServer,
//     onSnapshot as _onSnapshot,
//     setDoc as _setDoc,
//     updateDoc as _updateDoc,
//     addDoc as _addDoc,
//     deleteDoc as _deleteDoc,
//     writeBatch as _writeBatch,
//     runTransaction as _runTransaction,
// } from '@firebase/firestore';
//
// import type { DocumentReference, Query, Firestore } from '@firebase/firestore';
//
// // ⚠ UPDATE THIS PATH to match where you placed FirebaseMonitor.tsx:
// import { UsageTracker } from '../components/debug/FirebaseMonitor';
//
// // ─── Helpers ────────────────────────────────────────────────────
//
// /** Extract collection name from a DocumentReference, Query, or CollectionReference */
// function getCollName(ref: any): string {
//     try {
//         if (ref?.path) {
//             const parts = ref.path.split('/');
//             if (parts.length <= 2) return parts[0] || '?';
//             return parts.filter((_: string, i: number) => i % 2 === 0).join('/');
//         }
//         if (ref?._query?.path?.segments) {
//             const segs = ref._query.path.segments;
//             return segs.filter((_: string, i: number) => i % 2 === 0).join('/') || '?';
//         }
//     } catch (_) {}
//     return '?';
// }
//
// function getDocPath(ref: any): string | undefined {
//     try { return ref?.path; } catch (_) { return undefined; }
// }
//
// // ─── READ INTERCEPTORS ──────────────────────────────────────────
//
// export async function getDoc(ref: DocumentReference) {
//     const col = getCollName(ref);
//     const dp = getDocPath(ref);
//     const result = await _getDoc(ref);
//     UsageTracker.trackRead(1, col, result.metadata.fromCache, dp);
//     return result;
// }
//
// export async function getDocFromServer(ref: DocumentReference) {
//     const col = getCollName(ref);
//     const dp = getDocPath(ref);
//     const result = await _getDocFromServer(ref);
//     UsageTracker.trackRead(1, col, false, dp);
//     return result;
// }
//
// export async function getDocFromCache(ref: DocumentReference) {
//     const col = getCollName(ref);
//     const dp = getDocPath(ref);
//     const result = await _getDocFromCache(ref);
//     UsageTracker.trackRead(1, col, true, dp);
//     return result;
// }
//
// export async function getDocs(q: Query) {
//     const col = getCollName(q);
//     const result = await _getDocs(q);
//     UsageTracker.trackRead(result.size || 1, col, result.metadata.fromCache);
//     return result;
// }
//
// export async function getDocsFromServer(q: Query) {
//     const col = getCollName(q);
//     const result = await _getDocsFromServer(q);
//     UsageTracker.trackRead(result.size || 1, col, false);
//     return result;
// }
//
// export async function getDocsFromCache(q: Query) {
//     const col = getCollName(q);
//     const result = await _getDocsFromCache(q);
//     UsageTracker.trackRead(result.size || 1, col, true);
//     return result;
// }
//
// export async function getCountFromServer(q: any) {
//     const col = getCollName(q);
//     const result = await _getCountFromServer(q);
//     UsageTracker.trackRead(1, col, false);
//     return result;
// }
//
// export async function getAggregateFromServer(ref: any, spec: any) {
//     const col = getCollName(ref);
//     const result = await _getAggregateFromServer(ref, spec);
//     UsageTracker.trackRead(1, col, false);
//     return result;
// }
//
// // ─── LISTENER INTERCEPTOR ───────────────────────────────────────
//
// export function onSnapshot(...args: any[]): () => void {
//     const ref = args[0];
//     const col = getCollName(ref);
//     UsageTracker.trackListener(1, col);
//
//     let isFirst = true;
//
//     // Wrap callback(s) to track reads from listener updates
//     const newArgs = args.map((arg, i) => {
//         if (i === 0) return arg;
//
//         // Function callback (most common pattern)
//         if (typeof arg === 'function') {
//             const origCb = arg;
//             return (snapshot: any) => {
//                 if (isFirst) {
//                     const n = snapshot.docs ? snapshot.docs.length : 1;
//                     const cached = snapshot.metadata?.fromCache ?? false;
//                     UsageTracker.trackRead(n || 1, col, cached);
//                     isFirst = false;
//                 } else {
//                     // Subsequent: count only server-side changes
//                     if (snapshot.docChanges) {
//                         const changes = typeof snapshot.docChanges === 'function'
//                             ? snapshot.docChanges() : snapshot.docChanges;
//                         const serverChanges = changes.filter((c: any) =>
//                             c.type !== 'metadata' && !c.doc?.metadata?.fromCache);
//                         if (serverChanges.length > 0) {
//                             UsageTracker.trackRead(serverChanges.length, col, false);
//                         }
//                     } else {
//                         // Single doc listener
//                         const cached = snapshot.metadata?.fromCache ?? false;
//                         if (!cached) UsageTracker.trackRead(1, col, false);
//                     }
//                 }
//                 origCb(snapshot);
//             };
//         }
//
//         // Observer object pattern: { next: fn, error: fn }
//         if (typeof arg === 'object' && arg !== null && typeof arg.next === 'function') {
//             const origNext = arg.next;
//             return {
//                 ...arg,
//                 next: (snapshot: any) => {
//                     if (isFirst) {
//                         const n = snapshot.docs ? snapshot.docs.length : 1;
//                         const cached = snapshot.metadata?.fromCache ?? false;
//                         UsageTracker.trackRead(n || 1, col, cached);
//                         isFirst = false;
//                     } else {
//                         if (snapshot.docChanges) {
//                             const changes = typeof snapshot.docChanges === 'function'
//                                 ? snapshot.docChanges() : snapshot.docChanges;
//                             const serverChanges = changes.filter((c: any) =>
//                                 c.type !== 'metadata' && !c.doc?.metadata?.fromCache);
//                             if (serverChanges.length > 0) {
//                                 UsageTracker.trackRead(serverChanges.length, col, false);
//                             }
//                         } else {
//                             const cached = snapshot.metadata?.fromCache ?? false;
//                             if (!cached) UsageTracker.trackRead(1, col, false);
//                         }
//                     }
//                     origNext(snapshot);
//                 }
//             };
//         }
//
//         return arg;
//     });
//
//     const unsubscribe = (_onSnapshot as any)(...newArgs);
//
//     return () => {
//         UsageTracker.trackListener(-1, col);
//         unsubscribe();
//     };
// }
//
// // ─── WRITE INTERCEPTORS ─────────────────────────────────────────
//
// export async function setDoc(...args: any[]) {
//     const col = getCollName(args[0]);
//     const dp = getDocPath(args[0]);
//     const result = await (_setDoc as any)(...args);
//     UsageTracker.trackWrite(1, col, dp);
//     return result;
// }
//
// export async function updateDoc(...args: any[]) {
//     const col = getCollName(args[0]);
//     const dp = getDocPath(args[0]);
//     const result = await (_updateDoc as any)(...args);
//     UsageTracker.trackWrite(1, col, dp);
//     return result;
// }
//
// export async function addDoc(...args: any[]) {
//     const col = getCollName(args[0]);
//     const result = await (_addDoc as any)(...args);
//     UsageTracker.trackWrite(1, col);
//     return result;
// }
//
// export async function deleteDoc(...args: any[]) {
//     const col = getCollName(args[0]);
//     const dp = getDocPath(args[0]);
//     const result = await (_deleteDoc as any)(...args);
//     UsageTracker.trackDelete(1, col, dp);
//     return result;
// }
//
// // ─── BATCH INTERCEPTOR ──────────────────────────────────────────
//
// export function writeBatch(db: Firestore) {
//     const batch = _writeBatch(db);
//     let setCount = 0, updateCount = 0, deleteCount = 0;
//     let lastCol = 'batch';
//
//     const origSet = batch.set.bind(batch);
//     const origUpdate = batch.update.bind(batch);
//     const origDelete = batch.delete.bind(batch);
//     const origCommit = batch.commit.bind(batch);
//
//     batch.set = (...a: any[]) => { setCount++; lastCol = getCollName(a[0]); return (origSet as any)(...a); };
//     batch.update = (...a: any[]) => { updateCount++; lastCol = getCollName(a[0]); return (origUpdate as any)(...a); };
//     batch.delete = (...a: any[]) => { deleteCount++; lastCol = getCollName(a[0]); return (origDelete as any)(...a); };
//     batch.commit = async () => {
//         const result = await origCommit();
//         if (setCount > 0) UsageTracker.trackWrite(setCount, lastCol);
//         if (updateCount > 0) UsageTracker.trackWrite(updateCount, lastCol);
//         if (deleteCount > 0) UsageTracker.trackDelete(deleteCount, lastCol);
//         return result;
//     };
//
//     return batch;
// }
//
// // ─── TRANSACTION INTERCEPTOR ────────────────────────────────────
//
// export async function runTransaction(db: Firestore, fn: any, options?: any) {
//     const result = await _runTransaction(db, fn, options);
//     UsageTracker.trackWrite(1, 'transaction');
//     return result;
// }
//
// ──────────────────────── COPY END ──────────────────────────────────────────────
//
// AFTER CREATING THE INTERCEPTOR:
// 1. Add the bundler alias (see Step 3 in the header comment at the top)
// 2. Restart your dev server
// 3. The monitor should now track all Firestore operations automatically
//
// QUICK VERIFICATION:
// Open your app in the browser → the floating pill should appear bottom-left.
// Navigate to a page that reads Firestore data → the Read count should increase.
// If it stays at 0, the alias isn't working. See Troubleshooting section above.
//
// ═══════════════════════════════════════════════════════════════════════════════

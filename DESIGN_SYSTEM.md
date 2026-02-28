# FinancialPlan — Design System Knowledge Base

Inspired by [aiverse.design](https://aiverse.design). Warm cream aesthetic, serif display headings, pill buttons, clean warm surfaces.

---

## Tech Stack

- **React + TypeScript + Vite**
- **Tailwind CSS** + custom **CSS variables** (dual system)
- **Font**: `Lora` (Google Fonts, fallback for Louize) for headings; `ui-sans-serif, system-ui` for body
- Dark mode via `.dark` class on `<html>`

---

## File Map

| File | Role |
|---|---|
| `src/styles/theme.css` | Master CSS variable definitions + all global overrides |
| `src/styles/globals.css` | Named CSS utility classes (`.card`, `.btn-primary`, `.input-field`, etc.) |
| `src/index.css` | Tailwind base + HSL tokens for shadcn-style system + Google Font import |
| `src/hooks/useThemeClasses.ts` | React hook — returns all theme class strings for JSX use |
| `src/components/common/Button.tsx` | Button component — all variants use CSS vars |
| `src/components/common/Modal.tsx` | Modal — uses `theme.bgElevated`, `theme.border` |
| `src/components/Layout.tsx` | Header + sidebar — use `theme.bgPrimary` (NOT elevated) |
| `tailwind.config.js` | Registers `font-serif` / `font-sans` stacks |

---

## CSS Variables

### Light Theme (`:root`)

```css
/* Backgrounds */
--color-bg-primary:   #FAF6F1   /* page */
--color-bg-secondary: #f2ebe5   /* subtle surfaces */
--color-bg-tertiary:  #e8ddd5   /* pill buttons resting, tab rails */
--color-bg-elevated:  #f2ebe5   /* dropdowns, tooltips */
--color-bg-overlay:   rgba(28,25,22,0.45)

/* Cards (separate from bg-elevated so dark mode can differ) */
--color-card-bg:      #ffffff
--color-card-border:  #f6f4f2

/* Text */
--color-text-primary:   #1C1916   /* headings, body */
--color-text-secondary: #6B5E54   /* labels, captions */
--color-text-tertiary:  #9A8F86   /* placeholders, inactive nav */
--color-text-muted:     #B0A49C   /* disabled, hints */
--color-text-inverse:   #FAF6F1   /* text on dark buttons */

/* Borders */
--color-border-primary:   #E2D9CF
--color-border-secondary: #D4C9BE
--color-border-focus:     #1C1916

/* Accent */
--color-accent-primary: #1C1916   /* CTA button bg */
--color-accent-hover:   #3D342A
--color-accent-light:   rgba(28,25,22,0.07)  /* focus ring */

/* Highlight */
--color-highlight: #E07A5F   /* terracotta — icons, brand mark */
```

### Dark Theme (`.dark`)

```css
--color-bg-primary:   #1C1916
--color-bg-secondary: #252119
--color-bg-tertiary:  #2E2920
--color-bg-elevated:  #252119

--color-card-bg:      #2A2520
--color-card-border:  #3D342A

--color-text-primary:   #F2EDE8
--color-text-secondary: #D4C9BE
--color-text-tertiary:  #A89E96
--color-text-muted:     #7A6E66
--color-text-inverse:   #1C1916

--color-border-primary:   #3D342A
--color-border-secondary: #4D4238
--color-border-focus:     #C4B09A

--color-accent-primary: #EDE4DA
--color-accent-hover:   #F2EDE8
```

---

## Component Classes

### `.card` and `.metric-card` (globals.css)
```css
background-color: var(--color-card-bg);   /* #fff light / #2A2520 dark */
border: 1px solid var(--color-card-border); /* #f6f4f2 light / #3D342A dark */
border-radius: 1rem (rounded-2xl);
```
> ⚠️ Do NOT use `--color-bg-elevated` for cards — it's the same as the page bg in light mode, making cards invisible. Use `--color-card-bg`.

### Button Variants (Button.tsx)

| Variant | Rest bg | Border | Hover bg |
|---|---|---|---|
| `primary` | `--color-accent-primary` | none | `--color-accent-hover` |
| `secondary` | `--color-bg-tertiary` | `--color-border-primary` | `--color-border-primary` |
| `tertiary` | `--color-bg-tertiary` | none | `--color-border-primary` |
| `ghost` | transparent | none | `--color-bg-tertiary` |
| `danger` | `red-600` | none | `red-700` |

> All non-primary buttons rest at `--color-bg-tertiary` (`#e8ddd5`) — visible warm beige as seen in screenshot pill buttons.

### `.input-field` (globals.css)
```css
background-color: var(--color-bg-primary);
border: 1px solid var(--color-border-primary);
border-radius: 0.75rem (rounded-xl);
```

### `.btn-primary` / `.btn-secondary` (globals.css)
```css
border-radius: 9999px (rounded-full);  /* pill shape */
```

---

## Global Tailwind Overrides (theme.css)

These remap Tailwind utility classes globally so no individual component needs touching:

### Background overrides
```
bg-white, bg-gray-50  → var(--color-bg-elevated)   /* modals, dropdowns */
bg-gray-100           → var(--color-bg-tertiary)    /* pill rails, chips */
bg-gray-200           → var(--color-border-primary) /* active tabs */
hover:bg-gray-50/100  → var(--color-bg-tertiary)
hover:bg-gray-200     → var(--color-border-primary)
.keep-white           → #FFFFFF !important  /* toggle knobs only */
```

### Dark mode bg overrides
```
.dark:bg-gray-800/700/900 → var(--color-bg-elevated)
.dark:bg-gray-600         → var(--color-bg-tertiary)
.dark:hover:bg-gray-700/8 → var(--color-bg-tertiary)
```

### Text overrides (warm hues, not cool grays)
```
text-gray-900  → var(--color-text-primary)    #1C1916
text-gray-700/6 → var(--color-text-secondary) #6B5E54
text-gray-500  → var(--color-text-tertiary)   #9A8F86
text-gray-400  → var(--color-text-muted)      #B0A49C
text-gray-300  → #C8BDB6
```

### Dark mode text overrides
```
.dark:text-white/gray-100 → var(--color-text-primary)
.dark:text-gray-300       → var(--color-text-secondary)
.dark:text-gray-400       → var(--color-text-tertiary)
.dark:text-gray-500       → var(--color-text-muted)
```

### Placeholder
```css
input::placeholder, textarea::placeholder → var(--color-text-muted) warm taupe
```

---

## Typography

```css
/* Headings — serif display */
font-family: 'Louize', 'Lora', Georgia, ui-serif, serif;
/* Lora loaded from Google Fonts in index.css */

/* Body / UI — system sans */
font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
```

In `tailwind.config.js`:
```js
fontFamily: {
  serif: ['Louize', 'Lora', 'Georgia', 'ui-serif', 'serif'],
  sans:  ['ui-sans-serif', 'system-ui', ...]
}
```

In JSX use `font-serif` class for h1/h2. The `useThemeClasses` hook exposes:
```ts
heading1: 'text-3xl font-bold theme-text-primary font-serif'
heading2: 'text-2xl font-semibold theme-text-primary font-serif'
```

---

## Layout Rules

- **Header** (`Layout.tsx`): `theme.bgPrimary` — same as page, NOT elevated
- **Sidebar** (`Layout.tsx`): `theme.bgPrimary` — same as page, NOT elevated
- **Cards**: `--color-card-bg` (white in light) — visibly elevated above page
- **Modals/Dropdowns**: `theme.bgElevated` → `--color-bg-elevated`

---

## Transactions Page Layout

The page uses a **fixed viewport height** layout so only the table scrolls:

```
<div h-[100dvh] flex flex-col>          ← outer: full viewport, no scroll
  <div> top header bar </div>           ← shrink-0
  <div flex-1 overflow-hidden flex flex-col>
    <div flex-1 flex flex-col>
      summary tab: overflow-y-auto      ← summary tab scrolls internally
      transactions tab: flex flex-col
        search bar (shrink-0)
        count bar  (shrink-0)
        <div card overflow-auto flex-1 min-h-0>  ← ONLY THIS SCROLLS
          <TransactionTable />
          Load More button (shrink-0)
        </div>
    </div>
  </div>
</div>
```

### Table header sticky
- `<thead className="sticky top-0 z-10 ...">` in `TransactionTable.tsx`
- The card container uses `overflow-auto` (not the inner table wrapper) — single scroll context required for sticky to work
- Inner `<div>` inside `TransactionTable.tsx` does NOT have `overflow-x-auto` — scroll is owned by the card

### Load More button
- Already exists via `hasMoreTransactions` / `loadMoreTransactions` / `isLoadingMoreTransactions` from `DataContext`
- Styled: `rounded-full theme-bg-secondary theme-text-primary border`

---

## What Was Removed

- **XIRR / Annualized Return** from `Assets.tsx` — removed: import, `portfolioXIRR`, `selectedAssetXIRR`, metric card, performance table column, side panel field, Benchmark Comparison section

---

## Rules for Future Changes

1. **Never use hardcoded gray hex** (`#6B7280`, `#9CA3AF`, etc.) — always use CSS vars
2. **Never use cool-gray Tailwind text classes** expecting them to stay gray — they are globally overridden to warm equivalents
3. **Cards must use `--color-card-bg` / `--color-card-border`**, NOT `--color-bg-elevated`
4. **Toggle knobs** must have `.keep-white` class to stay white (all bg-white overrides are suppressed for them)
5. **Header and sidebar** must stay on `--color-bg-primary`, NOT elevated — they should blend with the page
6. **Buttons** rest at `--color-bg-tertiary`, hover darken to `--color-border-primary`
7. **Primary CTA buttons** are near-black (`--color-accent-primary`) in light mode, near-white in dark mode — always pill shape (`rounded-full`)
8. To add a new surface that needs theming: add vars to both `:root` and `.dark` blocks in `theme.css`

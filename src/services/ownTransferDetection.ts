/**
 * Detects transfers between the user's own accounts in an imported statement, so they
 * aren't counted as income in one account and spending in the other.
 *
 * Two signals:
 *  - the narration references another of the user's accounts, e.g.
 *    "IB FUNDS TRANSFER CR-<account number>-<name>" or "...XX1234"
 *  - an opposite-direction row with the same amount within a day in another account
 *    section of the same statement (paired on amount alone only when both narrations say
 *    "transfer"/"TRF"/"SELF" etc., so two unrelated same-amount payments aren't merged)
 *
 * Nothing is removed - callers only re-label the matches (category 'transfer'), which keeps
 * the transaction and its effect on the account balance.
 */

export interface TransferCandidate {
  description: string;
  amount: number;
  date: string;
  type: string;
  statementSectionId?: string;
}

export interface TransferAccountRef {
  // Section id when the account is part of this statement; undefined for accounts that
  // only exist in the app
  sectionId?: string;
  last4: string;
  // Full account number (digits only) when known
  fullNumber?: string;
}

export interface OwnTransferMatch {
  // Last 4 digits of the other account
  counterpartLast4: string;
  // Index of the opposite row in the same statement, when one was found
  pairIndex?: number;
  reason: 'narration' | 'pair';
}

// Payment rails that can carry an account number in the narration
const TRANSFER_KEYWORDS = /\b(?:FUNDS?\s*TRANSFER|TRANSFER|TRF|TFR|FT|IB|NEFT|IMPS|RTGS|SELF|OWN\s*A\/?C|SWEEP)\b/i;
// Wording that suggests moving money between your own accounts (NEFT/IMPS alone don't -
// they're used to pay other people too)
const OWN_TRANSFER_KEYWORDS = /\b(?:FUNDS?\s*TRANSFER|TRANSFER|TRF|TFR|FT|IB|SELF|OWN\s*A\/?C|SWEEP)\b/i;

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const dayNumber = (date: string): number | null => {
  const time = Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date);
  return Number.isNaN(time) ? null : Math.floor(time / 86400000);
};

/**
 * Does the narration reference this account? Masked forms ("XX1234", "*1234") match on the
 * last 4. A plain run of digits matches the full number when we know it; with only the last 4
 * known it must look like an account number (9-18 digits) in a transfer-like narration.
 */
export const referencesAccount = (description: string, account: TransferAccountRef): boolean => {
  if (!account.last4 || account.last4.length < 4) return false;
  const text = description.toUpperCase();

  const masked = new RegExp(`(?:X{2,}|\\*{2,}|•{2,})\\s?\\d{0,8}${account.last4}(?!\\d)`);
  if (masked.test(text)) return true;

  const runs = text.match(/\d{9,18}/g) || [];
  for (const run of runs) {
    if (account.fullNumber && account.fullNumber.length >= 9) {
      // Statements often zero-pad account numbers in narrations
      if (run === account.fullNumber || run.replace(/^0+/, '') === account.fullNumber.replace(/^0+/, '')) return true;
      continue;
    }
    if (run.endsWith(account.last4) && TRANSFER_KEYWORDS.test(text)) return true;
  }
  return false;
};

export function detectOwnAccountTransfers(
  items: TransferCandidate[],
  accounts: TransferAccountRef[]
): Map<number, OwnTransferMatch> {
  const matches = new Map<number, OwnTransferMatch>();
  const sectionLast4 = new Map<string, string>();
  accounts.forEach(a => { if (a.sectionId) sectionLast4.set(a.sectionId, a.last4); });

  // 1. Narration references another of the user's accounts
  items.forEach((item, index) => {
    if (item.type !== 'income' && item.type !== 'expense') return;
    const ownLast4 = item.statementSectionId ? sectionLast4.get(item.statementSectionId) : undefined;
    const other = accounts.find(a =>
      a.last4 !== ownLast4 &&
      (!a.sectionId || a.sectionId !== item.statementSectionId) &&
      referencesAccount(item.description || '', a)
    );
    if (other) matches.set(index, { counterpartLast4: other.last4, reason: 'narration' });
  });

  // 2. Pair opposite rows across sections: same amount, same day or one day apart
  const used = new Set<number>();
  const order = items.map((_, index) => index)
    // Rows with narration evidence pick their partner first
    .sort((a, b) => Number(matches.has(b)) - Number(matches.has(a)));

  for (const index of order) {
    if (used.has(index)) continue;
    const item = items[index];
    if (!item.statementSectionId || (item.type !== 'income' && item.type !== 'expense')) continue;
    const day = dayNumber(item.date);
    if (day === null) continue;
    const amount = Math.round((Number(item.amount) || 0) * 100);
    if (amount <= 0) continue;
    const own = matches.get(index);

    let best: { index: number; gap: number } | null = null;
    for (let otherIndex = 0; otherIndex < items.length; otherIndex++) {
      const other = items[otherIndex];
      if (otherIndex === index || used.has(otherIndex)) continue;
      if (!other.statementSectionId || other.statementSectionId === item.statementSectionId) continue;
      if (other.type === item.type || (other.type !== 'income' && other.type !== 'expense')) continue;
      if (Math.round((Number(other.amount) || 0) * 100) !== amount) continue;
      const otherDay = dayNumber(other.date);
      if (otherDay === null) continue;
      const gap = Math.abs(otherDay - day);
      if (gap > 1) continue;

      // If either side names an account, it must be the other side's account
      const otherMatch = matches.get(otherIndex);
      const otherLast4 = sectionLast4.get(other.statementSectionId);
      const itemLast4 = sectionLast4.get(item.statementSectionId!);
      if (own && own.counterpartLast4 !== otherLast4) continue;
      if (otherMatch && otherMatch.counterpartLast4 !== itemLast4) continue;
      if (!own && !otherMatch && !(OWN_TRANSFER_KEYWORDS.test(item.description || '') && OWN_TRANSFER_KEYWORDS.test(other.description || ''))) continue;

      if (!best || gap < best.gap) best = { index: otherIndex, gap };
    }

    if (best) {
      const pairIndex = best.index;
      const other = items[pairIndex];
      used.add(index);
      used.add(pairIndex);
      matches.set(index, {
        counterpartLast4: sectionLast4.get(other.statementSectionId!) || '',
        pairIndex,
        reason: own ? 'narration' : 'pair'
      });
      matches.set(pairIndex, {
        counterpartLast4: sectionLast4.get(item.statementSectionId!) || '',
        pairIndex: index,
        reason: matches.get(pairIndex)?.reason || 'pair'
      });
    }
  }

  return matches;
}

export const accountRefFromNumber = (number: string, sectionId?: string): TransferAccountRef => {
  const digits = digitsOnly(number || '');
  // "xx1234" / "XXXX1234" style numbers only tell us the last 4
  const masked = /[^\d\s-]/.test(number || '');
  return {
    sectionId,
    last4: digits.slice(-4),
    fullNumber: !masked && digits.length >= 9 ? digits : undefined
  };
};

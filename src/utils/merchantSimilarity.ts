export const extractMerchant = (description: string) => {
  if (!description) return '';

  const normalized = description
    .toUpperCase()
    .replace(/^UPI[-\s/:]*/i, '')
    .replace(/\b[A-Z]*\d{4,}[A-Z0-9]*\b/g, ' ')
    .replace(/[-_/.:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || description;
};

export const normalizeMerchant = (text: string) => {
  if (!text) return '';

  return text
    .toLowerCase()
    .replace(/\b[a-z]*\d{4,}[a-z0-9]*\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1)
    .join(' ')
    .trim();
};

export const getMerchantKeyFromDescription = (description: string) => {
  return normalizeMerchant(extractMerchant(description || ''));
};

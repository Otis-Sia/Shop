export const CURRENCY_CONFIG = {
  symbol: "Ksh",
  code: "KES",
  locale: "en-KE",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: "currency",
    currency: CURRENCY_CONFIG.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace(CURRENCY_CONFIG.code, CURRENCY_CONFIG.symbol);
}

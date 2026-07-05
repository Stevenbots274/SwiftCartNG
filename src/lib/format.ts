export function ngn(kobo: number | null | undefined): string {
  const value = (kobo ?? 0) / 100;
  return "₦" + value.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

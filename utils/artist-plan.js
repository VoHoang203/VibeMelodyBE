// utils/artist-plan.js
export function planFromAmount(amount) {
  // VND
  if (amount >= 360000) return { plan: "artist_6m", months: 6 };
  if (amount >= 180000) return { plan: "artist_3m", months: 3 };
  return { plan: "artist_1m", months: 1 };
}

export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

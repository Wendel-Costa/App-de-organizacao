export function formatWholeNumber(value: number): string {
  return Math.round(Number.isFinite(value) ? value : 0).toString();
}

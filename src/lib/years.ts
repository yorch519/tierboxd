export function getYearOptions(
  maxYear: number = new Date().getFullYear() + 1,
  minYear = 1888
): number[] {
  const top = Math.max(maxYear, minYear);
  return Array.from({ length: top - minYear + 1 }, (_, index) => top - index);
}

import { useApp } from '../state/store';

const HINDI = '٠١٢٣٤٥٦٧٨٩';

/** Formats a number with the numerals chosen in the parents' corner (default ١٢٣ like the textbooks). */
export function fmt(n: number | string, numerals: 'hindi' | 'latin'): string {
  const s = String(n);
  return numerals === 'latin' ? s : s.replace(/[0-9]/g, d => HINDI[+d]);
}

export function useNum() {
  const numerals = useApp(s => s.numerals);
  return (n: number | string) => fmt(n, numerals);
}

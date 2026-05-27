export const ARABIC_NORMALIZE_RULES: [RegExp, string][] = [
  [/\s+/g, ' '],
  [/[أإآٱء]/g, 'ا'],
  [/ة/g, 'ه'],
  [/[ىي]/g, 'ي'],
  [/[ؤئ]/g, 'ء'],
  [/[\u064B-\u065F\u0670]/g, ''],
  [/[\u0640]/g, ''],
  [/^\s+|\s+$/g, ''],
];

export function normalizeArabic(text: string): string {
  let result = text.trim().toLowerCase();
  for (const [pattern, replacement] of ARABIC_NORMALIZE_RULES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function fuzzyMatchArabic(searchTerm: string, target: string): number {
  const normalizedSearch = normalizeArabic(searchTerm);
  const normalizedTarget = normalizeArabic(target);

  if (normalizedTarget === normalizedSearch) return 1;
  if (normalizedTarget.includes(normalizedSearch)) return 0.9;
  if (normalizedSearch.includes(normalizedTarget)) return 0.85;

  const searchWords = normalizedSearch.split(' ');
  const targetWords = normalizedTarget.split(' ');

  let matchCount = 0;
  for (const sw of searchWords) {
    if (sw.length < 2) continue;
    for (const tw of targetWords) {
      if (tw.includes(sw) || sw.includes(tw)) {
        matchCount++;
        break;
      }
    }
  }

  if (matchCount > 0 && searchWords.length > 0) {
    return (matchCount / searchWords.length) * 0.7;
  }

  return 0;
}

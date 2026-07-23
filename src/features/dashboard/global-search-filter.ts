import { defaultFilter } from "cmdk";

export const GLOBAL_SEARCH_SCORE_THRESHOLD = 0.2;

export function filterGlobalSearchResult(
  _value: string,
  search: string,
  keywords: string[] = []
) {
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return 1;
  }

  const bestFieldScore = Math.max(
    0,
    ...keywords.map((keyword) => defaultFilter(keyword, normalizedSearch))
  );

  return bestFieldScore >= GLOBAL_SEARCH_SCORE_THRESHOLD ? bestFieldScore : 0;
}

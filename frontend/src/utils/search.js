/**
 * Flexible search utility for finding content even with partial/fuzzy matches.
 * Matches across multiple fields and handles typos gracefully.
 */

/**
 * Score how well a value matches the search term.
 * Higher score = better match.
 */
function scoreMatch(text, needle) {
  if (!text || !needle) return 0
  const lower = String(text).toLowerCase()
  const needleLower = needle.toLowerCase()

  // Exact match or contains match - highest priority
  if (lower === needleLower) return 100
  if (lower.includes(needleLower)) return 90

  // Word-start match (e.g., searching "react" matches "React Native")
  const words = lower.split(/\s+/)
  if (words.some(w => w.startsWith(needleLower))) return 80

  // Partial word match at start
  if (lower.startsWith(needleLower)) return 70

  // Check if all characters of needle appear in order (loose match)
  let needleIdx = 0
  for (let i = 0; i < lower.length && needleIdx < needleLower.length; i++) {
    if (lower[i] === needleLower[needleIdx]) {
      needleIdx++
    }
  }
  if (needleIdx === needleLower.length) return 50

  return 0
}

/**
 * Check if an item matches the search query across multiple fields.
 * Returns a score indicating match quality.
 */
export function getSearchScore(item, needle, fields = []) {
  if (!needle) return Infinity // No search = all items match equally

  let maxScore = 0
  fields.forEach(field => {
    const value = typeof item === 'object' ? item[field] : item
    const score = scoreMatch(value, needle)
    maxScore = Math.max(maxScore, score)
  })

  return maxScore
}

/**
 * Filter and sort items by search relevance.
 * Returns items that match, sorted by best match first.
 */
export function searchAndSort(items, needle, searchFields = []) {
  if (!needle || !needle.trim()) return items

  const scored = items
    .map(item => ({
      item,
      score: getSearchScore(item, needle, searchFields),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.map(({ item }) => item)
}

/**
 * Simple wrapper for custom search logic.
 * Check if item matches across any of the provided fields.
 */
export function matchesSearch(item, needle, fieldNames = []) {
  if (!needle) return true
  return getSearchScore(item, needle, fieldNames) > 0
}

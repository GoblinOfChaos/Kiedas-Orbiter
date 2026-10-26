// A record count that drops sharply usually means a broken download. It only means that when the
// file's content changed: the same bytes counted by a different rule (the 2026-10-14 record stored
// 46 for ExportSortieRewards, the current counter reads the same file as 17) are not a collapse.
export function isCollapsed({ previousCount, previousSha256, count, sha256, ratio }) {
  if (!previousCount) return false
  if (previousSha256 && previousSha256 === sha256) return false
  return count < previousCount * ratio
}

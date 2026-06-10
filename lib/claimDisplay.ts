export function formatClaimLeaderDisplay(leaderDisplay: string | null): string {
  const trimmed = leaderDisplay?.trim()
  if (!trimmed) return '—'
  return Array.from(trimmed).length > 4 ? '？' : trimmed
}

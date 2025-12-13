const LS_VOTER = 'mawards.voter_token'

export function getOrCreateVoterToken() {
  const existing = localStorage.getItem(LS_VOTER)
  if (existing) return existing
  const next = crypto.randomUUID()
  localStorage.setItem(LS_VOTER, next)
  return next
}

import { requireUserFromToken, toSessionResponse, type SessionResponse } from '../utils/auth'

/**
 * Returns active session details for a valid access token.
 */
export default defineEventHandler(async (event): Promise<SessionResponse> => {
  const { claims, user } = await requireUserFromToken(event)
  return toSessionResponse(claims, user)
})

import { createError, getQuery } from 'h3'
import { revokeToken } from '../../utils/token'

interface LogoutResponse {
  message: string
}

/**
 * Logs out the current user session for GET-based logout requests.
 */
export default defineEventHandler(async (event): Promise<LogoutResponse> => {
  const query = getQuery(event)

  if (typeof query.provider !== 'string' || query.provider.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'provider is required' })
  }

  if (typeof query.id_token_hint === 'string' && query.id_token_hint.length > 0) {
    revokeToken(query.id_token_hint)
  }

  return { message: 'Logged out' }
})

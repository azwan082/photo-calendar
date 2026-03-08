import { createError, readBody } from 'h3'
import type { MessageResponse } from '../../types/api'
import { revokeToken } from '../../utils/token'

interface LogoutBody {
  provider?: string
  id_token_hint?: string
}

/**
 * Logs out the current user session for POST-based logout requests.
 */
export default defineEventHandler(async (event): Promise<MessageResponse> => {
  const body = await readBody<LogoutBody>(event)

  if (!body?.provider || typeof body.provider !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'provider is required' })
  }

  if (typeof body.id_token_hint === 'string' && body.id_token_hint.length > 0) {
    revokeToken(body.id_token_hint)
  }

  return { message: 'Logged out' }
})

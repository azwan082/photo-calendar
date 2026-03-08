import { createError, getQuery, readBody } from 'h3'
import type { MessageResponse } from '../../types/api'
import { revokeToken } from '../../utils/token'

interface RevokeBody {
  token?: string
  provider?: string
}

/**
 * Revokes a token provided through query or request body.
 */
export default defineEventHandler(async (event): Promise<MessageResponse> => {
  const query = getQuery(event)
  let body: RevokeBody = {}

  try {
    body = await readBody<RevokeBody>(event)
  } catch {
    body = {}
  }

  const token =
    (typeof query.token === 'string' && query.token) ||
    (typeof body.token === 'string' && body.token) ||
    ''

  const provider =
    (typeof query.provider === 'string' && query.provider) ||
    (typeof body.provider === 'string' && body.provider) ||
    null

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'token is required' })
  }

  const revoked = revokeToken(token)
  if (!revoked) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  if (provider && typeof provider !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  return { message: 'Token revoked' }
})

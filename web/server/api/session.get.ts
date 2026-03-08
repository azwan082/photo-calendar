import { createError, getQuery } from 'h3'
import type { DataResponse, SessionDto } from '../types/api'
import { requireUserFromToken, toSessionResponse } from '../utils/auth'

/**
 * Returns active session details for a valid access token.
 */
export default defineEventHandler(async (event): Promise<DataResponse<SessionDto>> => {
  const { claims, user } = await requireUserFromToken(event)
  const query = getQuery(event)

  if (typeof query.provider === 'string' && query.provider.length > 0 && query.provider !== claims.provider) {
    throw createError({ statusCode: 401, statusMessage: 'no active session' })
  }

  return {
    message: '',
    data: toSessionResponse(claims, user)
  }
})

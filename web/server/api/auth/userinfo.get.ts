import { createError, getQuery } from 'h3'
import type { DataResponse, UserInfoDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'

/**
 * Returns profile claims for the user represented by the bearer token.
 */
export default defineEventHandler(async (event): Promise<DataResponse<UserInfoDto>> => {
  const { claims, user } = await requireUserFromToken(event)
  const query = getQuery(event)

  if (typeof query.provider === 'string' && query.provider.length > 0 && query.provider !== claims.provider) {
    throw createError({ statusCode: 401, statusMessage: 'invalid/expired token' })
  }

  return {
    message: '',
    data: {
      sub: String(user.id),
      name: user.username,
      email: user.email,
      roles: user.isSuperadmin ? ['admin', 'user'] : ['user']
    }
  }
})

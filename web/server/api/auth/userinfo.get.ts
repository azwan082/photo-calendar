import { createError, getQuery } from 'h3'
import { requireUserFromToken } from '../../utils/auth'

interface UserInfoResponse {
  sub: string
  name: string
  email: string
  roles: string[]
}

/**
 * Returns profile claims for the user represented by the bearer token.
 */
export default defineEventHandler(async (event): Promise<UserInfoResponse> => {
  const { claims, user } = await requireUserFromToken(event)
  const query = getQuery(event)

  if (typeof query.provider === 'string' && query.provider.length > 0 && query.provider !== claims.provider) {
    throw createError({ statusCode: 401, statusMessage: 'invalid/expired token' })
  }

  return {
    sub: String(user.id),
    name: user.displayName,
    email: user.email,
    roles: user.isSuperadmin ? ['admin', 'user'] : ['user']
  }
})

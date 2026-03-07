import { createError, readBody } from 'h3'
import { verifyToken } from '../../utils/token'

interface ValidateBody {
  token?: string
  provider?: string
}

interface ValidateResponse {
  valid: true
  claims: {
    sub: string
    exp: number
    provider: string
    roles: string[]
    account_id: number
    type: string
  }
}

/**
 * Validates an arbitrary token and returns selected claims when valid.
 */
export default defineEventHandler(async (event): Promise<ValidateResponse> => {
  const body = await readBody<ValidateBody>(event)

  if (!body?.token || typeof body.token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'token is required' })
  }

  const claims = verifyToken(body.token)
  if (!claims) {
    throw createError({ statusCode: 401, statusMessage: 'invalid token' })
  }

  if (typeof body.provider === 'string' && body.provider.length > 0 && body.provider !== claims.provider) {
    throw createError({ statusCode: 401, statusMessage: 'invalid token' })
  }

  return {
    valid: true,
    claims: {
      sub: claims.sub,
      exp: claims.exp,
      provider: claims.provider,
      roles: claims.roles,
      account_id: claims.account_id,
      type: claims.type
    }
  }
})

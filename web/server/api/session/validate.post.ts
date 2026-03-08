import { createError, readBody } from 'h3'
import type { DataResponse, ValidateResultDto } from '../../types/api'
import { verifyToken } from '../../utils/token'

interface ValidateBody {
  token?: string
  provider?: string
}

/**
 * Validates an arbitrary token and returns selected claims when valid.
 */
export default defineEventHandler(async (event): Promise<DataResponse<ValidateResultDto>> => {
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
    message: '',
    data: {
      valid: true,
      claims
    }
  }
})

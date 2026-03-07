import { createError, readBody } from 'h3'
import { buildTokenResponseFromAccount, findAccountByProvider } from '../../utils/auth'
import { verifyToken } from '../../utils/token'

interface RefreshBody {
  provider?: string
  refresh_token?: string
}

interface RefreshResponse {
  access_token: string
  expires_in: number
}

/**
 * Issues a new access token by validating a refresh token.
 */
export default defineEventHandler(async (event): Promise<RefreshResponse> => {
  const body = await readBody<RefreshBody>(event)

  if (!body?.provider || typeof body.provider !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'provider is required' })
  }

  if (!body.refresh_token || typeof body.refresh_token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'refresh_token is required' })
  }

  const refreshClaims = verifyToken(body.refresh_token, 'refresh')
  if (!refreshClaims || refreshClaims.provider !== body.provider) {
    throw createError({ statusCode: 401, statusMessage: 'invalid/expired refresh token' })
  }

  const account = await findAccountByProvider(body.provider, String(refreshClaims.account_id))
  const tokens = buildTokenResponseFromAccount(account)

  return {
    access_token: tokens.access_token,
    expires_in: tokens.expires_in
  }
})

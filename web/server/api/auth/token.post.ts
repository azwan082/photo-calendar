import { createError, readBody } from 'h3'
import {
  buildTokenResponseFromAccount,
  findAccountByProvider
} from '../../utils/auth'
import { verifyToken, type TokenResponse } from '../../utils/token'

interface TokenBody {
  provider?: string
  grant_type?: string
  code?: string
  refresh_token?: string
}

/**
 * Exchanges either an authorization code or refresh token for a new token set.
 */
export default defineEventHandler(async (event): Promise<TokenResponse> => {
  const body = await readBody<TokenBody>(event)

  if (!body?.provider || typeof body.provider !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'provider is required' })
  }

  if (body.grant_type !== 'authorization_code' && body.grant_type !== 'refresh_token') {
    throw createError({ statusCode: 400, statusMessage: 'invalid grant_type' })
  }

  if (body.grant_type === 'authorization_code') {
    if (!body.code || typeof body.code !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'code is required for authorization_code' })
    }

    const account = await findAccountByProvider(body.provider, body.code)
    return buildTokenResponseFromAccount(account)
  }

  if (!body.refresh_token || typeof body.refresh_token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'refresh_token is required for refresh_token grant' })
  }

  const refreshClaims = verifyToken(body.refresh_token, 'refresh')
  if (!refreshClaims || refreshClaims.provider !== body.provider) {
    throw createError({ statusCode: 401, statusMessage: 'invalid token' })
  }

  const account = await findAccountByProvider(body.provider, String(refreshClaims.account_id))
  return buildTokenResponseFromAccount(account)
})

import { createError, getQuery } from 'h3'
import type { DataResponse } from '../../types/api'
import { buildTokenResponseFromAccount, findAccountByProvider } from '../../utils/auth'
import type { TokenResponse } from '../../utils/token'

/**
 * Handles the OAuth callback and exchanges callback inputs for local tokens.
 */
export default defineEventHandler(async (event): Promise<DataResponse<TokenResponse>> => {
  const query = getQuery(event)

  if (typeof query.provider !== 'string' || query.provider.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'provider is required' })
  }

  if (typeof query.code !== 'string' || query.code.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'code is required' })
  }

  if (typeof query.state !== 'string' || query.state.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'state is required' })
  }

  const account = await findAccountByProvider(query.provider, query.code)
  return {
    message: '',
    data: buildTokenResponseFromAccount(account)
  }
})

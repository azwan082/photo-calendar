import type { H3Event } from 'h3'
import { createError, getHeader, getQuery } from 'h3'
import { SocialAccount, User } from '../database/entities'
import { getDataSource } from './database'
import { createTokenResponse, verifyToken, type TokenClaims, type TokenResponse } from './token'

export interface AccessTokenContext {
  token: string
  claims: TokenClaims
}

export interface UserTokenContext {
  claims: TokenClaims
  user: User
}

export interface SessionResponse {
  user: {
    id: string
    name: string
  }
  expires_at: string
}

/**
 * Validates that a provider value is present and non-empty.
 */
function ensureProvider(provider: unknown): string {
  if (typeof provider !== 'string' || provider.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'provider is required' })
  }

  return provider.trim()
}

/**
 * Extracts the bearer token from the Authorization header.
 */
export function getBearerToken(event: H3Event): string {
  const authorization = getHeader(event, 'authorization')
  if (!authorization) {
    throw createError({ statusCode: 401, statusMessage: 'Authorization header is required' })
  }

  const [scheme, token] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid authorization header format' })
  }

  return token
}

/**
 * Validates an access token and returns both raw token and claims.
 */
export async function requireAccessToken(event: H3Event): Promise<AccessTokenContext> {
  const token = getBearerToken(event)
  const claims = verifyToken(token, 'access')

  if (!claims) {
    throw createError({ statusCode: 401, statusMessage: 'invalid/expired token' })
  }

  return { token, claims }
}

/**
 * Resolves the authenticated user entity from a valid bearer token.
 */
export async function requireUserFromToken(event: H3Event): Promise<UserTokenContext> {
  const { claims } = await requireAccessToken(event)
  const dataSource = await getDataSource()

  const user = await dataSource.getRepository(User).findOne({
    where: { id: Number(claims.sub) }
  })

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'no active session' })
  }

  return { claims, user }
}

/**
 * Finds a social account by provider and optional account selector.
 */
export async function findAccountByProvider(provider: unknown, code?: string): Promise<SocialAccount> {
  const safeProvider = ensureProvider(provider)
  const dataSource = await getDataSource()
  const accountRepository = dataSource.getRepository(SocialAccount)

  let account: SocialAccount | null = null

  if (code) {
    if (/^\d+$/.test(code)) {
      account = await accountRepository.findOne({
        where: { id: Number(code), provider: safeProvider },
        relations: { user: true }
      })
    }

    if (!account) {
      account = await accountRepository.findOne({
        where: { accountId: code, provider: safeProvider },
        relations: { user: true }
      })
    }
  }

  if (!account) {
    account = await accountRepository.findOne({
      where: { provider: safeProvider },
      order: { id: 'ASC' },
      relations: { user: true }
    })
  }

  if (!account) {
    throw createError({ statusCode: 401, statusMessage: 'token exchange failed' })
  }

  return account
}

/**
 * Builds a full token response from a social account and its user.
 */
export function buildTokenResponseFromAccount(account: SocialAccount): TokenResponse {
  return createTokenResponse({
    userId: account.user.id,
    accountId: account.id,
    provider: account.provider,
    name: account.user.displayName,
    email: account.user.email,
    roles: account.user.isSuperadmin ? ['admin', 'user'] : ['user']
  })
}

/**
 * Reads and validates `provider` from request query params.
 */
export function providerFromQuery(event: H3Event): string {
  const query = getQuery(event)
  return ensureProvider(query.provider)
}

/**
 * Maps claims and user entity into the session response contract.
 */
export function toSessionResponse(claims: TokenClaims, user: User): SessionResponse {
  return {
    user: {
      id: String(user.id),
      name: user.displayName
    },
    expires_at: new Date(claims.exp * 1000).toISOString()
  }
}

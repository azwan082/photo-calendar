import { createHmac, randomUUID } from 'node:crypto'

export type TokenKind = 'access' | 'refresh' | 'id'

export interface TokenClaims {
  sub: string
  name: string
  email: string
  roles: string[]
  provider: string
  account_id: number
  type: TokenKind
  iat: number
  exp: number
  jti: string
}

export interface TokenResponse {
  access_token: string
  id_token: string
  refresh_token: string
  expires_in: number
}

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET ?? 'photo-calendar-dev-secret'
const revokedTokenIds = new Set<string>()

/**
 * Encodes plain text into base64url format.
 */
function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

/**
 * Decodes a base64url string into utf-8 text.
 */
function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

/**
 * Creates an HMAC SHA-256 signature for the provided token payload.
 */
function sign(unsignedToken: string): string {
  return createHmac('sha256', TOKEN_SECRET).update(unsignedToken).digest('base64url')
}

/**
 * Issues a signed JWT-like token with generated `iat` and `jti` claims.
 */
export function issueToken(payload: Omit<TokenClaims, 'iat' | 'jti'>): string {
  const now = Math.floor(Date.now() / 1000)
  const claims: TokenClaims = {
    ...payload,
    iat: now,
    jti: randomUUID()
  }

  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = toBase64Url(JSON.stringify(claims))
  const unsignedToken = `${header}.${body}`

  return `${unsignedToken}.${sign(unsignedToken)}`
}

/**
 * Verifies token signature, expiration, revocation status, and optional token kind.
 */
export function verifyToken(token: string, expectedType?: TokenKind): TokenClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  const [header, body, signature] = parts
  const unsignedToken = `${header}.${body}`
  const expectedSignature = sign(unsignedToken)

  if (signature !== expectedSignature) {
    return null
  }

  try {
    const claims = JSON.parse(fromBase64Url(body)) as TokenClaims
    const now = Math.floor(Date.now() / 1000)

    if (revokedTokenIds.has(claims.jti)) {
      return null
    }

    if (expectedType && claims.type !== expectedType) {
      return null
    }

    if (typeof claims.exp !== 'number' || claims.exp <= now) {
      return null
    }

    return claims
  } catch {
    return null
  }
}

/**
 * Marks a token as revoked by storing its token id (`jti`).
 */
export function revokeToken(token: string): boolean {
  const claims = verifyToken(token)
  if (!claims) {
    return false
  }

  revokedTokenIds.add(claims.jti)
  return true
}

/**
 * Creates access, id, and refresh token payloads for API responses.
 */
export function createTokenResponse(input: {
  userId: number
  accountId: number
  provider: string
  name: string
  email: string
  roles: string[]
}): TokenResponse {
  const now = Math.floor(Date.now() / 1000)
  const accessExp = now + 3600

  const accessToken = issueToken({
    sub: String(input.userId),
    name: input.name,
    email: input.email,
    roles: input.roles,
    provider: input.provider,
    account_id: input.accountId,
    type: 'access',
    exp: accessExp
  })

  const idToken = issueToken({
    sub: String(input.userId),
    name: input.name,
    email: input.email,
    roles: input.roles,
    provider: input.provider,
    account_id: input.accountId,
    type: 'id',
    exp: accessExp
  })

  const refreshToken = issueToken({
    sub: String(input.userId),
    name: input.name,
    email: input.email,
    roles: input.roles,
    provider: input.provider,
    account_id: input.accountId,
    type: 'refresh',
    exp: now + 60 * 60 * 24 * 30
  })

  return {
    access_token: accessToken,
    id_token: idToken,
    refresh_token: refreshToken,
    expires_in: 3600
  }
}

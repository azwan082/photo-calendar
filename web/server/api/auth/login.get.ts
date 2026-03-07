import { randomUUID } from 'node:crypto'
import { createError, getQuery, sendRedirect } from 'h3'

/**
 * Starts an OAuth login flow by redirecting to the configured authorization endpoint.
 */
export default defineEventHandler(async (event): Promise<void> => {
  const query = getQuery(event)

  if (typeof query.provider !== 'string' || query.provider.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'provider is required' })
  }

  const redirectUri =
    typeof query.redirect_uri === 'string' && query.redirect_uri.length > 0
      ? query.redirect_uri
      : process.env.AUTH_DEFAULT_REDIRECT_URI ?? 'http://localhost:3000/api/auth/callback'

  const state = randomUUID()
  const authorizationEndpoint = process.env.AUTH_AUTHORIZE_URL ?? 'https://example.com/oauth/authorize'
  const target = new URL(authorizationEndpoint)

  target.searchParams.set('provider', query.provider)
  target.searchParams.set('redirect_uri', redirectUri)
  target.searchParams.set('state', state)

  await sendRedirect(event, target.toString(), 302)
})

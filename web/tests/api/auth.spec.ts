import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import type { FetchError } from 'ofetch'
import { AppSetting, Media, Post, SocialAccount, SyncLog, User } from '~/server/database/entities'
import { createApiServer, createMemoryDataSource, setTestDataSource, testDataSource } from './helpers'
import { seedUserWithAccount } from './fixtures'

vi.mock('~/server/utils/database', () => ({
  getDataSource: () => Promise.resolve(testDataSource)
}))

describe('Auth API', () => {
  let dataSource: DataSource
  let server: Awaited<ReturnType<typeof createApiServer>>

  beforeAll(async () => {
    dataSource = await createMemoryDataSource([User, SocialAccount, Post, Media, SyncLog, AppSetting])
    setTestDataSource(dataSource)

    await seedUserWithAccount(dataSource, {
      provider: 'google',
      accountId: 'auth-code-123',
      displayName: 'Auth User',
      email: 'auth@example.com',
      username: 'auth-user'
    })

    server = await createApiServer()
  })

  afterAll(async () => {
    if (server) {
      await server.close()
    }
    if (dataSource?.isInitialized) {
      await dataSource.destroy()
    }
  })

  it('GET /api/auth/login returns 400 when provider is missing', async () => {
    const error = await server.api('/api/auth/login').catch((err: FetchError) => err)
    expect((error as FetchError).response?.status).toBe(400)
  })

  it('GET /api/auth/login redirects to authorization endpoint', async () => {
    const response = await server.api.raw(
      '/api/auth/login?provider=google&redirect_uri=http://localhost:3000/callback',
      { redirect: 'manual' }
    )

    expect(response.status).toBe(302)

    const location = response.headers.get('location')
    expect(location).toContain('https://example.com/oauth/authorize')
    expect(location).toContain('provider=google')
    expect(location).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback')
    expect(location).toMatch(/state=[a-f0-9-]+/)
  })

  it('GET /api/auth/callback returns 400 for missing callback params', async () => {
    const error = await server.api('/api/auth/callback?provider=google&state=test').catch(
      (err: FetchError) => err
    )

    expect((error as FetchError).response?.status).toBe(400)
  })

  it('GET /api/auth/callback returns token set', async () => {
    const result = await server.api('/api/auth/callback?provider=google&code=auth-code-123&state=ok')

    expect(result.access_token).toBeTypeOf('string')
    expect(result.id_token).toBeTypeOf('string')
    expect(result.refresh_token).toBeTypeOf('string')
    expect(result.expires_in).toBe(3600)
  })

  it('POST /api/auth/token returns 400 for invalid grant_type', async () => {
    const error = await server.api('/api/auth/token', {
      method: 'POST',
      body: { provider: 'google', grant_type: 'invalid' }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(400)
  })

  it('POST /api/auth/token exchanges authorization code', async () => {
    const token = await server.api('/api/auth/token', {
      method: 'POST',
      body: { provider: 'google', grant_type: 'authorization_code', code: 'auth-code-123' }
    })

    expect(token.access_token).toBeTypeOf('string')
    expect(token.refresh_token).toBeTypeOf('string')
  })

  it('POST /api/auth/token refresh grant returns 401 for provider mismatch', async () => {
    const token = await server.api('/api/auth/token', {
      method: 'POST',
      body: { provider: 'google', grant_type: 'authorization_code', code: 'auth-code-123' }
    })

    const error = await server.api('/api/auth/token', {
      method: 'POST',
      body: { provider: 'azuread', grant_type: 'refresh_token', refresh_token: token.refresh_token }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(401)
  })

  it('POST /api/auth/refresh returns access token for valid refresh token', async () => {
    const token = await server.api('/api/auth/token', {
      method: 'POST',
      body: { provider: 'google', grant_type: 'authorization_code', code: 'auth-code-123' }
    })

    const refreshed = await server.api('/api/auth/refresh', {
      method: 'POST',
      body: { provider: 'google', refresh_token: token.refresh_token }
    })

    expect(refreshed.access_token).toBeTypeOf('string')
    expect(refreshed.expires_in).toBe(3600)
  })

  it('GET /api/auth/logout returns 400 when provider is missing', async () => {
    const error = await server.api('/api/auth/logout').catch((err: FetchError) => err)
    expect((error as FetchError).response?.status).toBe(400)
  })

  it('GET /api/auth/logout returns success message', async () => {
    const result = await server.api('/api/auth/logout?provider=google')
    expect(result).toEqual({ message: 'Logged out' })
  })

  it('POST /api/auth/logout returns success message', async () => {
    const result = await server.api('/api/auth/logout', {
      method: 'POST',
      body: { provider: 'google' }
    })

    expect(result).toEqual({ message: 'Logged out' })
  })

  it('GET /api/auth/userinfo requires access token', async () => {
    const error = await server.api('/api/auth/userinfo').catch((err: FetchError) => err)
    expect((error as FetchError).response?.status).toBe(401)
  })

  it('GET /api/auth/userinfo returns user claims', async () => {
    const token = await server.api('/api/auth/token', {
      method: 'POST',
      body: { provider: 'google', grant_type: 'authorization_code', code: 'auth-code-123' }
    })

    const userInfo = await server.api('/api/auth/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    })

    expect(userInfo.email).toBe('auth@example.com')
    expect(userInfo.roles).toEqual(['admin', 'user'])
  })

  it('GET /api/auth/userinfo returns 401 when provider query mismatches token', async () => {
    const token = await server.api('/api/auth/token', {
      method: 'POST',
      body: { provider: 'google', grant_type: 'authorization_code', code: 'auth-code-123' }
    })

    const error = await server.api('/api/auth/userinfo?provider=azuread', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(401)
  })
})

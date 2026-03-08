import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import type { FetchError } from 'ofetch'
import { AppSettingSchema, MediaSchema, PostSchema, SocialAccountSchema, SyncLogSchema, UserSchema } from '~/server/database/entities'
import { createApiServer, createMemoryDataSource, setTestDataSource, testDataSource } from './helpers'
import { seedUserWithAccount } from './fixtures'

vi.mock('~/server/utils/database', () => ({
  getDataSource: () => Promise.resolve(testDataSource)
}))

describe('Session API', () => {
  let dataSource: DataSource
  let server: Awaited<ReturnType<typeof createApiServer>>
  let accessToken: string

  beforeAll(async () => {
    dataSource = await createMemoryDataSource([UserSchema, SocialAccountSchema, PostSchema, MediaSchema, SyncLogSchema, AppSettingSchema])
    setTestDataSource(dataSource)

    const seeded = await seedUserWithAccount(dataSource, {
      provider: 'google',
      accountId: 'session-acct',
      email: 'session@example.com',
      username: 'session-user'
    })

    accessToken = seeded.tokens.access_token
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

  it('GET /api/session returns active session data', async () => {
    const session = await server.api('/api/session', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(session.message).toBe('')
    expect(session.data.user.id).toBeTypeOf('string')
    expect(session.data.user.username).toBe('session-user')
    expect(session.data.user.email).toBe('session@example.com')
    expect(session.data.user.is_superadmin).toBe(true)
    expect(session.data.expires_at).toBeTypeOf('string')
  })

  it('GET /api/session returns 401 without token', async () => {
    const error = await server.api('/api/session').catch((err: FetchError) => err)
    expect((error as FetchError).response?.status).toBe(401)
  })

  it('POST /api/session/validate validates valid token', async () => {
    const result = await server.api('/api/session/validate', {
      method: 'POST',
      body: { token: accessToken }
    })

    expect(result.message).toBe('')
    expect(result.data.valid).toBe(true)
    expect(result.data.claims.sub).toBeTypeOf('string')
    expect(result.data.claims.exp).toBeTypeOf('number')
    expect(result.data.claims.provider).toBe('google')
    expect(result.data.claims.type).toBe('access')
    expect(result.data.claims.jti).toBeTypeOf('string')
  })

  it('POST /api/session/validate returns 401 for invalid token', async () => {
    const error = await server.api('/api/session/validate', {
      method: 'POST',
      body: { token: 'not-a-token' }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(401)
  })

  it('GET /api/session/revoke revokes a valid token', async () => {
    const revokeResult = await server.api(`/api/session/revoke?token=${encodeURIComponent(accessToken)}`)
    expect(revokeResult).toEqual({ message: 'Token revoked' })

    const validateError = await server.api('/api/session/validate', {
      method: 'POST',
      body: { token: accessToken }
    }).catch((err: FetchError) => err)

    expect((validateError as FetchError).response?.status).toBe(401)
  })

  it('GET /api/session/revoke returns 400 when token is missing', async () => {
    const error = await server.api('/api/session/revoke').catch((err: FetchError) => err)
    expect((error as FetchError).response?.status).toBe(400)
  })
})

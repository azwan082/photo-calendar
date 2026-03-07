import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import type { FetchError } from 'ofetch'
import { AppSetting, Media, Post, SocialAccount, SyncLog, User } from '~/server/database/entities'
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
    dataSource = await createMemoryDataSource([User, SocialAccount, Post, Media, SyncLog, AppSetting])
    setTestDataSource(dataSource)

    const seeded = await seedUserWithAccount(dataSource, {
      provider: 'google',
      accountId: 'session-acct',
      displayName: 'Session User',
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

    expect(session.user.id).toBeTypeOf('string')
    expect(session.user.name).toBe('Session User')
    expect(session.expires_at).toBeTypeOf('string')
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

    expect(result.valid).toBe(true)
    expect(result.claims.provider).toBe('google')
    expect(result.claims.type).toBe('access')
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

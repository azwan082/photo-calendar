import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import type { FetchError } from 'ofetch'
import { AppSettingSchema, AuthType, MediaSchema, PostSchema, SocialAccountSchema, SyncLogSchema, UserSchema } from '~/server/database/entities'
import { createApiServer, createMemoryDataSource, setTestDataSource, testDataSource } from './helpers'
import { seedUserWithAccount } from './fixtures'

vi.mock('~/server/utils/database', () => ({
  getDataSource: () => Promise.resolve(testDataSource)
}))

describe('Users API', () => {
  let dataSource: DataSource
  let server: Awaited<ReturnType<typeof createApiServer>>
  let accessToken: string
  let primaryUserId: number

  beforeAll(async () => {
    dataSource = await createMemoryDataSource([UserSchema, SocialAccountSchema, PostSchema, MediaSchema, SyncLogSchema, AppSettingSchema])
    setTestDataSource(dataSource)

    const seeded = await seedUserWithAccount(dataSource, {
      provider: 'google',
      accountId: 'users-acct',
      email: 'users@example.com',
      username: 'users-admin',
      isSuperadmin: true,
      isSyncLocked: false
    })

    accessToken = seeded.tokens.access_token
    primaryUserId = seeded.user.id

    await dataSource.getRepository('user').save(
      dataSource.getRepository('user').create({
        email: 'member@example.com',
        authType: AuthType.SSO,
        username: 'member-user',
        passwordHash: null,
        isSuperadmin: false,
        isSyncLocked: true
      })
    )

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

  it('GET /api/users returns paginated users', async () => {
    const result = await server.api('/api/users?page=1&limit=10&sort_by=id&sort=asc', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
    expect(result.total).toBe(2)
    expect(result.users[0].id).toBe(primaryUserId)
  })

  it('GET /api/users supports filter', async () => {
    const filter = encodeURIComponent(JSON.stringify({ is_sync_locked: { value: true } }))
    const result = await server.api(`/api/users?filter=${filter}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(result.total).toBe(1)
    expect(result.users[0].username).toBe('member-user')
  })

  it('GET /api/users supports symbolic cmp values', async () => {
    const filter = encodeURIComponent(JSON.stringify({ username: { cmp: '!=', value: 'users-admin' } }))
    const result = await server.api(`/api/users?filter=${filter}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(result.total).toBe(1)
    expect(result.users[0].username).toBe('member-user')
  })

  it('GET /api/users/:id returns user detail', async () => {
    const user = await server.api(`/api/users/${primaryUserId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(user.message).toBe('')
    expect(user.user.id).toBe(primaryUserId)
    expect(user.user.username).toBe('users-admin')
    expect(user.user.is_superadmin).toBe(true)
  })

  it('PUT /api/users/:id updates allowed fields', async () => {
    const updated = await server.api(`/api/users/${primaryUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        username: 'users-admin-renamed',
        is_sync_locked: true
      }
    })

    expect(updated.message).toBe('')
    expect(updated.user.username).toBe('users-admin-renamed')
    expect(updated.user.is_sync_locked).toBe(true)
  })

  it('DELETE /api/users/:id deletes user', async () => {
    const created = await dataSource.getRepository('user').save(
      dataSource.getRepository('user').create({
        email: 'delete-me@example.com',
        authType: AuthType.SSO,
        username: 'delete-me',
        passwordHash: null,
        isSuperadmin: false,
        isSyncLocked: false
      })
    )

    const result = await server.api(`/api/users/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(result).toEqual({ message: "User 'delete-me@example.com' deleted successfully." })
  })

  it('GET /api/users returns 400 for malformed filter', async () => {
    const error = await server.api('/api/users?filter=not-json', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(400)
  })

  it('GET /api/users returns 400 for unsupported cmp', async () => {
    const filter = encodeURIComponent(JSON.stringify({ username: { cmp: 'eq', value: 'users-admin' } }))
    const error = await server.api(`/api/users?filter=${filter}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(400)
  })
})

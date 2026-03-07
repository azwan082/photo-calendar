import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import type { FetchError } from 'ofetch'
import { AppSetting, Media, Post, SocialAccount, SyncLog, User } from '~/server/database/entities'
import { createApiServer, createMemoryDataSource, setTestDataSource, testDataSource } from './helpers'
import { seedUserWithAccount } from './fixtures'

vi.mock('~/server/utils/database', () => ({
  getDataSource: () => Promise.resolve(testDataSource)
}))

describe('Settings API', () => {
  let dataSource: DataSource
  let server: Awaited<ReturnType<typeof createApiServer>>
  let accessToken: string

  beforeAll(async () => {
    dataSource = await createMemoryDataSource([User, SocialAccount, Post, Media, SyncLog, AppSetting])
    setTestDataSource(dataSource)

    const seeded = await seedUserWithAccount(dataSource, {
      provider: 'google',
      accountId: 'settings-acct',
      displayName: 'Settings User',
      email: 'settings@example.com',
      username: 'settings-user'
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

  it('GET /api/settings returns an empty list initially', async () => {
    const result = await server.api('/api/settings', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(result.settings).toEqual([])
  })

  it('POST /api/settings creates a new setting', async () => {
    const created = await server.api('/api/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        key: 'sync_interval_minutes',
        value: '30',
        description: 'Interval for background sync jobs'
      }
    })

    expect(created.key).toBe('sync_interval_minutes')
    expect(created.value).toBe('30')
    expect(created.description).toBe('Interval for background sync jobs')
  })

  it('POST /api/settings rejects duplicate key', async () => {
    const error = await server.api('/api/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        key: 'sync_interval_minutes',
        value: '45'
      }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(400)
  })

  it('GET /api/settings/:key returns existing setting', async () => {
    const setting = await server.api('/api/settings/sync_interval_minutes', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(setting.key).toBe('sync_interval_minutes')
    expect(setting.value).toBe('30')
  })

  it('PUT /api/settings/:key updates value and description', async () => {
    const updated = await server.api('/api/settings/sync_interval_minutes', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        value: '60',
        description: 'Updated interval'
      }
    })

    expect(updated.value).toBe('60')
    expect(updated.description).toBe('Updated interval')
  })

  it('DELETE /api/settings/:key deletes setting', async () => {
    const deleted = await server.api('/api/settings/sync_interval_minutes', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(deleted).toEqual({ message: "Setting 'sync_interval_minutes' deleted successfully." })
  })

  it('GET /api/settings/:key returns 404 for deleted setting', async () => {
    const error = await server.api('/api/settings/sync_interval_minutes', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(404)
  })

  it('PUT /api/settings/:key returns 404 for unknown key', async () => {
    const error = await server.api('/api/settings/missing_key', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        value: '1'
      }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(404)
  })
})

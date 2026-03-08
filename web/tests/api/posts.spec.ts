import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import type { FetchError } from 'ofetch'
import { AppSettingSchema, AuthType, MediaSchema, PostSchema, SocialAccountSchema, SyncLogSchema, UserSchema } from '~/server/database/entities'
import { createApiServer, createMemoryDataSource, setTestDataSource, testDataSource } from './helpers'
import { seedUserWithAccount } from './fixtures'

vi.mock('~/server/utils/database', () => ({
  getDataSource: () => Promise.resolve(testDataSource)
}))

describe('Posts API', () => {
  let dataSource: DataSource
  let server: Awaited<ReturnType<typeof createApiServer>>
  let accessToken: string
  let targetPostId: number

  beforeAll(async () => {
    dataSource = await createMemoryDataSource([UserSchema, SocialAccountSchema, PostSchema, MediaSchema, SyncLogSchema, AppSettingSchema])
    setTestDataSource(dataSource)

    const seeded = await seedUserWithAccount(dataSource, {
      provider: 'google',
      accountId: 'posts-acct',
      email: 'posts@example.com',
      username: 'posts-user'
    })

    accessToken = seeded.tokens.access_token

    const postRepository = dataSource.getRepository('post')
    const mediaRepository = dataSource.getRepository('media')

    const post1 = await postRepository.save(
      postRepository.create({
        userId: seeded.user.id,
        accountId: seeded.account.id,
        externalPostId: 'post-1',
        caption: 'First post',
        timestamp: new Date('2026-02-20T10:00:00Z'),
        syncedAt: new Date('2026-02-20T10:05:00Z')
      })
    )

    const post2 = await postRepository.save(
      postRepository.create({
        userId: seeded.user.id,
        accountId: seeded.account.id,
        externalPostId: 'post-2',
        caption: 'Second post',
        timestamp: new Date('2026-02-21T10:00:00Z'),
        syncedAt: new Date('2026-02-21T10:05:00Z')
      })
    )

    targetPostId = post2.id

    await mediaRepository.save(
      mediaRepository.create({
        postId: post2.id,
        mediaUrl: 'https://cdn.example.com/post-2.jpg',
        mediaType: 'photo',
        width: 1200,
        height: 800
      })
    )

    const otherUser = await dataSource.getRepository('user').save(
      dataSource.getRepository('user').create({
        email: 'other@example.com',
        authType: AuthType.SSO,
        username: 'other-user',
        passwordHash: null,
        isSuperadmin: false,
        isSyncLocked: false
      })
    )

    const otherAccount = await dataSource.getRepository('social_account').save(
      dataSource.getRepository('social_account').create({
        userId: otherUser.id,
        provider: 'google',
        accountId: 'other-account',
        accessToken: 'other-access',
        refreshToken: null,
        expiresAt: null
      })
    )

    await postRepository.save(
      postRepository.create({
        userId: otherUser.id,
        accountId: otherAccount.id,
        externalPostId: 'other-post',
        caption: 'Should not be visible',
        timestamp: new Date('2026-02-22T10:00:00Z'),
        syncedAt: null
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

  it('GET /api/posts returns paginated user posts', async () => {
    const response = await server.api('/api/posts?page=1&limit=10&sort=desc', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(response.page).toBe(1)
    expect(response.limit).toBe(10)
    expect(response.total).toBe(2)
    expect(response.posts.length).toBe(2)
    expect(response.posts[0].external_post_id).toBe('post-2')
    expect(response.posts[0].media.length).toBe(1)
  })

  it('GET /api/posts validates query params', async () => {
    const error = await server.api('/api/posts?page=0', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(400)
  })

  it('GET /api/posts validates date range', async () => {
    const error = await server.api(
      '/api/posts?from_timestamp=2026-02-25T00:00:00Z&to_timestamp=2026-02-20T00:00:00Z',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    ).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(400)
  })

  it('GET /api/posts returns 404 when filters match no posts', async () => {
    const error = await server.api('/api/posts?from_timestamp=2026-03-01T00:00:00Z', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(404)
  })

  it('GET /api/posts/:id returns post detail', async () => {
    const post = await server.api(`/api/posts/${targetPostId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    expect(post.message).toBe('')
    expect(post.post.id).toBe(targetPostId)
    expect(post.post.external_post_id).toBe('post-2')
    expect(post.post.media.length).toBe(1)
    expect(post.post.media[0].media_type).toBe('photo')
  })

  it('GET /api/posts/:id returns 400 for invalid id', async () => {
    const error = await server.api('/api/posts/not-a-number', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(400)
  })

  it('GET /api/posts/:id returns 404 for unknown id', async () => {
    const error = await server.api('/api/posts/9999', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch((err: FetchError) => err)

    expect((error as FetchError).response?.status).toBe(404)
  })
})

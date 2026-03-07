import 'reflect-metadata'
import type { DataSource, EntitySchema } from 'typeorm'
import { createApp, createRouter, eventHandler, toWebHandler } from 'h3'
import { $fetch } from 'ofetch'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import { DataSource as TypeOrmDataSource } from 'typeorm'

export let testDataSource: DataSource

export const setTestDataSource = (dataSource: DataSource) => {
  testDataSource = dataSource
}

export const createMemoryDataSource = async (
  entities: (string | Function | EntitySchema<any>)[]
): Promise<DataSource> => {
  const dataSource = new TypeOrmDataSource({
    type: 'sqlite',
    database: ':memory:',
    dropSchema: true,
    entities,
    synchronize: true,
    namingStrategy: new SnakeNamingStrategy()
  })

  await dataSource.initialize()
  return dataSource
}

export interface TestServer {
  api: typeof $fetch
  close: () => Promise<void>
}

export const createApiServer = async (): Promise<TestServer> => {
  const [
    authLogin,
    authCallback,
    authToken,
    authRefresh,
    authLogoutGet,
    authLogoutPost,
    authUserInfo,
    sessionGet,
    sessionValidate,
    sessionRevoke,
    postsGet,
    postByIdGet,
    settingsGet,
    settingsPost,
    settingByKeyGet,
    settingByKeyPut,
    settingByKeyDelete
  ] = await Promise.all([
    import('~/server/api/auth/login.get').then((m) => m.default),
    import('~/server/api/auth/callback.get').then((m) => m.default),
    import('~/server/api/auth/token.post').then((m) => m.default),
    import('~/server/api/auth/refresh.post').then((m) => m.default),
    import('~/server/api/auth/logout.get').then((m) => m.default),
    import('~/server/api/auth/logout.post').then((m) => m.default),
    import('~/server/api/auth/userinfo.get').then((m) => m.default),
    import('~/server/api/session.get').then((m) => m.default),
    import('~/server/api/session/validate.post').then((m) => m.default),
    import('~/server/api/session/revoke.get').then((m) => m.default),
    import('~/server/api/posts/index.get').then((m) => m.default),
    import('~/server/api/posts/[id].get').then((m) => m.default),
    import('~/server/api/settings/index.get').then((m) => m.default),
    import('~/server/api/settings/index.post').then((m) => m.default),
    import('~/server/api/settings/[key].get').then((m) => m.default),
    import('~/server/api/settings/[key].put').then((m) => m.default),
    import('~/server/api/settings/[key].delete').then((m) => m.default)
  ])

  const app = createApp()
  const router = createRouter()

  router.get('/api/auth/login', eventHandler(authLogin))
  router.get('/api/auth/callback', eventHandler(authCallback))
  router.post('/api/auth/token', eventHandler(authToken))
  router.post('/api/auth/refresh', eventHandler(authRefresh))
  router.get('/api/auth/logout', eventHandler(authLogoutGet))
  router.post('/api/auth/logout', eventHandler(authLogoutPost))
  router.get('/api/auth/userinfo', eventHandler(authUserInfo))

  router.get('/api/session', eventHandler(sessionGet))
  router.post('/api/session/validate', eventHandler(sessionValidate))
  router.get('/api/session/revoke', eventHandler(sessionRevoke))

  router.get('/api/posts', eventHandler(postsGet))
  router.get('/api/posts/:id', eventHandler(postByIdGet))

  router.get('/api/settings', eventHandler(settingsGet))
  router.post('/api/settings', eventHandler(settingsPost))
  router.get('/api/settings/:key', eventHandler(settingByKeyGet))
  router.put('/api/settings/:key', eventHandler(settingByKeyPut))
  router.delete('/api/settings/:key', eventHandler(settingByKeyDelete))

  app.use(router)

  const webHandler = toWebHandler(app)
  const api = $fetch.create(
    {
      baseURL: 'http://localhost'
    },
    {
      fetch: (request, init) => webHandler(new Request(request, init), {})
    }
  )

  return {
    api,
    close: async () => {}
  }
}

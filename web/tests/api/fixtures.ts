import type { DataSource } from 'typeorm'
import { AuthType, SocialAccountSchema, UserSchema } from '~/server/database/entities'
import { createTokenResponse, type TokenResponse } from '~/server/utils/token'

export interface SeededAuthContext {
  user: any
  account: any
  tokens: TokenResponse
}

export const seedUserWithAccount = async (
  dataSource: DataSource,
  options?: {
    provider?: string
    accountId?: string
    isSuperadmin?: boolean
    isSyncLocked?: boolean
    email?: string
    username?: string
  }
): Promise<SeededAuthContext> => {
  const userRepository = dataSource.getRepository('user')
  const accountRepository = dataSource.getRepository('social_account')

  const user = await userRepository.save(
    userRepository.create({
      email: options?.email ?? 'test@example.com',
      authType: AuthType.SSO,
      username: options?.username ?? 'test-user',
      passwordHash: null,
      isSuperadmin: options?.isSuperadmin ?? true,
      isSyncLocked: options?.isSyncLocked ?? false
    })
  )

  const account = await accountRepository.save(
    accountRepository.create({
      userId: user.id,
      provider: options?.provider ?? 'google',
      accountId: options?.accountId ?? 'acct-1',
      accessToken: 'provider-access-token',
      refreshToken: 'provider-refresh-token',
      expiresAt: new Date(Date.now() + 3600_000)
    })
  )

  const roles = user.isSuperadmin ? ['admin', 'user'] : ['user']

  const tokens = createTokenResponse({
    userId: user.id,
    accountId: account.id,
    provider: account.provider,
    name: user.username,
    email: user.email,
    roles
  })

  return { user, account, tokens }
}

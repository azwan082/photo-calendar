import type { DataSource } from 'typeorm'
import { AuthType, SocialAccount, User } from '~/server/database/entities'
import { createTokenResponse, type TokenResponse } from '~/server/utils/token'

export interface SeededAuthContext {
  user: User
  account: SocialAccount
  tokens: TokenResponse
}

export const seedUserWithAccount = async (
  dataSource: DataSource,
  options?: {
    provider?: string
    accountId?: string
    isSuperadmin?: boolean
    email?: string
    displayName?: string
    username?: string
  }
): Promise<SeededAuthContext> => {
  const userRepository = dataSource.getRepository(User)
  const accountRepository = dataSource.getRepository(SocialAccount)

  const user = await userRepository.save(
    userRepository.create({
      email: options?.email ?? 'test@example.com',
      displayName: options?.displayName ?? 'Test User',
      authType: AuthType.SSO,
      username: options?.username ?? 'test-user',
      passwordHash: null,
      isSuperadmin: options?.isSuperadmin ?? true
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
    name: user.displayName,
    email: user.email,
    roles
  })

  return { user, account, tokens }
}

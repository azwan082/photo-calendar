import { createError, getRouterParam, readBody } from 'h3'
import { QueryFailedError } from 'typeorm'
import { UserSchema } from '../../database/entities'
import type { UserInterface } from '../../database/entities'
import type { KeyedResponse, UserDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'
import { toUserDto } from '../../utils/serializers'

interface UpdateUserBody {
  username?: string
  is_sync_locked?: boolean
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const code = (error as QueryFailedError & { code?: string }).code
  return code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT'
}

export default defineEventHandler(async (event): Promise<KeyedResponse<'user', UserDto>> => {
  await requireUserFromToken(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const body = await readBody<UpdateUserBody>(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const hasUsername = Object.prototype.hasOwnProperty.call(body, 'username')
  const hasSyncLock = Object.prototype.hasOwnProperty.call(body, 'is_sync_locked')

  if (!hasUsername && !hasSyncLock) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  if (hasUsername && (typeof body.username !== 'string' || body.username.trim().length === 0)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  if (hasSyncLock && typeof body.is_sync_locked !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('user')
  const user = await repository.findOne({ where: { id } })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  if (hasUsername) {
    user.username = body.username!.trim()
  }

  if (hasSyncLock) {
    user.isSyncLocked = body.is_sync_locked as boolean
  }

  try {
    const saved = await repository.save(user)

    return { message: '', user: toUserDto(saved) }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 400, statusMessage: 'invalid request' })
    }

    throw error
  }
})

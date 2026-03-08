import { createError, getRouterParam } from 'h3'
import { UserSchema } from '../../database/entities'
import type { UserInterface } from '../../database/entities'
import type { KeyedResponse, UserDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'
import { toUserDto } from '../../utils/serializers'

export default defineEventHandler(async (event): Promise<KeyedResponse<'user', UserDto>> => {
  await requireUserFromToken(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('user')

  const user = await repository.findOne({ where: { id } })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'no users found' })
  }

  return { message: '', user: toUserDto(user) }
})

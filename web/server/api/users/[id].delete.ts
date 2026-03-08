import { createError, getRouterParam } from 'h3'
import { UserSchema } from '../../database/entities'
import type { MessageResponse } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'

export default defineEventHandler(async (event): Promise<MessageResponse> => {
  await requireUserFromToken(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('user')
  const user = await repository.findOne({ where: { id } })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  await repository.delete({ id })

  return {
    message: `User '${user.email}' deleted successfully.`
  }
})

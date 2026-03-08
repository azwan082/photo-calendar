import { createError, getQuery } from 'h3'
import { UserSchema } from '../../database/entities'
import type { UserInterface } from '../../database/entities'
import type { PaginatedResponse, UserDto } from '../../types/api'
import { requireUserFromToken } from '../../utils/auth'
import { getDataSource } from '../../utils/database'
import { toUserDto } from '../../utils/serializers'

interface FilterExpression {
  value?: string | number | boolean
  cmp?: string
  min?: string | number | boolean
  max?: string | number | boolean
}

type FilterInput = Record<string, FilterExpression>

const FILTERABLE_COLUMNS = new Map<string, { field: string; type: 'string' | 'boolean' | 'number' }>([
  ['email', { field: 'user.email', type: 'string' }],
  ['username', { field: 'user.username', type: 'string' }],
  ['is_superadmin', { field: 'user.isSuperadmin', type: 'boolean' }],
  ['is_sync_locked', { field: 'user.isSyncLocked', type: 'boolean' }]
])

const SORTABLE_COLUMNS = new Map<string, string>([
  ['id', 'user.id'],
  ['email', 'user.email'],
  ['username', 'user.username'],
  ['auth_type', 'user.authType'],
  ['is_superadmin', 'user.isSuperadmin'],
  ['is_sync_locked', 'user.isSyncLocked'],
  ['created_at', 'user.createdAt']
])

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') {
      return true
    }
    if (normalized === 'false') {
      return false
    }
  }

  return null
}

function parseFilter(raw: unknown): FilterInput | null {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid filter')
    }

    return parsed as FilterInput
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }
}

function applyFilter(queryBuilder: any, filter: FilterInput): void {
  const cmpToOperator = new Map<string, string>([
    ['=', '='],
    ['!=', '!='],
    ['>', '>'],
    ['>=', '>='],
    ['<', '<'],
    ['<=', '<=']
  ])

  Object.entries(filter).forEach(([column, expression], index) => {
    const meta = FILTERABLE_COLUMNS.get(column)
    if (!meta || !expression || typeof expression !== 'object' || Array.isArray(expression)) {
      throw createError({ statusCode: 400, statusMessage: 'invalid request' })
    }

    const cmp = expression.cmp === undefined ? '=' : expression.cmp
    const operator = cmpToOperator.get(cmp)
    if (!operator) {
      throw createError({ statusCode: 400, statusMessage: 'invalid request' })
    }

    const hasValue = Object.prototype.hasOwnProperty.call(expression, 'value')
    const hasRange = Object.prototype.hasOwnProperty.call(expression, 'min') || Object.prototype.hasOwnProperty.call(expression, 'max')

    if (!hasValue && !hasRange) {
      throw createError({ statusCode: 400, statusMessage: 'invalid request' })
    }

    const valueParam = `filter_${column}_${index}`
    const minParam = `filter_min_${column}_${index}`
    const maxParam = `filter_max_${column}_${index}`

    if (hasValue) {
      const rawValue = expression.value

      if (meta.type === 'boolean') {
        const boolValue = toBoolean(rawValue)
        if (boolValue === null) {
          throw createError({ statusCode: 400, statusMessage: 'invalid request' })
        }

        queryBuilder.andWhere(`${meta.field} ${operator} :${valueParam}`, { [valueParam]: boolValue ? 1 : 0 })
        return
      }

      if (meta.type === 'number' && typeof rawValue !== 'number') {
        throw createError({ statusCode: 400, statusMessage: 'invalid request' })
      }

      if (meta.type === 'string' && typeof rawValue !== 'string') {
        throw createError({ statusCode: 400, statusMessage: 'invalid request' })
      }

      queryBuilder.andWhere(`${meta.field} ${operator} :${valueParam}`, { [valueParam]: rawValue })
      return
    }

    if (Object.prototype.hasOwnProperty.call(expression, 'min')) {
      const minValue = expression.min

      if (meta.type === 'boolean') {
        const boolMin = toBoolean(minValue)
        if (boolMin === null) {
          throw createError({ statusCode: 400, statusMessage: 'invalid request' })
        }
        queryBuilder.andWhere(`${meta.field} >= :${minParam}`, { [minParam]: boolMin ? 1 : 0 })
      } else {
        queryBuilder.andWhere(`${meta.field} >= :${minParam}`, { [minParam]: minValue })
      }
    }

    if (Object.prototype.hasOwnProperty.call(expression, 'max')) {
      const maxValue = expression.max

      if (meta.type === 'boolean') {
        const boolMax = toBoolean(maxValue)
        if (boolMax === null) {
          throw createError({ statusCode: 400, statusMessage: 'invalid request' })
        }
        queryBuilder.andWhere(`${meta.field} <= :${maxParam}`, { [maxParam]: boolMax ? 1 : 0 })
      } else {
        queryBuilder.andWhere(`${meta.field} <= :${maxParam}`, { [maxParam]: maxValue })
      }
    }
  })
}

export default defineEventHandler(async (event): Promise<PaginatedResponse<'users', UserDto>> => {
  await requireUserFromToken(event)
  const query = getQuery(event)

  const page = typeof query.page === 'string' ? Number(query.page) : 1
  const limit = typeof query.limit === 'string' ? Number(query.limit) : 100

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const sort = query.sort === undefined || query.sort === 'desc' ? 'DESC' : query.sort === 'asc' ? 'ASC' : null
  if (!sort) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const sortBy = query.sort_by === undefined ? 'id' : typeof query.sort_by === 'string' ? query.sort_by : null
  const sortColumn = sortBy ? SORTABLE_COLUMNS.get(sortBy) : null
  if (!sortColumn) {
    throw createError({ statusCode: 400, statusMessage: 'invalid request' })
  }

  const filter = parseFilter(query.filter)

  const dataSource = await getDataSource()
  const repository = dataSource.getRepository('user')

  const queryBuilder = repository
    .createQueryBuilder('user')
    .orderBy(sortColumn, sort)
    .skip((page - 1) * limit)
    .take(limit)

  if (filter) {
    applyFilter(queryBuilder, filter)
  }

  const [users, total] = await queryBuilder.getManyAndCount()
  if (total === 0) {
    throw createError({ statusCode: 404, statusMessage: 'no users found' })
  }

  return {
    page,
    limit,
    total,
    users: users.map(toUserDto)
  }
})

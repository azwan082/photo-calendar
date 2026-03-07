import 'reflect-metadata'
import { DataSource, EntitySchema } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

export const memoryDB = async (entities: (string | Function | EntitySchema<any>)[]) => {
    const ds = new DataSource({
        type: 'sqlite',
        database: ':memory:',
        dropSchema: true,
        entities: entities,
        synchronize: true,
        namingStrategy: new SnakeNamingStrategy(),
    })
    await ds.initialize()
    return ds
}

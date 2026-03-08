import { EntitySchema } from 'typeorm'

export interface AppSettingInterface {
  id: number
  key: string
  value: string
  description: string | null
  updatedAt: Date
}

export const AppSettingSchema = new EntitySchema<AppSettingInterface>({
  name: 'app_setting',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    key: {
      type: String,
      length: 255,
      unique: true
    },
    value: {
      type: String
    },
    description: {
      type: String,
      nullable: true
    },
    updatedAt: {
      name: 'updated_at',
      type: Date,
      updateDate: true
    }
  }
})

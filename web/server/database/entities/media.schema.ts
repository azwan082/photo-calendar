import { EntitySchema } from 'typeorm'

export interface MediaInterface {
  id: number
  postId: number
  mediaUrl: string
  mediaType: string
  width: number | null
  height: number | null
  post?: any
}

export const MediaSchema = new EntitySchema<MediaInterface>({
  name: 'media',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    postId: {
      name: 'post_id',
      type: Number
    },
    mediaUrl: {
      name: 'media_url',
      type: String
    },
    mediaType: {
      name: 'media_type',
      type: String,
      length: 40
    },
    width: {
      type: Number,
      nullable: true
    },
    height: {
      type: Number,
      nullable: true
    }
  },
  relations: {
    post: {
      target: 'post',
      type: 'many-to-one',
      inverseSide: 'media',
      joinColumn: {
        name: 'post_id'
      },
      onDelete: 'CASCADE'
    }
  }
})

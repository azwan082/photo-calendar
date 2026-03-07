import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'
import { Post } from './post.entity'

@Entity({ name: 'media' })
/**
 * Represents a media attachment associated with a post.
 */
export class Media {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'post_id', type: 'int' })
  postId!: number

  @Column({ name: 'media_url', type: 'text' })
  mediaUrl!: string

  @Column({ name: 'media_type', type: 'varchar', length: 40 })
  mediaType!: string

  @Column({ type: 'int', nullable: true })
  width!: number | null

  @Column({ type: 'int', nullable: true })
  height!: number | null

  @ManyToOne(() => Post, (post) => post.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post
}

import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'app_settings' })
/**
 * Represents a key-value application configuration setting.
 */
export class AppSetting {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar', length: 120, unique: true })
  key!: string

  @Column({ type: 'text' })
  value!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date
}

import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('underwriting_rule_parameters')
export class UnderwritingRuleParameter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  key!: string;

  @Column('decimal', { precision: 10, scale: 4 })
  value!: string;

  @Column('text')
  description!: string;

  @Column('text')
  source!: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

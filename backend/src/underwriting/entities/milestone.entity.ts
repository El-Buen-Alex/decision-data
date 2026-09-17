import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Plan } from './plan.entity';

export enum MilestoneStatus {
  PENDING = 'pending',
  DONE = 'done',
}

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ name: 'plan_id' })
  planId!: string;

  @Column('int', { name: 'sequence_number' })
  sequenceNumber!: number;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column({ name: 'target_metric' })
  targetMetric!: string;

  @Column('decimal', { precision: 10, scale: 2, name: 'target_value' })
  targetValue!: string;

  @Column('date', { name: 'target_date' })
  targetDate!: string;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
  })
  status!: MilestoneStatus;
}

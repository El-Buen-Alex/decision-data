import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MortgageGoal } from './mortgage-goal.entity';

@Entity('simulations')
export class Simulation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => MortgageGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mortgage_goal_id' })
  mortgageGoal!: MortgageGoal;

  @Column({ name: 'mortgage_goal_id' })
  mortgageGoalId!: string;

  @Column('jsonb')
  inputs!: Record<string, unknown>;

  @Column('jsonb')
  outputs!: Record<string, unknown>;

  @Column('jsonb', { name: 'rule_snapshot' })
  ruleSnapshot!: Record<string, number>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

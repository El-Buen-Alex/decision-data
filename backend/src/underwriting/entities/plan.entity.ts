import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Simulation } from './simulation.entity';

export enum PlanStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Simulation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'simulation_id' })
  simulation!: Simulation;

  @Column({ name: 'simulation_id' })
  simulationId!: string;

  @Column({ type: 'enum', enum: PlanStatus, default: PlanStatus.ACTIVE })
  status!: PlanStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

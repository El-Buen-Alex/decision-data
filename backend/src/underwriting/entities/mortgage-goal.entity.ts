import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PropertyType {
  PRIVATE = 'private',
  VIS = 'vis',
}

@Entity('mortgage_goals')
export class MortgageGoal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column('decimal', { precision: 12, scale: 2, name: 'property_value' })
  propertyValue!: string;

  @Column({ type: 'enum', enum: PropertyType, name: 'property_type' })
  propertyType!: PropertyType;

  @Column('decimal', { precision: 12, scale: 2, name: 'desired_loan_amount' })
  desiredLoanAmount!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

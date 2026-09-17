import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum IncomeType {
  FORMAL = 'formal',
  INFORMAL = 'informal',
}

@Entity('credit_profiles')
export class CreditProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column('int')
  score!: number;

  @Column('decimal', {
    precision: 5,
    scale: 2,
    name: 'card_utilization_percent',
  })
  cardUtilizationPercent!: string;

  @Column('decimal', { precision: 12, scale: 2, name: 'monthly_income' })
  monthlyIncome!: string;

  @Column({ type: 'enum', enum: IncomeType, name: 'income_type' })
  incomeType!: IncomeType;

  @Column('int', { name: 'months_employed' })
  monthsEmployed!: number;

  @Column('boolean', { name: 'recent_delinquency', default: false })
  recentDelinquency!: boolean;

  @Column('decimal', { precision: 12, scale: 2, name: 'existing_monthly_debt' })
  existingMonthlyDebt!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('agent_logs')
export class AgentLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @Column()
  endpoint!: string;

  @Column('jsonb', { name: 'context_sent' })
  contextSent!: Record<string, unknown>;

  @Column('text', { name: 'raw_response' })
  rawResponse!: string;

  @Column('text', { name: 'resolved_response' })
  resolvedResponse!: string;

  @Column('boolean', { name: 'validation_passed' })
  validationPassed!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

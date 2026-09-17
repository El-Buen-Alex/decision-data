import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AgentLog } from './entities/agent-log.entity';
import { UnderwritingModule } from '../underwriting/underwriting.module';
import { AuthModule } from '../auth/auth.module';
import { LlmClientService } from './llm-client.service';
import { TemplateResolverService } from './template-resolver.service';
import { AgentContextBuilderService } from './agent-context-builder.service';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentLog]),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    UnderwritingModule,
    AuthModule,
  ],
  providers: [LlmClientService, TemplateResolverService, AgentContextBuilderService, AgentService],
  controllers: [AgentController],
})
export class AgentModule {}

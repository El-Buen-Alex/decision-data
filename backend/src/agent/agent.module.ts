import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { AgentLog } from './entities/agent-log.entity';
import { UnderwritingModule } from '../underwriting/underwriting.module';
import { AuthModule } from '../auth/auth.module';
import { LlmClientService } from './llm-client.service';
import { TemplateResolverService } from './template-resolver.service';
import { AgentContextBuilderService } from './agent-context-builder.service';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';

const MILLISECONDS_PER_SECOND = 1000;

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentLog]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => {
        const ttlSeconds = configService.getOrThrow<number>('THROTTLE_TTL_SECONDS');
        const limit = configService.getOrThrow<number>('THROTTLE_LIMIT');
        return [{ ttl: ttlSeconds * MILLISECONDS_PER_SECOND, limit }];
      },
    }),
    UnderwritingModule,
    AuthModule,
  ],
  providers: [LlmClientService, TemplateResolverService, AgentContextBuilderService, AgentService],
  controllers: [AgentController],
})
export class AgentModule {}

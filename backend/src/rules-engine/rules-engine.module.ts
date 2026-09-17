import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnderwritingRuleParameter } from '../underwriting/entities/underwriting-rule-parameter.entity';
import { RulesEngineService } from './rules-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([UnderwritingRuleParameter])],
  providers: [RulesEngineService],
  exports: [RulesEngineService],
})
export class RulesEngineModule {}

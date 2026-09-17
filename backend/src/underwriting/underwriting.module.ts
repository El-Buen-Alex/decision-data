import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditProfile } from './entities/credit-profile.entity';
import { MortgageGoal } from './entities/mortgage-goal.entity';
import { Simulation } from './entities/simulation.entity';
import { Plan } from './entities/plan.entity';
import { Milestone } from './entities/milestone.entity';
import { UnderwritingRuleParameter } from './entities/underwriting-rule-parameter.entity';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { AuthModule } from '../auth/auth.module';
import { UnderwritingService } from './underwriting.service';
import { PlanGeneratorService } from './plan-generator.service';
import { UnderwritingController } from './underwriting.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditProfile,
      MortgageGoal,
      Simulation,
      Plan,
      Milestone,
      UnderwritingRuleParameter,
    ]),
    RulesEngineModule,
    AuthModule,
  ],
  providers: [UnderwritingService, PlanGeneratorService],
  controllers: [UnderwritingController],
  exports: [UnderwritingService, PlanGeneratorService],
})
export class UnderwritingModule {}

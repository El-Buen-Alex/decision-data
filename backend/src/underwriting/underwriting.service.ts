import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditProfile } from './entities/credit-profile.entity';
import { MortgageGoal, PropertyType } from './entities/mortgage-goal.entity';
import { Simulation } from './entities/simulation.entity';
import { UnderwritingRuleParameter } from './entities/underwriting-rule-parameter.entity';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SimulationResponse } from './interfaces/simulation-response.interface';

@Injectable()
export class UnderwritingService {
  constructor(
    @InjectRepository(CreditProfile)
    private readonly creditProfileRepository: Repository<CreditProfile>,
    @InjectRepository(MortgageGoal)
    private readonly mortgageGoalRepository: Repository<MortgageGoal>,
    @InjectRepository(Simulation)
    private readonly simulationRepository: Repository<Simulation>,
    @InjectRepository(UnderwritingRuleParameter)
    private readonly ruleParameterRepository: Repository<UnderwritingRuleParameter>,
    private readonly rulesEngineService: RulesEngineService,
  ) {}

  async getProfile(userId: string): Promise<CreditProfile> {
    const profile = await this.creditProfileRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(
        'No existe un perfil de crédito para este usuario.',
      );
    }
    return profile;
  }

  async getGoal(userId: string): Promise<MortgageGoal> {
    const goal = await this.mortgageGoalRepository.findOne({
      where: { userId },
    });
    if (!goal) {
      throw new NotFoundException(
        'No existe una meta hipotecaria para este usuario.',
      );
    }
    return goal;
  }

  async createSimulation(
    userId: string,
    dto: CreateSimulationDto,
  ): Promise<SimulationResponse> {
    const profile = await this.getProfile(userId);
    const goal = await this.getGoal(userId);
    const isVisEligible =
      dto.isVisEligible ?? goal.propertyType === PropertyType.VIS;

    const output = await this.rulesEngineService.runSimulation({
      score: dto.projectedScore,
      existingMonthlyDebt: dto.adjustedExistingMonthlyDebt,
      monthlyIncome: dto.adjustedMonthlyIncome,
      incomeType: profile.incomeType,
      monthsEmployed: profile.monthsEmployed,
      recentDelinquency: profile.recentDelinquency,
      propertyValue: dto.adjustedPropertyValue,
      loanAmount: dto.adjustedLoanAmount,
      isVisEligible,
    });

    const savedSimulation = await this.simulationRepository.save(
      this.simulationRepository.create({
        userId,
        mortgageGoalId: goal.id,
        inputs: { ...dto },
        outputs: { ...output },
        ruleSnapshot: output.ruleSnapshot,
      }),
    );

    return {
      id: savedSimulation.id,
      scoreBand: output.scoreBand,
      housingDtiRatio: output.housingDtiRatio,
      totalDtiRatio: output.totalDtiRatio,
      ltv: output.ltv,
      monthlyPayment: output.monthlyPayment,
      approvalPercentage: output.approvalPercentage,
      approvalCategory: output.approvalCategory,
      qualifiesToday: output.qualifiesToday,
      createdAt: savedSimulation.createdAt,
    };
  }

  async getSimulationById(userId: string, simulationId: string): Promise<SimulationResponse> {
    const simulation = await this.simulationRepository.findOne({
      where: { id: simulationId, userId },
    });
    if (!simulation) {
      throw new NotFoundException('No existe esa simulación para este usuario.');
    }
    const outputs = simulation.outputs as Record<string, unknown>;
    return {
      id: simulation.id,
      scoreBand: outputs.scoreBand as SimulationResponse['scoreBand'],
      housingDtiRatio: outputs.housingDtiRatio as number,
      totalDtiRatio: outputs.totalDtiRatio as number,
      ltv: outputs.ltv as number,
      monthlyPayment: outputs.monthlyPayment as number,
      approvalPercentage: outputs.approvalPercentage as number,
      approvalCategory: outputs.approvalCategory as SimulationResponse['approvalCategory'],
      qualifiesToday: outputs.qualifiesToday as boolean,
      createdAt: simulation.createdAt,
    };
  }

  async listSimulations(userId: string): Promise<Simulation[]> {
    return this.simulationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async listRuleParameters(): Promise<UnderwritingRuleParameter[]> {
    return this.ruleParameterRepository.find({ order: { key: 'ASC' } });
  }

  async updateRuleParameter(key: string, value: number): Promise<UnderwritingRuleParameter> {
    const parameter = await this.ruleParameterRepository.findOne({ where: { key } });
    if (!parameter) {
      throw new NotFoundException(`No existe el parámetro de reglas "${key}".`);
    }
    parameter.value = String(value);
    return this.ruleParameterRepository.save(parameter);
  }
}

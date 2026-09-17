import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Simulation } from './entities/simulation.entity';
import { Plan, PlanStatus } from './entities/plan.entity';
import { Milestone, MilestoneStatus } from './entities/milestone.entity';
import { UnderwritingService } from './underwriting.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SimulationResponse } from './interfaces/simulation-response.interface';

export interface PlanWithMilestones {
  plan: Plan;
  milestones: Milestone[];
}

export interface PlanCheckInResult extends PlanWithMilestones {
  simulation: SimulationResponse;
}

@Injectable()
export class PlanGeneratorService {
  constructor(
    @InjectRepository(Simulation)
    private readonly simulationRepository: Repository<Simulation>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    private readonly underwritingService: UnderwritingService,
  ) {}

  async generateFromSimulation(userId: string, simulationId: string): Promise<PlanWithMilestones> {
    const simulation = await this.simulationRepository.findOne({
      where: { id: simulationId, userId },
    });
    if (!simulation) {
      throw new NotFoundException('No existe esa simulación para este usuario.');
    }

    const savedPlan = await this.planRepository.save(
      this.planRepository.create({ userId, simulationId: simulation.id }),
    );

    const milestoneDefinitions = this.buildMilestoneDefinitions(simulation);
    const milestonesToSave = milestoneDefinitions.map((definition, index) =>
      this.milestoneRepository.create({
        planId: savedPlan.id,
        sequenceNumber: index + 1,
        description: null,
        targetMetric: definition.targetMetric,
        targetValue: String(definition.targetValue),
        targetDate: definition.targetDate,
      }),
    );

    const savedMilestones = await this.milestoneRepository.save(milestonesToSave);

    return { plan: savedPlan, milestones: savedMilestones };
  }

  async getPlanWithMilestones(userId: string, planId: string): Promise<PlanWithMilestones> {
    const plan = await this.planRepository.findOne({ where: { id: planId, userId } });
    if (!plan) {
      throw new NotFoundException('No existe ese plan para este usuario.');
    }

    const milestones = await this.milestoneRepository.find({
      where: { planId: plan.id },
      order: { sequenceNumber: 'ASC' },
    });

    return { plan, milestones };
  }

  async checkIn(
    userId: string,
    planId: string,
    dto: CreateSimulationDto,
  ): Promise<PlanCheckInResult> {
    const plan = await this.planRepository.findOne({ where: { id: planId, userId } });
    if (!plan) {
      throw new NotFoundException('No existe ese plan para este usuario.');
    }

    const simulation = await this.underwritingService.createSimulation(userId, dto);

    const milestones = await this.milestoneRepository.find({
      where: { planId: plan.id },
      order: { sequenceNumber: 'ASC' },
    });
    const updatedMilestones = await Promise.all(
      milestones.map((milestone) => this.evaluateMilestone(milestone, simulation)),
    );

    if (updatedMilestones.every((milestone) => milestone.status === MilestoneStatus.DONE)) {
      plan.status = PlanStatus.COMPLETED;
      await this.planRepository.save(plan);
    }

    return { plan, milestones: updatedMilestones, simulation };
  }

  private async evaluateMilestone(
    milestone: Milestone,
    simulation: SimulationResponse,
  ): Promise<Milestone> {
    if (milestone.status === MilestoneStatus.DONE) {
      return milestone;
    }
    if (!this.milestonePasses(milestone.targetMetric, Number(milestone.targetValue), simulation)) {
      return milestone;
    }

    milestone.status = MilestoneStatus.DONE;
    milestone.completedAt = new Date();
    return this.milestoneRepository.save(milestone);
  }

  private milestonePasses(
    targetMetric: string,
    targetValue: number,
    simulation: SimulationResponse,
  ): boolean {
    switch (targetMetric) {
      case 'housing_dti_ratio':
        return simulation.housingDtiRatio <= targetValue;
      case 'ltv':
        return simulation.ltv <= targetValue;
      case 'qualifies_today':
        return simulation.qualifiesToday;
      default:
        return false;
    }
  }

  private buildMilestoneDefinitions(simulation: Simulation): {
    targetMetric: string;
    targetValue: number;
    targetDate: string;
  }[] {
    const outputs = simulation.outputs as { housingDtiRatio: number; ltv: number };
    const today = new Date();

    const dtiMilestoneDate = this.addMonths(today, 2);
    const ltvMilestoneDate = this.addMonths(today, 4);
    const finalMilestoneDate = this.addMonths(today, 6);

    return [
      { targetMetric: 'housing_dti_ratio', targetValue: 0.4, targetDate: dtiMilestoneDate },
      { targetMetric: 'ltv', targetValue: Math.min(outputs.ltv, 0.8), targetDate: ltvMilestoneDate },
      { targetMetric: 'qualifies_today', targetValue: 1, targetDate: finalMilestoneDate },
    ];
  }

  private addMonths(date: Date, months: number): string {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result.toISOString().slice(0, 10);
  }
}

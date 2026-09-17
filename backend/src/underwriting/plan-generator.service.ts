import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Simulation } from './entities/simulation.entity';
import { Plan } from './entities/plan.entity';
import { Milestone } from './entities/milestone.entity';

export interface PlanWithMilestones {
  plan: Plan;
  milestones: Milestone[];
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

import { IsUUID } from 'class-validator';

export class CreatePlanDto {
  @IsUUID()
  simulationId!: string;
}

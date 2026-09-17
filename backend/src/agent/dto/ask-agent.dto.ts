import { IsString, IsUUID, MaxLength } from 'class-validator';

export class AskAgentDto {
  @IsUUID()
  simulationId!: string;

  @IsString()
  @MaxLength(500)
  question!: string;
}

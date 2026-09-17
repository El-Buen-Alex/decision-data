import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AskAgentDto {
  @IsUUID()
  simulationId!: string;

  // Reservado para el futuro endpoint /agent/ask, que reutilizará este DTO.
  // /agent/explain narra una simulación ya calculada y no recibe pregunta,
  // por lo que el campo debe ser opcional.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  question?: string;
}

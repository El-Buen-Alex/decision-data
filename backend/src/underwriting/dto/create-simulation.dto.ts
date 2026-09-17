import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateSimulationDto {
  @IsNumber()
  @Min(0)
  adjustedExistingMonthlyDebt!: number;

  // Mínimo 1 y no 0: ambos son denominadores en el motor de reglas
  // (housingRatio = cuota / ingreso, ltv = monto / valor) y un 0 produciría
  // Infinity, que JSON.stringify persiste como null en la columna jsonb.
  @IsNumber()
  @Min(1)
  adjustedMonthlyIncome!: number;

  @IsNumber()
  @Min(1)
  adjustedPropertyValue!: number;

  @IsNumber()
  @Min(0)
  adjustedLoanAmount!: number;

  @IsInt()
  @Min(1)
  projectedScore!: number;

  @IsBoolean()
  @IsOptional()
  isVisEligible?: boolean;
}

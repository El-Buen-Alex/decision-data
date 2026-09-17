import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateSimulationDto {
  @IsNumber()
  @Min(0)
  adjustedExistingMonthlyDebt!: number;

  @IsNumber()
  @Min(0)
  adjustedMonthlyIncome!: number;

  @IsNumber()
  @Min(0)
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

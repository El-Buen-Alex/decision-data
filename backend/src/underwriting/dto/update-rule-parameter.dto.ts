import { IsNumber } from 'class-validator';

export class UpdateRuleParameterDto {
  @IsNumber()
  value!: number;
}

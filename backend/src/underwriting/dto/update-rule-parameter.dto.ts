import { IsNumber, Min } from 'class-validator';

export class UpdateRuleParameterDto {
  // Piso genérico para evitar división por cero en el motor de reglas (p. ej. si
  // DEFAULT_TERM_YEARS se pone en 0). No valida rangos específicos por parámetro.
  @IsNumber()
  @Min(0.0001)
  value!: number;
}

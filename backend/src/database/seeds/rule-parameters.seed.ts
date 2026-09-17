import { DataSource } from 'typeorm';
import { UnderwritingRuleParameter } from '../../underwriting/entities/underwriting-rule-parameter.entity';

interface RuleParameterSeed {
  key: string;
  value: string;
  description: string;
  source: string;
}

const RULE_PARAMETERS: RuleParameterSeed[] = [
  {
    key: 'BASE_ANNUAL_INTEREST_RATE',
    value: '0.0735',
    description: 'Tasa hipotecaria anual base para vivienda terminada, banca privada.',
    source: 'BCE, promedio 7.35% anual, junio 2026 (via Primicias).',
  },
  {
    key: 'VIS_ANNUAL_INTEREST_RATE',
    value: '0.0499',
    description: 'Tasa anual para vivienda de interés social/público (VIS/VIP).',
    source: 'El Diario, tasas vigentes marzo 2026.',
  },
  {
    key: 'VIS_PROPERTY_VALUE_THRESHOLD',
    value: '90000',
    description: 'Valor máximo de inmueble para calificar como segmento VIS/VIP.',
    source: 'Reglamento operativo del Programa de Vivienda de Interés Social y Público.',
  },
  {
    key: 'MAX_HOUSING_DTI_RATIO',
    value: '0.40',
    description: 'Máximo porcentaje del ingreso que puede representar la cuota hipotecaria nueva.',
    source: 'Primicias, "consejos crédito hipotecario": bancos evalúan cuota <= 40% del ingreso.',
  },
  {
    key: 'MAX_TOTAL_DTI_RATIO',
    value: '0.50',
    description: 'Máximo porcentaje del ingreso que puede representar toda la deuda, incluida la nueva cuota.',
    source: 'Primicias, rango recomendado 35%-50% de deuda total sobre ingreso.',
  },
  {
    key: 'MAX_LTV_BASE',
    value: '0.80',
    description: 'Relación préstamo/valor máxima para score en banda no excelente.',
    source: 'Banco Pichincha, financiamiento hasta 80-83%; Banco Internacional exige 20% de entrada.',
  },
  {
    key: 'MAX_LTV_EXCELLENT_SCORE',
    value: '0.85',
    description: 'Relación préstamo/valor máxima cuando el score está en banda excelente.',
    source: 'Extrapolación razonada sobre el rango 80-83% reportado por bancos privados (no oficial).',
  },
  {
    key: 'DEFAULT_TERM_YEARS',
    value: '20',
    description: 'Plazo por defecto del crédito hipotecario simulado.',
    source: 'Primicias: bancos privados ofrecen plazos típicos de hasta 20-25 años.',
  },
  {
    key: 'SCORE_BAND_VERY_HIGH_RISK_MAX',
    value: '549',
    description: 'Límite superior de la banda de score "muy alto riesgo".',
    source: 'Banda propia, no oficial de ningún buró — ver spec sección 4.1.',
  },
  {
    key: 'SCORE_BAND_HIGH_RISK_MAX',
    value: '699',
    description: 'Límite superior de la banda de score "alto riesgo".',
    source: 'Banda propia, no oficial de ningún buró.',
  },
  {
    key: 'SCORE_BAND_MODERATE_MAX',
    value: '799',
    description: 'Límite superior de la banda de score "riesgo moderado".',
    source: 'Banda propia, no oficial de ningún buró.',
  },
  {
    key: 'SCORE_BAND_GOOD_MAX',
    value: '899',
    description: 'Límite superior de la banda de score "bueno"; calibrada sobre el promedio nacional real (862/999).',
    source: 'Extra.ec: promedio nacional de score en Ecuador 2024 = 862 (escala 1-999).',
  },
];

export async function seedRuleParameters(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(UnderwritingRuleParameter);

  for (const parameter of RULE_PARAMETERS) {
    const existing = await repository.findOne({ where: { key: parameter.key } });
    if (existing) {
      continue;
    }
    await repository.save(repository.create(parameter));
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnderwritingRuleParameter } from '../underwriting/entities/underwriting-rule-parameter.entity';
import { RuleParameters } from './interfaces/rule-parameters.interface';
import {
  SimulationInput,
  SimulationOutput,
} from './interfaces/simulation-result.interface';
import { calculateDti } from './calculators/dti.calculator';
import { calculateLtv } from './calculators/ltv.calculator';
import { calculateMonthlyPayment } from './calculators/amortization.calculator';
import {
  classifyScoreBand,
  ScoreBand,
} from './calculators/score-band.classifier';
import { calculateApprovalProbability } from './calculators/approval-probability.scorer';

@Injectable()
export class RulesEngineService {
  constructor(
    @InjectRepository(UnderwritingRuleParameter)
    private readonly ruleParameterRepository: Repository<UnderwritingRuleParameter>,
  ) {}

  async runSimulation(input: SimulationInput): Promise<SimulationOutput> {
    const params = await this.loadParameters();
    const scoreBand = classifyScoreBand(input.score, params);
    const isExcellentScoreBand = scoreBand === ScoreBand.EXCELLENT;

    const termYears = input.termYears ?? params.defaultTermYears;
    const annualRate = this.resolveInterestRate(input.isVisEligible, params);
    const monthlyPayment = calculateMonthlyPayment({
      loanAmount: input.loanAmount,
      annualInterestRate: annualRate,
      termYears,
    });

    const dtiResult = calculateDti(
      {
        existingMonthlyDebt: input.existingMonthlyDebt,
        newMonthlyPayment: monthlyPayment,
        monthlyIncome: input.monthlyIncome,
      },
      params,
    );

    const ltvResult = calculateLtv(
      {
        loanAmount: input.loanAmount,
        propertyValue: input.propertyValue,
        isExcellentScoreBand,
      },
      params,
    );

    const approvalResult = calculateApprovalProbability({
      scoreBand,
      passesHousingDti: dtiResult.passesHousingLimit,
      passesTotalDti: dtiResult.passesTotalLimit,
      passesLtv: ltvResult.passesLimit,
      incomeType: input.incomeType,
      monthsEmployed: input.monthsEmployed,
      recentDelinquency: input.recentDelinquency,
    });

    const qualifiesToday =
      dtiResult.passesHousingLimit &&
      dtiResult.passesTotalLimit &&
      ltvResult.passesLimit;

    return {
      scoreBand,
      housingDtiRatio: dtiResult.housingRatio,
      totalDtiRatio: dtiResult.totalRatio,
      passesHousingDti: dtiResult.passesHousingLimit,
      passesTotalDti: dtiResult.passesTotalLimit,
      ltv: ltvResult.ltv,
      passesLtv: ltvResult.passesLimit,
      monthlyPayment,
      approvalPercentage: approvalResult.percentage,
      approvalCategory: approvalResult.category,
      qualifiesToday,
      ruleSnapshot: this.toSnapshot(params),
    };
  }

  private resolveInterestRate(
    isVisEligible: boolean,
    params: RuleParameters,
  ): number {
    return isVisEligible
      ? params.visAnnualInterestRate
      : params.baseAnnualInterestRate;
  }

  private toSnapshot(params: RuleParameters): Record<string, number> {
    return { ...params };
  }

  private async loadParameters(): Promise<RuleParameters> {
    const rows = await this.ruleParameterRepository.find();
    const byKey = new Map(rows.map((row) => [row.key, Number(row.value)]));

    return {
      baseAnnualInterestRate: this.readRequired(
        byKey,
        'BASE_ANNUAL_INTEREST_RATE',
      ),
      visAnnualInterestRate: this.readRequired(
        byKey,
        'VIS_ANNUAL_INTEREST_RATE',
      ),
      visPropertyValueThreshold: this.readRequired(
        byKey,
        'VIS_PROPERTY_VALUE_THRESHOLD',
      ),
      maxHousingDtiRatio: this.readRequired(byKey, 'MAX_HOUSING_DTI_RATIO'),
      maxTotalDtiRatio: this.readRequired(byKey, 'MAX_TOTAL_DTI_RATIO'),
      maxLtvBase: this.readRequired(byKey, 'MAX_LTV_BASE'),
      maxLtvExcellentScore: this.readRequired(byKey, 'MAX_LTV_EXCELLENT_SCORE'),
      defaultTermYears: this.readRequired(byKey, 'DEFAULT_TERM_YEARS'),
      scoreBandVeryHighRiskMax: this.readRequired(
        byKey,
        'SCORE_BAND_VERY_HIGH_RISK_MAX',
      ),
      scoreBandHighRiskMax: this.readRequired(
        byKey,
        'SCORE_BAND_HIGH_RISK_MAX',
      ),
      scoreBandModerateMax: this.readRequired(byKey, 'SCORE_BAND_MODERATE_MAX'),
      scoreBandGoodMax: this.readRequired(byKey, 'SCORE_BAND_GOOD_MAX'),
    };
  }

  private readRequired(byKey: Map<string, number>, key: string): number {
    const value = byKey.get(key);
    if (value === undefined) {
      throw new Error(`Falta el parámetro de reglas requerido: ${key}`);
    }
    return value;
  }
}

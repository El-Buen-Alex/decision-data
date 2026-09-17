import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreditProfile, IncomeType } from '../../underwriting/entities/credit-profile.entity';
import { MortgageGoal, PropertyType } from '../../underwriting/entities/mortgage-goal.entity';

export async function seedSyntheticPersona(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const profileRepository = dataSource.getRepository(CreditProfile);
  const goalRepository = dataSource.getRepository(MortgageGoal);

  const existingUser = await userRepository.findOne({ where: { email: 'ana.demo@decisiondata.test' } });
  if (existingUser) {
    return;
  }

  const passwordHash = await bcrypt.hash('demo1234', 10);
  const user = await userRepository.save(
    userRepository.create({
      email: 'ana.demo@decisiondata.test',
      passwordHash,
      displayName: 'Ana (perfil demo)',
    }),
  );

  await profileRepository.save(
    profileRepository.create({
      userId: user.id,
      score: 640,
      cardUtilizationPercent: '78.00',
      monthlyIncome: '1200.00',
      incomeType: IncomeType.FORMAL,
      monthsEmployed: 18,
      recentDelinquency: false,
      existingMonthlyDebt: '310.00',
    }),
  );

  await goalRepository.save(
    goalRepository.create({
      userId: user.id,
      propertyValue: '85000.00',
      propertyType: PropertyType.VIS,
      desiredLoanAmount: '76500.00',
    }),
  );
}

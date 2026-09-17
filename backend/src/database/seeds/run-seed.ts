import 'dotenv/config';
import { AppDataSource } from '../data-source';
import { seedRuleParameters } from './rule-parameters.seed';
import { seedSyntheticPersona } from './synthetic-user.seed';

async function run(): Promise<void> {
  await AppDataSource.initialize();
  await seedRuleParameters(AppDataSource);
  await seedSyntheticPersona(AppDataSource);
  await AppDataSource.destroy();
}

run()
  .then(() => process.stdout.write('Seed completado.\n'))
  .catch((error) => {
    process.stderr.write(`Seed falló: ${String(error)}\n`);
    process.exit(1);
  });

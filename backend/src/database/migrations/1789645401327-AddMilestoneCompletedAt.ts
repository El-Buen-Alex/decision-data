import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMilestoneCompletedAt1789645401327 implements MigrationInterface {
  name = 'AddMilestoneCompletedAt1789645401327';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "milestones" ADD "completed_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "milestones" DROP COLUMN "completed_at"`);
  }
}

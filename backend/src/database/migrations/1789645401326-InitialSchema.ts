import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789645401326 implements MigrationInterface {
  name = 'InitialSchema1789645401326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "displayName" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."mortgage_goals_property_type_enum" AS ENUM('private', 'vis')`,
    );
    await queryRunner.query(
      `CREATE TABLE "mortgage_goals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "property_value" numeric(12,2) NOT NULL, "property_type" "public"."mortgage_goals_property_type_enum" NOT NULL, "desired_loan_amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d853835f8431bb2cee423fd25a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "underwriting_rule_parameters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "value" numeric(10,4) NOT NULL, "description" text NOT NULL, "source" text NOT NULL, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_996f6d0633fc1a26e57f32fd00d" UNIQUE ("key"), CONSTRAINT "PK_5dada5e0cec1b6f4b74335f1e1b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "simulations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "mortgage_goal_id" uuid NOT NULL, "inputs" jsonb NOT NULL, "outputs" jsonb NOT NULL, "rule_snapshot" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c6d15083257a1c84ecd67423c30" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."plans_status_enum" AS ENUM('active', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "simulation_id" uuid NOT NULL, "status" "public"."plans_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."milestones_status_enum" AS ENUM('pending', 'done')`,
    );
    await queryRunner.query(
      `CREATE TABLE "milestones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" uuid NOT NULL, "sequence_number" integer NOT NULL, "description" text, "target_metric" character varying NOT NULL, "target_value" numeric(10,2) NOT NULL, "target_date" date NOT NULL, "status" "public"."milestones_status_enum" NOT NULL DEFAULT 'pending', CONSTRAINT "PK_0bdbfe399c777a6a8520ff902d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."credit_profiles_income_type_enum" AS ENUM('formal', 'informal')`,
    );
    await queryRunner.query(
      `CREATE TABLE "credit_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "score" integer NOT NULL, "card_utilization_percent" numeric(5,2) NOT NULL, "monthly_income" numeric(12,2) NOT NULL, "income_type" "public"."credit_profiles_income_type_enum" NOT NULL, "months_employed" integer NOT NULL, "recent_delinquency" boolean NOT NULL DEFAULT false, "existing_monthly_debt" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_9947426778ca7b2e8bcd7138bc" UNIQUE ("user_id"), CONSTRAINT "PK_b0ef1ff6dd0a3450f24ea91982b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "endpoint" character varying NOT NULL, "context_sent" jsonb NOT NULL, "raw_response" text NOT NULL, "resolved_response" text NOT NULL, "validation_passed" boolean NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2cc52efab0f963454d7006a6981" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "mortgage_goals" ADD CONSTRAINT "FK_3a3b23027880985e40a41731395" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "simulations" ADD CONSTRAINT "FK_530c1c5e6ec7252a9a4ca93e266" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "simulations" ADD CONSTRAINT "FK_d60d4765194172ab7591c0ad16b" FOREIGN KEY ("mortgage_goal_id") REFERENCES "mortgage_goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ADD CONSTRAINT "FK_32f8c25a5ce0e33674e1253411e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ADD CONSTRAINT "FK_9c4ac8792fd05d8fa7f325cd25c" FOREIGN KEY ("simulation_id") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestones" ADD CONSTRAINT "FK_9dea51849ab531e87c9548c7624" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_profiles" ADD CONSTRAINT "FK_9947426778ca7b2e8bcd7138bc8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "credit_profiles" DROP CONSTRAINT "FK_9947426778ca7b2e8bcd7138bc8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestones" DROP CONSTRAINT "FK_9dea51849ab531e87c9548c7624"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP CONSTRAINT "FK_9c4ac8792fd05d8fa7f325cd25c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP CONSTRAINT "FK_32f8c25a5ce0e33674e1253411e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "simulations" DROP CONSTRAINT "FK_d60d4765194172ab7591c0ad16b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "simulations" DROP CONSTRAINT "FK_530c1c5e6ec7252a9a4ca93e266"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mortgage_goals" DROP CONSTRAINT "FK_3a3b23027880985e40a41731395"`,
    );
    await queryRunner.query(`DROP TABLE "agent_logs"`);
    await queryRunner.query(`DROP TABLE "credit_profiles"`);
    await queryRunner.query(
      `DROP TYPE "public"."credit_profiles_income_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "milestones"`);
    await queryRunner.query(`DROP TYPE "public"."milestones_status_enum"`);
    await queryRunner.query(`DROP TABLE "plans"`);
    await queryRunner.query(`DROP TYPE "public"."plans_status_enum"`);
    await queryRunner.query(`DROP TABLE "simulations"`);
    await queryRunner.query(`DROP TABLE "underwriting_rule_parameters"`);
    await queryRunner.query(`DROP TABLE "mortgage_goals"`);
    await queryRunner.query(
      `DROP TYPE "public"."mortgage_goals_property_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
  }
}

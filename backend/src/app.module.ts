import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env-validation.schema';
import { DatabaseModule } from './database/database.module';
import { RulesEngineModule } from './rules-engine/rules-engine.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    RulesEngineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

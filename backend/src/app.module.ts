import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env-validation.schema';
import { DatabaseModule } from './database/database.module';
import { RulesEngineModule } from './rules-engine/rules-engine.module';
import { UnderwritingModule } from './underwriting/underwriting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    RulesEngineModule,
    AuthModule,
    UnderwritingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

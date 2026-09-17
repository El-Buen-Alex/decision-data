import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UnderwritingService } from './underwriting.service';
import { PlanGeneratorService } from './plan-generator.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { UpdateRuleParameterDto } from './dto/update-rule-parameter.dto';
import { CreatePlanDto } from './dto/create-plan.dto';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard)
@Controller('underwriting')
export class UnderwritingController {
  constructor(
    private readonly underwritingService: UnderwritingService,
    private readonly planGeneratorService: PlanGeneratorService,
  ) {}

  @Get('profile')
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.underwritingService.getProfile(request.user.userId);
  }

  @Get('goal')
  getGoal(@Req() request: AuthenticatedRequest) {
    return this.underwritingService.getGoal(request.user.userId);
  }

  @Post('simulations')
  createSimulation(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSimulationDto,
  ) {
    return this.underwritingService.createSimulation(request.user.userId, dto);
  }

  @Get('simulations')
  listSimulations(@Req() request: AuthenticatedRequest) {
    return this.underwritingService.listSimulations(request.user.userId);
  }

  @Get('rule-parameters')
  listRuleParameters() {
    return this.underwritingService.listRuleParameters();
  }

  @Patch('rule-parameters/:key')
  updateRuleParameter(@Param('key') key: string, @Body() dto: UpdateRuleParameterDto) {
    return this.underwritingService.updateRuleParameter(key, dto.value);
  }

  @Post('plans')
  createPlan(@Req() request: AuthenticatedRequest, @Body() dto: CreatePlanDto) {
    return this.planGeneratorService.generateFromSimulation(request.user.userId, dto.simulationId);
  }

  @Get('plans/:id')
  getPlan(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.planGeneratorService.getPlanWithMilestones(request.user.userId, id);
  }

  @Post('plans/:id/check-in')
  checkIn(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CreateSimulationDto,
  ) {
    return this.planGeneratorService.checkIn(request.user.userId, id, dto);
  }
}

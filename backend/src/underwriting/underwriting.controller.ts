import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UnderwritingService } from './underwriting.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard)
@Controller('underwriting')
export class UnderwritingController {
  constructor(private readonly underwritingService: UnderwritingService) {}

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
}

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AgentService } from './agent.service';
import { AskAgentDto } from './dto/ask-agent.dto';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// Rate limiting for this controller comes from the module-level default configured in
// AgentModule (ThrottlerModule.forRootAsync, sourced from THROTTLE_TTL_SECONDS /
// THROTTLE_LIMIT env vars). No per-route @Throttle() override is needed here.
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('explain')
  explain(@Req() request: AuthenticatedRequest, @Body() dto: AskAgentDto) {
    return this.agentService.explainSimulation(request.user.userId, dto.simulationId);
  }
}

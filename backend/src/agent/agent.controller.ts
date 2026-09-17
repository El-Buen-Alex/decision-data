import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AgentService } from './agent.service';
import { AskAgentDto } from './dto/ask-agent.dto';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('explain')
  explain(@Req() request: AuthenticatedRequest, @Body() dto: AskAgentDto) {
    return this.agentService.explainSimulation(request.user.userId, dto.simulationId);
  }
}

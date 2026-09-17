import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmClientService } from './llm-client.service';
import { TemplateResolverService } from './template-resolver.service';
import { AgentContextBuilderService } from './agent-context-builder.service';
import { UnderwritingService } from '../underwriting/underwriting.service';
import { AgentLog } from './entities/agent-log.entity';

export interface AgentReply {
  text: string;
}

const EXPLAIN_SYSTEM_PROMPT =
  'Eres un asesor financiero que solo explica resultados ya calculados. ' +
  'Nunca inventes cifras: usa exclusivamente placeholders {{clave}} para cualquier número. ' +
  'Responde en español, en un tono claro y empático, en máximo 4 frases.';

@Injectable()
export class AgentService {
  constructor(
    private readonly llmClientService: LlmClientService,
    private readonly templateResolverService: TemplateResolverService,
    private readonly agentContextBuilderService: AgentContextBuilderService,
    private readonly underwritingService: UnderwritingService,
    @InjectRepository(AgentLog)
    private readonly agentLogRepository: Repository<AgentLog>,
  ) {}

  async explainSimulation(userId: string, simulationId: string): Promise<AgentReply> {
    const simulation = await this.underwritingService.getSimulationById(userId, simulationId);
    const profile = await this.underwritingService.getProfile(userId);
    const context = this.agentContextBuilderService.buildFromSimulation(simulation, profile.score);

    const rawTemplate = await this.llmClientService.generateTemplate(
      EXPLAIN_SYSTEM_PROMPT,
      `Explica este resultado de simulación hipotecaria: ${JSON.stringify(context)}`,
    );

    const resolved = this.templateResolverService.resolve(rawTemplate, context as unknown as Record<string, string | number>);

    await this.agentLogRepository.save(
      this.agentLogRepository.create({
        userId,
        endpoint: 'explain',
        contextSent: context as unknown as Record<string, unknown>,
        rawResponse: rawTemplate,
        resolvedResponse: resolved.text,
        validationPassed: resolved.isValid,
      }),
    );

    return { text: resolved.text };
  }
}

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
  'Nunca inventes cifras: usa exclusivamente placeholders {{clave}} para cualquier número, porcentaje o cifra. ' +
  'Jamás escribas un dígito literal en tu respuesta fuera de un placeholder {{clave}}: toda cifra debe venir ' +
  'únicamente de las claves de contexto proporcionadas, sin excepción alguna. ' +
  'Responde en español, en un tono claro y empático, en máximo 4 frases.';

const FALLBACK_MESSAGE =
  'No se pudo generar una explicación en este momento. Por favor consulta los números en el panel de diagnóstico.';

// Empareja bloques {{...}} completos para poder descartarlos antes de buscar dígitos sueltos.
const PLACEHOLDER_BLOCK_PATTERN = /\{\{[^}]*\}\}/g;

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
    const context = this.agentContextBuilderService.buildFromSimulation(simulation, simulation.score);

    const rawTemplate = await this.llmClientService.generateTemplate(
      EXPLAIN_SYSTEM_PROMPT,
      `Explica este resultado de simulación hipotecaria: ${JSON.stringify(context)}`,
    );

    if (this.containsStrayDigits(rawTemplate)) {
      await this.agentLogRepository.save(
        this.agentLogRepository.create({
          userId,
          endpoint: 'explain',
          contextSent: context as unknown as Record<string, unknown>,
          rawResponse: rawTemplate,
          resolvedResponse: FALLBACK_MESSAGE,
          validationPassed: false,
        }),
      );

      return { text: FALLBACK_MESSAGE };
    }

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

  // Detecta un dígito literal que el LLM haya escrito fuera de un placeholder {{clave}}.
  // El resolver de plantillas solo valida claves desconocidas; esto cierra el hueco por el
  // que una cifra inventada (p. ej. "tu score es 700") pasaría sin ser detectada.
  private containsStrayDigits(template: string): boolean {
    const withoutPlaceholders = template.replace(PLACEHOLDER_BLOCK_PATTERN, '');
    return /\d/.test(withoutPlaceholders);
  }
}

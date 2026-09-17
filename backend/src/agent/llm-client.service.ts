import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class LlmClientService {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({ apiKey: this.configService.getOrThrow<string>('ANTHROPIC_API_KEY') });
    this.model = this.configService.getOrThrow<string>('AGENT_MODEL');
  }

  async generateTemplate(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const firstBlock = response.content[0];
    return firstBlock.type === 'text' ? firstBlock.text : '';
  }
}

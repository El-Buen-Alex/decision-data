import { ConfigService } from '@nestjs/config';
import { LlmClientService } from './llm-client.service';

describe('LlmClientService', () => {
  function buildService(createMock: jest.Mock): LlmClientService {
    const configService = {
      getOrThrow: (key: string) => (key === 'ANTHROPIC_API_KEY' ? 'sk-ant-test' : 'claude-sonnet-5'),
    } as unknown as ConfigService;

    const service = new LlmClientService(configService);
    (service as unknown as { client: { messages: { create: jest.Mock } } }).client = {
      messages: { create: createMock },
    };
    return service;
  }

  it('returns the text block when it is the only content block', async () => {
    const createMock = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Hola, esta es tu explicación.' }],
    });
    const service = buildService(createMock);

    const result = await service.generateTemplate('system', 'user');

    expect(result).toBe('Hola, esta es tu explicación.');
  });

  it('finds the text block when it is preceded by a thinking block', async () => {
    const createMock = jest.fn().mockResolvedValue({
      content: [
        { type: 'thinking', thinking: '', signature: 'abc' },
        { type: 'text', text: 'Tu score es {{score}}.' },
      ],
    });
    const service = buildService(createMock);

    const result = await service.generateTemplate('system', 'user');

    expect(result).toBe('Tu score es {{score}}.');
  });

  it('returns an empty string when no text block is present', async () => {
    const createMock = jest.fn().mockResolvedValue({
      content: [{ type: 'thinking', thinking: '', signature: 'abc' }],
    });
    const service = buildService(createMock);

    const result = await service.generateTemplate('system', 'user');

    expect(result).toBe('');
  });
});

import { apiRequest } from './api-client';
import { ApiError } from './api-error';

describe('apiRequest', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns data when status is success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', message: 'OK', data: { score: 640 } }),
    }) as unknown as typeof fetch;

    const result = await apiRequest<{ score: number }>('/underwriting/profile');

    expect(result.score).toBe(640);
  });

  it('throws ApiError when status is error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ status: 'error', message: 'No existe el perfil.', data: null }),
    }) as unknown as typeof fetch;

    await expect(apiRequest('/underwriting/profile')).rejects.toThrow(ApiError);
  });
});

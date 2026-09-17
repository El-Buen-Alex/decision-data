import { apiRequest } from './api-client';

interface LoginResult {
  accessToken: string;
}

export async function loginRequest(email: string, password: string): Promise<string> {
  const result = await apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return result.accessToken;
}

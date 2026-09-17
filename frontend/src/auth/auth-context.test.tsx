import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from './auth-context';
import { useAuth } from './use-auth';

jest.mock('../api/auth-api', () => ({
  loginRequest: jest.fn().mockResolvedValue('fake-token'),
}));

function Probe(): JSX.Element {
  const { token, login } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={() => login('ana.demo@decisiondata.test', 'demo1234')}>Entrar</button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('stores the token after a successful login', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('token')).toHaveTextContent('none');
    await userEvent.click(screen.getByText('Entrar'));

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('fake-token'));
  });
});

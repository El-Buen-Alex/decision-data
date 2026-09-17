import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleParameterRow } from './rule-parameter-row';
import { ApiError } from '@/api/api-error';

const parameter = { id: '1', key: 'MAX_HOUSING_DTI_RATIO', value: '0.40', description: 'DTI máximo', source: 'Primicias' };

describe('RuleParameterRow', () => {
  it('calls onSave with the parsed numeric value when the form is submitted', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(<RuleParameterRow parameter={parameter} onSave={onSave} />);

    const input = screen.getByLabelText('Valor de MAX_HOUSING_DTI_RATIO');
    await userEvent.clear(input);
    await userEvent.type(input, '0.35');
    await userEvent.click(screen.getByText('Guardar'));

    expect(onSave).toHaveBeenCalledWith('MAX_HOUSING_DTI_RATIO', 0.35);
  });

  it('shows a visible error and keeps the edited value when onSave rejects', async () => {
    const onSave = jest.fn().mockRejectedValue(new ApiError('El valor debe ser mayor a 0.0001.', 400));
    render(<RuleParameterRow parameter={parameter} onSave={onSave} />);

    const input = screen.getByLabelText('Valor de MAX_HOUSING_DTI_RATIO');
    await userEvent.clear(input);
    await userEvent.type(input, '0.35');
    await userEvent.click(screen.getByText('Guardar'));

    expect(await screen.findByRole('alert')).toHaveTextContent('El valor debe ser mayor a 0.0001.');
    expect(screen.getByLabelText('Valor de MAX_HOUSING_DTI_RATIO')).toHaveValue('0.35');
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  it('rejects a non-numeric value without calling onSave', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(<RuleParameterRow parameter={parameter} onSave={onSave} />);

    const input = screen.getByLabelText('Valor de MAX_HOUSING_DTI_RATIO');
    await userEvent.clear(input);
    await userEvent.type(input, 'abc');
    await userEvent.click(screen.getByText('Guardar'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa un número válido.');
    expect(onSave).not.toHaveBeenCalled();
  });
});

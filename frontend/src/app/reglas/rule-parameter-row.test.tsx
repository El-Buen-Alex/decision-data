import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleParameterRow } from './rule-parameter-row';

describe('RuleParameterRow', () => {
  it('calls onSave with the parsed numeric value when the form is submitted', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(
      <RuleParameterRow
        parameter={{ id: '1', key: 'MAX_HOUSING_DTI_RATIO', value: '0.40', description: 'DTI máximo', source: 'Primicias' }}
        onSave={onSave}
      />,
    );

    const input = screen.getByLabelText('Valor de MAX_HOUSING_DTI_RATIO');
    await userEvent.clear(input);
    await userEvent.type(input, '0.35');
    await userEvent.click(screen.getByText('Guardar'));

    expect(onSave).toHaveBeenCalledWith('MAX_HOUSING_DTI_RATIO', 0.35);
  });
});

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RuleParameter } from '@/api/types';
import { ApiError } from '@/api/api-error';

interface RuleParameterRowProps {
  parameter: RuleParameter;
  onSave: (key: string, value: number) => Promise<void>;
}

export function RuleParameterRow({ parameter, onSave }: RuleParameterRowProps): JSX.Element {
  const [value, setValue] = useState(parameter.value);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setErrorMessage(null);

    const trimmedValue = value.trim();
    const parsedValue = Number(trimmedValue);
    if (trimmedValue === '' || Number.isNaN(parsedValue)) {
      setErrorMessage('Ingresa un número válido.');
      return;
    }
    if (parsedValue <= 0) {
      setErrorMessage('El valor debe ser mayor a cero.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(parameter.key, parsedValue);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo guardar el parámetro.';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="border-b border-border py-3">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
        <div>
          <p className="font-medium">{parameter.key}</p>
          <p className="text-sm text-fg-2">{parameter.description}</p>
          <p className="text-xs text-muted-foreground">Fuente: {parameter.source}</p>
        </div>

        <label htmlFor={`value-${parameter.key}`} className="sr-only">
          Valor de {parameter.key}
        </label>
        <Input
          id={`value-${parameter.key}`}
          aria-label={`Valor de ${parameter.key}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28"
        />

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-2 text-sm text-negative">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

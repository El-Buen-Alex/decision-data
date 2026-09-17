import { Milestone } from '@/api/types';
import { formatLongDate, formatPercent } from '@/lib/format';

/**
 * El backend todavía guarda `description: null` en cada hito (el texto redactado
 * por el agente llegará con un endpoint futuro), así que en la práctica siempre
 * se usa esta traducción de la métrica interna a una frase legible.
 */
function describeMilestone(milestone: Milestone): string {
  const targetRatio = Number(milestone.targetValue);
  const formattedRatio = formatPercent(targetRatio);

  switch (milestone.targetMetric) {
    case 'housing_dti_ratio':
      return `Baja tu cuota a un máximo del ${formattedRatio} de tu ingreso mensual.`;
    case 'ltv':
      return `Reduce tu financiamiento a un máximo del ${formattedRatio} del valor del inmueble.`;
    case 'qualifies_today':
      return 'Alcanza el punto en el que calificarías para el crédito.';
    default:
      return `Alcanza la meta de ${milestone.targetMetric}: ${milestone.targetValue}.`;
  }
}

export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }): JSX.Element {
  return (
    <ol className="roadmap-path flex flex-col gap-6 pl-10" aria-label="Hitos del plan">
      {milestones.map((milestone) => {
        const description = milestone.description ?? describeMilestone(milestone);
        const formattedDate = formatLongDate(milestone.targetDate);

        return (
          <li key={milestone.id} className="rounded-lg bg-surface p-4">
            <p className="text-sm text-fg-2">
              Hito {milestone.sequenceNumber} · {formattedDate}
            </p>
            <p className="mt-1">{description}</p>
          </li>
        );
      })}
    </ol>
  );
}

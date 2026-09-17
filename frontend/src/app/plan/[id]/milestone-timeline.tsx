import { Milestone } from '@/api/types';

export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }): JSX.Element {
  return (
    <ol className="roadmap-path flex flex-col gap-6 pl-10" aria-label="Hitos del plan">
      {milestones.map((milestone) => (
        <li key={milestone.id} className="rounded-lg bg-surface p-4">
          <p className="text-sm text-fg-2">Hito {milestone.sequenceNumber} · {milestone.targetDate}</p>
          <p className="mt-1">{milestone.description ?? `Meta: ${milestone.targetMetric} = ${milestone.targetValue}`}</p>
        </li>
      ))}
    </ol>
  );
}

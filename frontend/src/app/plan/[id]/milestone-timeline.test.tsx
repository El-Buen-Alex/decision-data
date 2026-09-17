import { render, screen } from '@testing-library/react';
import { MilestoneTimeline } from './milestone-timeline';
import { Milestone } from '@/api/types';

// `description: null` refleja lo que el backend genera hoy para todos los hitos.
const milestones: Milestone[] = [
  {
    id: 'm1',
    sequenceNumber: 1,
    description: null,
    targetMetric: 'housing_dti_ratio',
    targetValue: '0.40',
    targetDate: '2026-11-16',
    status: 'pending',
    completedAt: null,
  },
  {
    id: 'm2',
    sequenceNumber: 2,
    description: null,
    targetMetric: 'ltv',
    targetValue: '0.80',
    targetDate: '2027-02-16',
    status: 'pending',
    completedAt: null,
  },
  {
    id: 'm3',
    sequenceNumber: 3,
    description: null,
    targetMetric: 'qualifies_today',
    targetValue: '1.00',
    targetDate: '2027-05-16',
    status: 'pending',
    completedAt: null,
  },
];

describe('MilestoneTimeline', () => {
  it('describes each milestone in Spanish instead of showing the raw metric key', () => {
    render(<MilestoneTimeline milestones={milestones} />);

    expect(screen.getByText('Baja tu cuota a un máximo del 40% de tu ingreso mensual.')).toBeInTheDocument();
    expect(
      screen.getByText('Reduce tu financiamiento a un máximo del 80% del valor del inmueble.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Alcanza el punto en el que calificarías para el crédito.')).toBeInTheDocument();
    expect(screen.queryByText(/housing_dti_ratio/)).not.toBeInTheDocument();
  });

  it('renders each milestone with its sequence number and a readable target date', () => {
    render(<MilestoneTimeline milestones={milestones} />);

    expect(screen.getByText(/Hito 1 · 16 de noviembre de 2026/)).toBeInTheDocument();
  });

  it('shows a pending milestone as not yet achieved', () => {
    render(<MilestoneTimeline milestones={milestones} />);

    expect(screen.getAllByText('Pendiente')).toHaveLength(3);
  });

  it('shows a done milestone with the real date it was achieved instead of the target date', () => {
    const doneMilestones: Milestone[] = [
      { ...milestones[0], status: 'done', completedAt: '2026-10-01' },
    ];
    render(<MilestoneTimeline milestones={doneMilestones} />);

    expect(screen.getByText('Cumplido · 1 de octubre de 2026')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });
});

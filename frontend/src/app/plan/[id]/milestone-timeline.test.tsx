import { render, screen } from '@testing-library/react';
import { MilestoneTimeline } from './milestone-timeline';
import { Milestone } from '@/api/types';

const milestones: Milestone[] = [
  {
    id: 'm1',
    sequenceNumber: 1,
    description: 'Baja tu DTI a 40%.',
    targetMetric: 'housing_dti_ratio',
    targetValue: '0.40',
    targetDate: '2026-11-16',
    status: 'pending',
  },
];

describe('MilestoneTimeline', () => {
  it('renders each milestone with its sequence number and target date', () => {
    render(<MilestoneTimeline milestones={milestones} />);

    expect(screen.getByText('Baja tu DTI a 40%.')).toBeInTheDocument();
    expect(screen.getByText(/2026-11-16/)).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';

interface MockGoal {
  id: number;
  title: string;
  deadline?: string;
}

interface MockProgress {
  goal: MockGoal;
  percent: number;
}

function calculateGoalDeadlineUrgency(
  goals: MockGoal[],
  progress: MockProgress[],
  todayStr: string
): { goal: MockGoal; level: string; days: number }[] {
  return goals
    .map(goal => {
      const goalProgress = progress.find(g => g.goal.id === goal.id);
      if (!goal.deadline || goalProgress?.percent === 100) return null;
      const daysUntil = Math.ceil(
        (new Date(goal.deadline + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysUntil < 0) return { goal, level: 'overdue', days: Math.abs(daysUntil) };
      if (daysUntil <= 3) return { goal, level: 'urgent', days: daysUntil };
      if (daysUntil <= 7) return { goal, level: 'warning', days: daysUntil };
      return null;
    })
    .filter(Boolean) as { goal: MockGoal; level: string; days: number }[];
}

describe('Goal Deadline Urgency', () => {
  it('should flag overdue goals', () => {
    const goals: MockGoal[] = [{ id: 1, title: 'G1', deadline: '2026-05-01' }];
    const progress: MockProgress[] = [{ goal: goals[0], percent: 50 }];
    const result = calculateGoalDeadlineUrgency(goals, progress, '2026-05-10');
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('overdue');
    expect(result[0].days).toBe(9);
  });

  it('should flag urgent goals (<=3 days)', () => {
    const goals: MockGoal[] = [{ id: 1, title: 'G1', deadline: '2026-05-12' }];
    const progress: MockProgress[] = [{ goal: goals[0], percent: 50 }];
    const result = calculateGoalDeadlineUrgency(goals, progress, '2026-05-10');
    expect(result[0].level).toBe('urgent');
    expect(result[0].days).toBe(2);
  });

  it('should flag warning goals (<=7 days)', () => {
    const goals: MockGoal[] = [{ id: 1, title: 'G1', deadline: '2026-05-16' }];
    const progress: MockProgress[] = [{ goal: goals[0], percent: 50 }];
    const result = calculateGoalDeadlineUrgency(goals, progress, '2026-05-10');
    expect(result[0].level).toBe('warning');
    expect(result[0].days).toBe(6);
  });

  it('should ignore goals with no deadline', () => {
    const goals: MockGoal[] = [{ id: 1, title: 'G1' }];
    const progress: MockProgress[] = [{ goal: goals[0], percent: 50 }];
    const result = calculateGoalDeadlineUrgency(goals, progress, '2026-05-10');
    expect(result).toHaveLength(0);
  });

  it('should ignore completed goals', () => {
    const goals: MockGoal[] = [{ id: 1, title: 'G1', deadline: '2026-05-12' }];
    const progress: MockProgress[] = [{ goal: goals[0], percent: 100 }];
    const result = calculateGoalDeadlineUrgency(goals, progress, '2026-05-10');
    expect(result).toHaveLength(0);
  });

  it('should ignore goals far in future', () => {
    const goals: MockGoal[] = [{ id: 1, title: 'G1', deadline: '2026-06-01' }];
    const progress: MockProgress[] = [{ goal: goals[0], percent: 50 }];
    const result = calculateGoalDeadlineUrgency(goals, progress, '2026-05-10');
    expect(result).toHaveLength(0);
  });

  it('should handle goals due today as urgent', () => {
    const goals: MockGoal[] = [{ id: 1, title: 'G1', deadline: '2026-05-10' }];
    const progress: MockProgress[] = [{ goal: goals[0], percent: 50 }];
    const result = calculateGoalDeadlineUrgency(goals, progress, '2026-05-10');
    expect(result[0].level).toBe('urgent');
    expect(result[0].days).toBe(0);
  });

  it('should handle multiple goals with mixed urgency', () => {
    const goals: MockGoal[] = [
      { id: 1, title: 'G1', deadline: '2026-05-08' },
      { id: 2, title: 'G2', deadline: '2026-05-12' },
      { id: 3, title: 'G3', deadline: '2026-05-20' },
    ];
    const progress: MockProgress[] = goals.map(g => ({ goal: g, percent: 50 }));
    const result = calculateGoalDeadlineUrgency(goals, progress, '2026-05-10');
    expect(result).toHaveLength(2);
    expect(result[0].level).toBe('overdue');
    expect(result[1].level).toBe('urgent');
  });
});

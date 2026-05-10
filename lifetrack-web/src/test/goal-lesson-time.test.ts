import { describe, it, expect } from 'vitest';

interface MockLesson {
  taskId?: number;
  durationMinutes: number;
  completedDates?: string[];
}

interface MockTask {
  id: number;
  goalId?: number;
}

function calculateGoalLessonMinutes(
  tasks: MockTask[],
  lessons: MockLesson[],
  goalId: number
): { total: number; completed: number } {
  const relatedTasks = tasks.filter(t => t.goalId === goalId);
  const relatedLessons = lessons.filter(l => l.taskId && relatedTasks.some(t => t.id === l.taskId));
  const total = relatedLessons.reduce((s, l) => s + l.durationMinutes, 0);
  const completed = relatedLessons
    .filter(l => l.completedDates && l.completedDates.length > 0)
    .reduce((s, l) => s + l.durationMinutes * (l.completedDates?.length || 0), 0);
  return { total, completed };
}

describe('Goal Lesson Time Calculation', () => {
  it('should return zero when no lessons match', () => {
    const tasks: MockTask[] = [{ id: 1, goalId: 1 }];
    const lessons: MockLesson[] = [];
    const result = calculateGoalLessonMinutes(tasks, lessons, 1);
    expect(result).toEqual({ total: 0, completed: 0 });
  });

  it('should calculate total minutes for matching lessons', () => {
    const tasks: MockTask[] = [{ id: 1, goalId: 1 }];
    const lessons: MockLesson[] = [
      { taskId: 1, durationMinutes: 60 },
      { taskId: 1, durationMinutes: 45 },
    ];
    const result = calculateGoalLessonMinutes(tasks, lessons, 1);
    expect(result.total).toBe(105);
    expect(result.completed).toBe(0);
  });

  it('should not include lessons from other goals', () => {
    const tasks: MockTask[] = [
      { id: 1, goalId: 1 },
      { id: 2, goalId: 2 },
    ];
    const lessons: MockLesson[] = [
      { taskId: 1, durationMinutes: 60 },
      { taskId: 2, durationMinutes: 90 },
    ];
    const result = calculateGoalLessonMinutes(tasks, lessons, 1);
    expect(result.total).toBe(60);
  });

  it('should calculate completed minutes with multiple completed dates', () => {
    const tasks: MockTask[] = [{ id: 1, goalId: 1 }];
    const lessons: MockLesson[] = [
      { taskId: 1, durationMinutes: 60, completedDates: ['2026-05-01', '2026-05-02'] },
    ];
    const result = calculateGoalLessonMinutes(tasks, lessons, 1);
    expect(result.total).toBe(60);
    expect(result.completed).toBe(120);
  });

  it('should handle lessons without taskId', () => {
    const tasks: MockTask[] = [{ id: 1, goalId: 1 }];
    const lessons: MockLesson[] = [
      { durationMinutes: 60 },
      { taskId: 1, durationMinutes: 45 },
    ];
    const result = calculateGoalLessonMinutes(tasks, lessons, 1);
    expect(result.total).toBe(45);
  });

  it('should handle tasks without goalId', () => {
    const tasks: MockTask[] = [{ id: 1 }];
    const lessons: MockLesson[] = [
      { taskId: 1, durationMinutes: 60 },
    ];
    const result = calculateGoalLessonMinutes(tasks, lessons, 1);
    expect(result.total).toBe(0);
  });

  it('should handle multiple tasks for same goal', () => {
    const tasks: MockTask[] = [
      { id: 1, goalId: 1 },
      { id: 2, goalId: 1 },
    ];
    const lessons: MockLesson[] = [
      { taskId: 1, durationMinutes: 60 },
      { taskId: 2, durationMinutes: 45 },
    ];
    const result = calculateGoalLessonMinutes(tasks, lessons, 1);
    expect(result.total).toBe(105);
  });
});

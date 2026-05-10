import { describe, it, expect } from 'vitest';

interface TaskLike {
  scheduledDayOfWeek?: number;
  scheduledStartHour?: number;
  scheduledStartMinute?: number;
  scheduledDurationMinutes?: number;
  status: string;
  title: string;
}

function isScheduledOnDay(task: TaskLike, dayIdx: number): boolean {
  return task.scheduledDayOfWeek === dayIdx &&
    task.scheduledStartHour !== undefined &&
    task.scheduledStartMinute !== undefined &&
    task.scheduledDurationMinutes !== undefined;
}

function getScheduleStyle(task: TaskLike, startHour: number, slotHeight: number) {
  const startMin = task.scheduledStartHour! * 60 + task.scheduledStartMinute!;
  const top = (startMin - startHour * 60) / 60 * slotHeight;
  const height = (task.scheduledDurationMinutes! / 60) * slotHeight;
  return { top, height };
}

describe('Task Schedule Integration', () => {
  it('should identify task scheduled on matching day', () => {
    const task: TaskLike = {
      scheduledDayOfWeek: 1,
      scheduledStartHour: 9,
      scheduledStartMinute: 0,
      scheduledDurationMinutes: 60,
      status: 'todo',
      title: 'Math',
    };
    expect(isScheduledOnDay(task, 1)).toBe(true);
    expect(isScheduledOnDay(task, 2)).toBe(false);
  });

  it('should reject task missing schedule fields', () => {
    const task: TaskLike = {
      scheduledDayOfWeek: 1,
      status: 'todo',
      title: 'Math',
    };
    expect(isScheduledOnDay(task, 1)).toBe(false);
  });

  it('should calculate correct schedule position', () => {
    const task: TaskLike = {
      scheduledDayOfWeek: 1,
      scheduledStartHour: 9,
      scheduledStartMinute: 30,
      scheduledDurationMinutes: 90,
      status: 'todo',
      title: 'Math',
    };
    const style = getScheduleStyle(task, 7, 48);
    expect(style.top).toBe(120); // (570 - 420) / 60 * 48 = 150/60*48=120
    expect(style.height).toBe(72); // 90/60 * 48 = 72
  });

  it('should handle task at start of day', () => {
    const task: TaskLike = {
      scheduledDayOfWeek: 0,
      scheduledStartHour: 7,
      scheduledStartMinute: 0,
      scheduledDurationMinutes: 60,
      status: 'todo',
      title: 'Early',
    };
    const style = getScheduleStyle(task, 7, 48);
    expect(style.top).toBe(0);
    expect(style.height).toBe(48);
  });

  it('should handle done task still scheduled', () => {
    const task: TaskLike = {
      scheduledDayOfWeek: 1,
      scheduledStartHour: 10,
      scheduledStartMinute: 0,
      scheduledDurationMinutes: 60,
      status: 'done',
      title: 'Done',
    };
    expect(isScheduledOnDay(task, 1)).toBe(true);
  });

  it('should reject unscheduled task', () => {
    const task: TaskLike = {
      status: 'todo',
      title: 'Free',
    };
    expect(isScheduledOnDay(task, 1)).toBe(false);
  });
});

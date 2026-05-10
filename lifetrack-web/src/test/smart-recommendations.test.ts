import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '../utils/recommendations';
import type { Goal, Task, Lesson, Habit, HabitLog, SleepRecord, FocusSession, MoodEntry } from '../db';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('Smart Recommendations', () => {
  it('should recommend focus when no recent sessions', () => {
    const recs = generateRecommendations([], [], [], [], [], [], [], []);
    const focusRec = recs.find(r => r.type === 'focus');
    expect(focusRec).toBeDefined();
    expect(focusRec?.priority).toBe('high');
  });

  it('should not recommend focus when recent sessions exist', () => {
    const today = todayStr();
    const focus: FocusSession[] = [{ date: today, durationMinutes: 25 }];
    const recs = generateRecommendations([], [], [], [], [], [], focus, []);
    const focusRec = recs.find(r => r.type === 'focus');
    expect(focusRec).toBeUndefined();
  });

  it('should recommend adding tasks for low-progress goal', () => {
    const goals: Goal[] = [{ id: 1, title: '英语', description: '', color: '#4A6FA5', createdAt: '' }];
    const tasks: Task[] = [{ goalId: 1, title: '背单词', status: 'todo', priority: 1, scheduleType: 'single', createdAt: '', color: '#4A6FA5', isRecurring: false }];
    const recs = generateRecommendations(goals, tasks, [], [], [], [], [], []);
    const goalRec = recs.find(r => r.type === 'goal');
    expect(goalRec).toBeDefined();
    expect(goalRec?.priority).toBe('high');
  });

  it('should recommend new goal for near-complete goal', () => {
    const goals: Goal[] = [{ id: 1, title: '英语', description: '', color: '#4A6FA5', createdAt: '' }];
    const tasks: Task[] = [
      { goalId: 1, title: 'A', status: 'done', priority: 1, scheduleType: 'single', createdAt: '', color: '#4A6FA5', isRecurring: false },
      { goalId: 1, title: 'B', status: 'done', priority: 1, scheduleType: 'single', createdAt: '', color: '#4A6FA5', isRecurring: false },
      { goalId: 1, title: 'C', status: 'done', priority: 1, scheduleType: 'single', createdAt: '', color: '#4A6FA5', isRecurring: false },
      { goalId: 1, title: 'D', status: 'done', priority: 1, scheduleType: 'single', createdAt: '', color: '#4A6FA5', isRecurring: false },
      { goalId: 1, title: 'E', status: 'todo', priority: 1, scheduleType: 'single', createdAt: '', color: '#4A6FA5', isRecurring: false },
    ];
    const recs = generateRecommendations(goals, tasks, [], [], [], [], [], []);
    const goalRec = recs.find(r => r.type === 'goal');
    expect(goalRec).toBeDefined();
    expect(goalRec?.title).toContain('即将完成');
  });

  it('should recommend sleep when no recent records', () => {
    const recs = generateRecommendations([], [], [], [], [], [], [], []);
    const sleepRec = recs.find(r => r.type === 'sleep');
    expect(sleepRec).toBeDefined();
  });

  it('should not recommend sleep when recent records exist', () => {
    const today = todayStr();
    const sleep: SleepRecord[] = [{ date: today, bedTime: '23:00', wakeTime: '07:00', quality: 4 }];
    const recs = generateRecommendations([], [], [], [], [], sleep, [], []);
    const sleepRec = recs.find(r => r.type === 'sleep');
    expect(sleepRec).toBeUndefined();
  });

  it('should recommend mood when no recent entries', () => {
    const recs = generateRecommendations([], [], [], [], [], [], [], []);
    const moodRec = recs.find(r => r.type === 'mood');
    expect(moodRec).toBeDefined();
  });

  it('should sort by priority (high first)', () => {
    const recs = generateRecommendations([], [], [], [], [], [], [], []);
    const priorities = recs.map(r => r.priority);
    expect(priorities[0]).toBe('high');
  });

  it('should limit to 5 recommendations', () => {
    const goals: Goal[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, title: `Goal ${i}`, description: '', color: '#4A6FA5', createdAt: ''
    }));
    const tasks: Task[] = goals.map(g => ({
      goalId: g.id, title: 'Task', status: 'todo', priority: 1, scheduleType: 'single', createdAt: '', color: '#4A6FA5', isRecurring: false
    }));
    const recs = generateRecommendations(goals, tasks, [], [], [], [], [], []);
    expect(recs.length).toBeLessThanOrEqual(5);
  });
});

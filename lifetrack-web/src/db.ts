import Dexie, { type Table } from 'dexie';

// ========== 类型定义 ==========

export interface Goal {
  id?: number;
  title: string;
  description: string;
  createdAt: string; // ISO date
  deadline?: string; // optional ISO date
  color: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskScheduleType = 'single' | 'recurring';

export interface Task {
  id?: number;
  goalId?: number;
  title: string;
  status: TaskStatus;
  priority: number; // 1-3
  scheduleType: TaskScheduleType;
  createdAt: string;
  completedAt?: string;
  color: string; // task color
  isRecurring: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Lesson {
  id?: number;
  taskId?: number;
  title: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  color: string;
  location?: string;
  isRecurring: boolean;
  startDate?: string; // for recurring lessons
  endDate?: string;   // for recurring lessons
  date?: string;      // for non-recurring lessons: the specific date it occurs
}

export interface SleepRecord {
  id?: number;
  date: string; // ISO date
  bedTime: string; // HH:MM
  wakeTime: string; // HH:MM
  quality: number; // 1-5
  note?: string;
}

// NEW v4 schemas
export interface Habit {
  id?: number;
  name: string;
  color: string;
  icon: string; // emoji
  createdAt: string;
}

export interface HabitLog {
  id?: number;
  habitId: number;
  date: string; // ISO local date, e.g. "2026-05-05"
}

export interface MoodEntry {
  id?: number;
  date: string;
  emoji: string;
  note: string;
}

export interface FocusSession {
  id?: number;
  date: string;
  lessonId?: number;
  durationMinutes: number;
}

export interface BadgeUnlock {
  id?: number;
  badgeId: string;
  unlockedAt: string;
}

// ========== 工具函数 ==========

/** Format a Date as YYYY-MM-DD in LOCAL timezone (not UTC!) */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Get today's date string in local timezone */
export function todayLocal(): string {
  return formatLocalDate(new Date());
}

// ========== 数据库 ==========

export class LifeTrackDB extends Dexie {
  goals!: Table<Goal>;
  tasks!: Table<Task>;
  lessons!: Table<Lesson>;
  sleepRecords!: Table<SleepRecord>;
  habits!: Table<Habit>;
  habitLogs!: Table<HabitLog>;
  moodEntries!: Table<MoodEntry>;
  focusSessions!: Table<FocusSession>;
  badgeUnlocks!: Table<BadgeUnlock>;

  constructor() {
    super('LifeTrackDB');
    this.version(5).stores({
      goals: '++id, createdAt',
      tasks: '++id, goalId, status, createdAt',
      lessons: '++id, dayOfWeek, taskId',
      sleepRecords: '++id, date',
      habits: '++id, createdAt',
      habitLogs: '++id, habitId, date',
      moodEntries: '++id, date',
      focusSessions: '++id, date',
      badgeUnlocks: '++id, badgeId',
    });
  }
}

export const db = new LifeTrackDB();

// ========== 辅助函数 ==========

let seeded = false;

export async function seedData() {
  if (seeded) return;
  seeded = true;

  // Migrate old lessons that lack `isRecurring` (from v2/v3 schema)
  const allLessons = await db.lessons.toArray();
  for (const lesson of allLessons) {
    if ((lesson as any).isRecurring === undefined) {
      await db.lessons.update(lesson.id!, { isRecurring: true });
    }
  }

  // Migrate old tasks that lack `color` and `isRecurring` (from v4 schema)
  const allTasks = await db.tasks.toArray();
  const allGoals = await db.goals.toArray();
  for (const task of allTasks) {
    const updates: any = {};
    if ((task as any).color === undefined) {
      const goal = allGoals.find(g => g.id === task.goalId);
      updates.color = goal?.color || '#3B82F6';
    }
    if ((task as any).isRecurring === undefined) {
      updates.isRecurring = task.scheduleType === 'recurring';
    }
    if (Object.keys(updates).length > 0) {
      await db.tasks.update(task.id!, updates);
    }
  }

  // Deduplicate lessons with identical title+day+time (fix StrictMode double-insert)
  const seen = new Map<string, number>();
  const toDelete: number[] = [];
  for (const lesson of allLessons) {
    const key = `${lesson.title}-${lesson.dayOfWeek}-${lesson.startHour}-${lesson.startMinute}`;
    if (seen.has(key)) {
      toDelete.push(lesson.id!);
    } else {
      seen.set(key, lesson.id!);
    }
  }
  if (toDelete.length > 0) {
    await db.lessons.bulkDelete(toDelete);
  }

  const goalCount = await db.goals.count();
  if (goalCount > 0) return;

  const today = new Date();
  const dateRangeStart = formatLocalDate(new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()));
  const dateRangeEnd = formatLocalDate(new Date(today.getFullYear(), today.getMonth() + 2, today.getDate()));

  // Seed demo goals
  await db.goals.bulkAdd([
    { title: '学好英语', description: '每天背单词，练听力', createdAt: new Date().toISOString(), color: '#4A6FA5' },
    { title: '健身计划', description: '每周运动3次', createdAt: new Date().toISOString(), color: '#34C759' },
  ]);

  // Seed demo lessons
  await db.lessons.bulkAdd([
    { title: '英语课', dayOfWeek: 1, startHour: 9, startMinute: 0, durationMinutes: 90, color: '#4A6FA5', location: '教室A', isRecurring: true, startDate: dateRangeStart, endDate: dateRangeEnd },
    { title: '数学课', dayOfWeek: 2, startHour: 10, startMinute: 30, durationMinutes: 90, color: '#FF6B6B', location: '教室B', isRecurring: true, startDate: dateRangeStart, endDate: dateRangeEnd },
    { title: '体育课', dayOfWeek: 3, startHour: 14, startMinute: 0, durationMinutes: 60, color: '#34C759', location: '体育馆', isRecurring: true, startDate: dateRangeStart, endDate: dateRangeEnd },
    { title: '物理课', dayOfWeek: 4, startHour: 9, startMinute: 0, durationMinutes: 90, color: '#FF9500', location: '实验室', isRecurring: true, startDate: dateRangeStart, endDate: dateRangeEnd },
  ]);

  // Seed demo tasks
  const goals = await db.goals.toArray();
  if (goals.length >= 2) {
    await db.tasks.bulkAdd([
      { goalId: goals[0].id, title: '背单词 50 个', status: 'done', priority: 2, scheduleType: 'single', createdAt: new Date().toISOString(), color: goals[0].color, isRecurring: false },
      { goalId: goals[0].id, title: '听力练习 30 分钟', status: 'in_progress', priority: 2, scheduleType: 'recurring', createdAt: new Date().toISOString(), color: goals[0].color, isRecurring: true, startDate: dateRangeStart, endDate: dateRangeEnd },
      { goalId: goals[1].id, title: '跑步 5 公里', status: 'todo', priority: 1, scheduleType: 'single', createdAt: new Date().toISOString(), color: goals[1].color, isRecurring: false },
    ]);
  }

  // Seed demo habits
  await db.habits.bulkAdd([
    { name: '早起', color: '#F59E0B', icon: '☀️', createdAt: new Date().toISOString() },
    { name: '运动', color: '#10B981', icon: '🏃', createdAt: new Date().toISOString() },
  ]);

  // Seed some past habit logs for visual demo
  const habits = await db.habits.toArray();
  if (habits.length >= 2) {
    const logs: HabitLog[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = formatLocalDate(d);
      // Randomly log habits for past days
      if (Math.random() > 0.3) logs.push({ habitId: habits[0].id!, date: ds });
      if (Math.random() > 0.4) logs.push({ habitId: habits[1].id!, date: ds });
    }
    if (logs.length > 0) await db.habitLogs.bulkAdd(logs);
  }

  // Seed a mood entry for today
  await db.moodEntries.add({
    date: formatLocalDate(today),
    emoji: '😊',
    note: '今天感觉不错！',
  });
}

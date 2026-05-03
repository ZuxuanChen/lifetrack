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
  goalId?: number; // optional, link to a goal
  title: string;
  status: TaskStatus;
  priority: number; // 1-3
  scheduleType: TaskScheduleType; // single = 拖拽一次后消失, recurring = 可多次使用
  createdAt: string;
  completedAt?: string;
}

export interface Lesson {
  id?: number;
  taskId?: number; // optional, link to a task
  title: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startHour: number; // 0-23
  startMinute: number; // 0 or 30
  durationMinutes: number; // 30, 60, 90, 120...
  color: string;
  location?: string;
}

export interface SleepRecord {
  id?: number;
  date: string; // ISO date
  bedTime: string; // HH:MM
  wakeTime: string; // HH:MM
  quality: number; // 1-5
  note?: string;
}

// ========== 数据库 ==========

export class LifeTrackDB extends Dexie {
  goals!: Table<Goal>;
  tasks!: Table<Task>;
  lessons!: Table<Lesson>;
  sleepRecords!: Table<SleepRecord>;

  constructor() {
    super('LifeTrackDB');
    this.version(2).stores({
      goals: '++id, createdAt',
      tasks: '++id, goalId, status, createdAt',
      lessons: '++id, dayOfWeek, taskId',
      sleepRecords: '++id, date',
    });
  }
}

export const db = new LifeTrackDB();

// ========== 辅助函数 ==========

export async function seedData() {
  const goalCount = await db.goals.count();
  if (goalCount > 0) return;

  // Seed some demo goals
  await db.goals.bulkAdd([
    { title: '学好英语', description: '每天背单词，练听力', createdAt: new Date().toISOString(), color: '#4A6FA5' },
    { title: '健身计划', description: '每周运动3次', createdAt: new Date().toISOString(), color: '#34C759' },
  ]);

  // Seed some demo lessons (weekly schedule)
  await db.lessons.bulkAdd([
    { title: '英语课', dayOfWeek: 1, startHour: 9, startMinute: 0, durationMinutes: 90, color: '#4A6FA5', location: '教室A' },
    { title: '数学课', dayOfWeek: 2, startHour: 10, startMinute: 30, durationMinutes: 90, color: '#FF6B6B', location: '教室B' },
    { title: '体育课', dayOfWeek: 3, startHour: 14, startMinute: 0, durationMinutes: 60, color: '#34C759', location: '体育馆' },
    { title: '英语课', dayOfWeek: 4, startHour: 9, startMinute: 0, durationMinutes: 90, color: '#4A6FA5', location: '教室A' },
  ]);

  // Seed some demo tasks
  const goals = await db.goals.toArray();
  if (goals.length >= 2) {
    await db.tasks.bulkAdd([
      { goalId: goals[0].id, title: '背单词 50 个', status: 'done', priority: 2, scheduleType: 'single', createdAt: new Date().toISOString() },
      { goalId: goals[0].id, title: '听力练习 30 分钟', status: 'in_progress', priority: 2, scheduleType: 'recurring', createdAt: new Date().toISOString() },
      { goalId: goals[1].id, title: '跑步 5 公里', status: 'todo', priority: 1, scheduleType: 'single', createdAt: new Date().toISOString() },
    ]);
  }
}

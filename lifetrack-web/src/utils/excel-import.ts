import * as XLSX from 'xlsx';
import type { Goal, Task, Lesson, Habit, SleepRecord, MoodEntry, FocusSession } from '../db';

export interface ExcelImportResult {
  success: boolean;
  goalsAdded: number;
  tasksAdded: number;
  lessonsAdded: number;
  habitsAdded: number;
  sleepAdded: number;
  moodAdded: number;
  focusAdded: number;
  errors: string[];
}

function safeStr(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s || undefined;
}

function safeNum(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

function safeDateStr(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  // Excel date serial number
  if (/^\d+$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  // ISO-like string
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s || undefined;
}

export function parseExcelGoals(rows: unknown[][]): Partial<Goal>[] {
  const goals: Partial<Goal>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const title = safeStr(r[0]);
    if (!title) continue;
    goals.push({
      title,
      description: safeStr(r[1]) || '',
      color: safeStr(r[2]) || '#4A6FA5',
      createdAt: safeDateStr(r[3]) || new Date().toISOString(),
      deadline: safeDateStr(r[4]),
    });
  }
  return goals;
}

export function parseExcelTasks(rows: unknown[][]): Partial<Task>[] {
  const tasks: Partial<Task>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const title = safeStr(r[0]);
    if (!title) continue;
    const status = safeStr(r[2]) as any;
    tasks.push({
      title,
      description: safeStr(r[1]),
      status: ['todo', 'in_progress', 'done'].includes(status) ? status : 'todo',
      priority: safeNum(r[3]) || 1,
      scheduleType: safeStr(r[4]) === 'recurring' ? 'recurring' : 'single',
      createdAt: safeDateStr(r[5]) || new Date().toISOString(),
      dueDate: safeDateStr(r[6]),
      color: safeStr(r[7]) || '#3B82F6',
      isRecurring: safeStr(r[4]) === 'recurring',
    });
  }
  return tasks;
}

export function parseExcelLessons(rows: unknown[][]): Partial<Lesson>[] {
  const lessons: Partial<Lesson>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const title = safeStr(r[0]);
    if (!title) continue;
    lessons.push({
      title,
      dayOfWeek: safeNum(r[1]) ?? 1,
      startHour: safeNum(r[2]) ?? 9,
      startMinute: safeNum(r[3]) ?? 0,
      durationMinutes: safeNum(r[4]) ?? 60,
      color: safeStr(r[5]) || '#4A6FA5',
      location: safeStr(r[6]),
      repeatDays: safeStr(r[7])?.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n >= 0 && n <= 6),
      status: 'todo',
      completedDates: [],
    });
  }
  return lessons;
}

export function parseExcelHabits(rows: unknown[][]): Partial<Habit>[] {
  const habits: Partial<Habit>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const name = safeStr(r[0]);
    if (!name) continue;
    habits.push({
      name,
      color: safeStr(r[1]) || '#10B981',
      icon: safeStr(r[2]) || '✅',
      createdAt: safeDateStr(r[3]) || new Date().toISOString(),
    });
  }
  return habits;
}

export function parseExcelFile(buffer: ArrayBuffer): {
  goals: Partial<Goal>[];
  tasks: Partial<Task>[];
  lessons: Partial<Lesson>[];
  habits: Partial<Habit>[];
  errors: string[];
} {
  const errors: string[] = [];
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch (e) {
    errors.push('无法解析 Excel 文件');
    return { goals: [], tasks: [], lessons: [], habits: [], errors };
  }

  const goals: Partial<Goal>[] = [];
  const tasks: Partial<Task>[] = [];
  const lessons: Partial<Lesson>[] = [];
  const habits: Partial<Habit>[] = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    if (data.length < 2) {
      errors.push(`工作表「${sheetName}」数据为空`);
      continue;
    }
    const lower = sheetName.toLowerCase();
    if (lower.includes('goal')) {
      goals.push(...parseExcelGoals(data));
    } else if (lower.includes('task')) {
      tasks.push(...parseExcelTasks(data));
    } else if (lower.includes('lesson') || lower.includes('course')) {
      lessons.push(...parseExcelLessons(data));
    } else if (lower.includes('habit')) {
      habits.push(...parseExcelHabits(data));
    } else {
      errors.push(`未识别的工作表「${sheetName}」，已跳过`);
    }
  }

  return { goals, tasks, lessons, habits, errors };
}

import { describe, it, expect } from 'vitest';

interface Task {
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
  priority: number;
}

function isOverdue(task: Task): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return task.status !== 'done' && !!task.dueDate && task.dueDate < todayStr;
}

function sortByDueDate(a: Task, b: Task): number {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

function filterTasks(tasks: Task[], filter: string): Task[] {
  const todayStr = new Date().toISOString().split('T')[0];
  return tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return t.status !== 'done' && !!t.dueDate && t.dueDate < todayStr;
    return t.status === filter;
  });
}

describe('Task due date functionality', () => {
  describe('isOverdue', () => {
    it('should identify overdue tasks', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = yesterday.toISOString().split('T')[0];

      expect(isOverdue({ status: 'todo', dueDate: yestStr, priority: 2 })).toBe(true);
    });

    it('should not mark done tasks as overdue', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = yesterday.toISOString().split('T')[0];

      expect(isOverdue({ status: 'done', dueDate: yestStr, priority: 2 })).toBe(false);
    });

    it('should not mark future tasks as overdue', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomStr = tomorrow.toISOString().split('T')[0];

      expect(isOverdue({ status: 'todo', dueDate: tomStr, priority: 2 })).toBe(false);
    });

    it('should handle tasks without due date', () => {
      expect(isOverdue({ status: 'todo', priority: 2 })).toBe(false);
    });

    it('should handle today as not overdue', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      expect(isOverdue({ status: 'todo', dueDate: todayStr, priority: 2 })).toBe(false);
    });
  });

  describe('sortByDueDate', () => {
    it('should sort tasks by due date ascending', () => {
      const tasks: Task[] = [
        { status: 'todo', dueDate: '2026-05-10', priority: 2 },
        { status: 'todo', dueDate: '2026-05-01', priority: 2 },
        { status: 'todo', dueDate: '2026-05-05', priority: 2 },
      ];
      const sorted = [...tasks].sort(sortByDueDate);
      expect(sorted[0].dueDate).toBe('2026-05-01');
      expect(sorted[1].dueDate).toBe('2026-05-05');
      expect(sorted[2].dueDate).toBe('2026-05-10');
    });

    it('should place tasks without due date at the end', () => {
      const tasks: Task[] = [
        { status: 'todo', priority: 2 },
        { status: 'todo', dueDate: '2026-05-01', priority: 2 },
      ];
      const sorted = [...tasks].sort(sortByDueDate);
      expect(sorted[0].dueDate).toBe('2026-05-01');
      expect(sorted[1].dueDate).toBeUndefined();
    });

    it('should handle all tasks without due date', () => {
      const tasks: Task[] = [
        { status: 'todo', priority: 1 },
        { status: 'todo', priority: 2 },
      ];
      const sorted = [...tasks].sort(sortByDueDate);
      expect(sorted[0].priority).toBe(1);
      expect(sorted[1].priority).toBe(2);
    });
  });

  describe('filterTasks', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];

    it('should filter by status', () => {
      const tasks: Task[] = [
        { status: 'todo', priority: 2 },
        { status: 'done', priority: 2 },
        { status: 'in_progress', priority: 2 },
      ];
      expect(filterTasks(tasks, 'todo')).toHaveLength(1);
      expect(filterTasks(tasks, 'done')).toHaveLength(1);
      expect(filterTasks(tasks, 'in_progress')).toHaveLength(1);
    });

    it('should filter overdue tasks', () => {
      const tasks: Task[] = [
        { status: 'todo', dueDate: yestStr, priority: 2 },
        { status: 'todo', dueDate: todayStr, priority: 2 },
        { status: 'done', dueDate: yestStr, priority: 2 },
        { status: 'todo', priority: 2 },
      ];
      const overdue = filterTasks(tasks, 'overdue');
      expect(overdue).toHaveLength(1);
      expect(overdue[0].dueDate).toBe(yestStr);
    });

    it('should return all tasks for all filter', () => {
      const tasks: Task[] = [
        { status: 'todo', dueDate: yestStr, priority: 2 },
        { status: 'done', priority: 2 },
      ];
      expect(filterTasks(tasks, 'all')).toHaveLength(2);
    });
  });
});

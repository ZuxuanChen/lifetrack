import { describe, it, expect } from 'vitest';
import { parseExcelGoals, parseExcelTasks, parseExcelLessons, parseExcelHabits } from '../utils/excel-import';

describe('Excel Import', () => {
  describe('parseExcelGoals', () => {
    it('should parse goals with title and description', () => {
      const rows = [['Title', 'Description', 'Color', 'CreatedAt', 'Deadline'], ['英语', '每天背单词', '#4A6FA5', '2026-01-01', '2026-06-01']];
      const goals = parseExcelGoals(rows);
      expect(goals).toHaveLength(1);
      expect(goals[0].title).toBe('英语');
      expect(goals[0].description).toBe('每天背单词');
      expect(goals[0].color).toBe('#4A6FA5');
      expect(goals[0].deadline).toBe('2026-06-01');
    });

    it('should skip rows without title', () => {
      const rows = [['Title', 'Description'], ['', 'desc'], ['Valid', 'desc']];
      const goals = parseExcelGoals(rows);
      expect(goals).toHaveLength(1);
      expect(goals[0].title).toBe('Valid');
    });

    it('should use defaults for missing optional fields', () => {
      const rows = [['Title'], ['Math']];
      const goals = parseExcelGoals(rows);
      expect(goals[0].color).toBe('#4A6FA5');
      expect(goals[0].deadline).toBeUndefined();
    });
  });

  describe('parseExcelTasks', () => {
    it('should parse tasks with status validation', () => {
      const rows = [['Title', 'Desc', 'Status', 'Priority', 'Type', 'Created', 'Due', 'Color'], ['作业', '', 'done', 2, 'single', '2026-01-01', '', '#3B82F6']];
      const tasks = parseExcelTasks(rows);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('done');
      expect(tasks[0].priority).toBe(2);
    });

    it('should default invalid status to todo', () => {
      const rows = [['Title', 'Desc', 'Status'], ['A', '', 'invalid']];
      const tasks = parseExcelTasks(rows);
      expect(tasks[0].status).toBe('todo');
    });
  });

  describe('parseExcelLessons', () => {
    it('should parse lessons with repeat days', () => {
      const rows = [['Title', 'Day', 'Hour', 'Minute', 'Duration', 'Color', 'Location', 'Repeat'], ['数学', 1, 9, 0, 90, '#FF6B6B', '教室A', '1,3,5']];
      const lessons = parseExcelLessons(rows);
      expect(lessons).toHaveLength(1);
      expect(lessons[0].dayOfWeek).toBe(1);
      expect(lessons[0].repeatDays).toEqual([1, 3, 5]);
    });

    it('should handle empty repeat days', () => {
      const rows = [['Title', 'Day', 'Hour', 'Minute', 'Duration'], ['物理', 2, 10, 30, 60]];
      const lessons = parseExcelLessons(rows);
      expect(lessons[0].repeatDays).toBeUndefined();
    });
  });

  describe('parseExcelHabits', () => {
    it('should parse habits with icon', () => {
      const rows = [['Name', 'Color', 'Icon', 'CreatedAt'], ['早起', '#F59E0B', '☀️', '2026-01-01']];
      const habits = parseExcelHabits(rows);
      expect(habits).toHaveLength(1);
      expect(habits[0].name).toBe('早起');
      expect(habits[0].icon).toBe('☀️');
    });
  });
});

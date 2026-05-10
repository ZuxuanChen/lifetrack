import { describe, it, expect } from 'vitest';
import { formatCsvValue, generateCsv } from '../utils/csvExport';

describe('CSV Export', () => {
  describe('formatCsvValue', () => {
    it('should return empty string for null/undefined', () => {
      expect(formatCsvValue(null)).toBe('');
      expect(formatCsvValue(undefined)).toBe('');
    });

    it('should wrap values with commas in quotes', () => {
      expect(formatCsvValue('hello, world')).toBe('"hello, world"');
    });

    it('should wrap values with quotes in quotes', () => {
      expect(formatCsvValue('say "hello"')).toBe('"say ""hello"""');
    });

    it('should wrap values with newlines in quotes', () => {
      expect(formatCsvValue('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should not wrap simple values', () => {
      expect(formatCsvValue('hello')).toBe('hello');
      expect(formatCsvValue(123)).toBe('123');
    });

    it('should handle Chinese characters', () => {
      expect(formatCsvValue('中文测试')).toBe('中文测试');
    });
  });

  describe('generateCsv', () => {
    it('should generate basic CSV', () => {
      const headers = ['name', 'age'];
      const rows = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
      const csv = generateCsv(headers, rows);
      expect(csv).toBe('name,age\nAlice,30\nBob,25');
    });

    it('should handle empty rows', () => {
      const headers = ['a'];
      const rows: Record<string, unknown>[] = [];
      expect(generateCsv(headers, rows)).toBe('a');
    });

    it('should handle missing fields', () => {
      const headers = ['a', 'b'];
      const rows = [{ a: 1 }];
      expect(generateCsv(headers, rows)).toBe('a,b\n1,');
    });

    it('should handle special characters in data', () => {
      const headers = ['title'];
      const rows = [{ title: 'Hello, "World"' }];
      const csv = generateCsv(headers, rows);
      expect(csv).toBe('title\n"Hello, ""World"""');
    });

    it('should handle numbers and booleans', () => {
      const headers = ['id', 'active'];
      const rows = [{ id: 42, active: true }, { id: 0, active: false }];
      expect(generateCsv(headers, rows)).toBe('id,active\n42,true\n0,false');
    });
  });
});

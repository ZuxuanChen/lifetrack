import { describe, it, expect } from 'vitest';
import { analyzeSleepFocusCorrelation, sleepDurationHours } from '../utils/sleep-focus-correlation';
import type { SleepRecord, FocusSession } from '../db';

describe('Sleep-Focus Correlation', () => {
  describe('sleepDurationHours', () => {
    it('should calculate normal sleep duration', () => {
      expect(sleepDurationHours('23:00', '07:00')).toBe(8);
    });

    it('should handle overnight sleep', () => {
      expect(sleepDurationHours('22:00', '06:00')).toBe(8);
    });

    it('should handle same-day sleep', () => {
      expect(sleepDurationHours('14:00', '15:30')).toBe(1.5);
    });
  });

  describe('analyzeSleepFocusCorrelation', () => {
    it('should return empty state when no data', () => {
      const result = analyzeSleepFocusCorrelation([], []);
      expect(result.qualityCorrelation).toHaveLength(0);
      expect(result.bestQuality).toBeNull();
      expect(result.recommendation).toContain('暂无足够数据');
    });

    it('should correlate sleep quality with next-day focus', () => {
      const sleep: SleepRecord[] = [
        { date: '2026-05-01', bedTime: '23:00', wakeTime: '07:00', quality: 5 },
        { date: '2026-05-02', bedTime: '23:00', wakeTime: '07:00', quality: 3 },
      ];
      const focus: FocusSession[] = [
        { date: '2026-05-02', durationMinutes: 120 },
        { date: '2026-05-03', durationMinutes: 60 },
      ];
      const result = analyzeSleepFocusCorrelation(sleep, focus);
      expect(result.qualityCorrelation).toHaveLength(2);
      const q5 = result.qualityCorrelation.find(q => q.quality === 5);
      const q3 = result.qualityCorrelation.find(q => q.quality === 3);
      expect(q5?.avgFocusMinutes).toBe(120);
      expect(q3?.avgFocusMinutes).toBe(60);
      expect(result.bestQuality).toBe(5);
    });

    it('should find best duration range', () => {
      const sleep: SleepRecord[] = [
        { date: '2026-05-01', bedTime: '23:00', wakeTime: '07:00', quality: 4 }, // 8h
        { date: '2026-05-02', bedTime: '01:00', wakeTime: '06:00', quality: 2 }, // 5h
      ];
      const focus: FocusSession[] = [
        { date: '2026-05-02', durationMinutes: 90 },
        { date: '2026-05-03', durationMinutes: 30 },
      ];
      const result = analyzeSleepFocusCorrelation(sleep, focus);
      expect(result.bestDurationRange).toBe('8-9h');
    });

    it('should compute correlation coefficient', () => {
      const sleep: SleepRecord[] = [
        { date: '2026-05-01', bedTime: '23:00', wakeTime: '07:00', quality: 5 },
        { date: '2026-05-02', bedTime: '23:00', wakeTime: '07:00', quality: 3 },
        { date: '2026-05-03', bedTime: '23:00', wakeTime: '07:00', quality: 4 },
      ];
      const focus: FocusSession[] = [
        { date: '2026-05-02', durationMinutes: 120 },
        { date: '2026-05-03', durationMinutes: 60 },
        { date: '2026-05-04', durationMinutes: 90 },
      ];
      const result = analyzeSleepFocusCorrelation(sleep, focus);
      expect(Math.abs(result.correlationCoefficient)).toBeLessThanOrEqual(1);
      expect(result.recommendation).toContain('睡眠评分');
    });

    it('should handle unmatched dates gracefully', () => {
      const sleep: SleepRecord[] = [
        { date: '2026-05-01', bedTime: '23:00', wakeTime: '07:00', quality: 5 },
      ];
      const focus: FocusSession[] = [
        { date: '2026-05-10', durationMinutes: 60 }, // no matching sleep
      ];
      const result = analyzeSleepFocusCorrelation(sleep, focus);
      expect(result.qualityCorrelation).toHaveLength(0);
    });
  });
});

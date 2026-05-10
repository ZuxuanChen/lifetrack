import { describe, it, expect } from 'vitest';

interface MockFocusSession {
  date: string;
  durationMinutes: number;
}

function getFocusStreak(sessions: MockFocusSession[], todayStr: string): number {
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(todayStr);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    if (sessions.some(f => f.date === ds)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function getFocusPerDay(sessions: MockFocusSession[], dates: string[]): number[] {
  return dates.map(date => {
    const dayFocus = sessions.filter(f => f.date === date);
    return dayFocus.reduce((s, f) => s + f.durationMinutes, 0) / 60;
  });
}

describe('Focus Statistics', () => {
  describe('getFocusStreak', () => {
    it('should count consecutive days with focus sessions', () => {
      const sessions: MockFocusSession[] = [
        { date: '2026-05-10', durationMinutes: 25 },
        { date: '2026-05-09', durationMinutes: 30 },
        { date: '2026-05-08', durationMinutes: 25 },
      ];
      expect(getFocusStreak(sessions, '2026-05-10')).toBe(3);
    });

    it('should break streak on gap day', () => {
      const sessions: MockFocusSession[] = [
        { date: '2026-05-10', durationMinutes: 25 },
        { date: '2026-05-08', durationMinutes: 25 },
      ];
      expect(getFocusStreak(sessions, '2026-05-10')).toBe(1);
    });

    it('should return 0 for no sessions today or yesterday', () => {
      const sessions: MockFocusSession[] = [
        { date: '2026-05-08', durationMinutes: 25 },
      ];
      expect(getFocusStreak(sessions, '2026-05-10')).toBe(0);
    });

    it('should handle multiple sessions on same day', () => {
      const sessions: MockFocusSession[] = [
        { date: '2026-05-10', durationMinutes: 25 },
        { date: '2026-05-10', durationMinutes: 30 },
        { date: '2026-05-09', durationMinutes: 25 },
      ];
      expect(getFocusStreak(sessions, '2026-05-10')).toBe(2);
    });

    it('should cap at 30 days check', () => {
      const sessions: MockFocusSession[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date('2026-05-10');
        d.setDate(d.getDate() - i);
        sessions.push({ date: d.toISOString().split('T')[0], durationMinutes: 25 });
      }
      expect(getFocusStreak(sessions, '2026-05-10')).toBe(30);
    });
  });

  describe('getFocusPerDay', () => {
    it('should sum minutes per day and convert to hours', () => {
      const sessions: MockFocusSession[] = [
        { date: '2026-05-10', durationMinutes: 30 },
        { date: '2026-05-10', durationMinutes: 30 },
        { date: '2026-05-09', durationMinutes: 60 },
      ];
      const result = getFocusPerDay(sessions, ['2026-05-10', '2026-05-09', '2026-05-08']);
      expect(result[0]).toBe(1); // 60min = 1h
      expect(result[1]).toBe(1); // 60min = 1h
      expect(result[2]).toBe(0); // no sessions
    });

    it('should handle empty sessions', () => {
      const result = getFocusPerDay([], ['2026-05-10']);
      expect(result[0]).toBe(0);
    });

    it('should handle decimal hours', () => {
      const sessions: MockFocusSession[] = [
        { date: '2026-05-10', durationMinutes: 25 },
      ];
      const result = getFocusPerDay(sessions, ['2026-05-10']);
      expect(result[0]).toBeCloseTo(0.417, 2);
    });
  });
});

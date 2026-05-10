import type { SleepRecord, FocusSession } from '../db';

export interface SleepFocusCorrelation {
  // Average focus duration (minutes) grouped by sleep quality (1-5)
  qualityCorrelation: { quality: number; avgFocusMinutes: number; days: number }[];
  // Average focus duration grouped by sleep duration range
  durationCorrelation: { range: string; avgFocusMinutes: number; days: number }[];
  // Best sleep quality for focus
  bestQuality: number | null;
  // Best sleep duration range for focus
  bestDurationRange: string | null;
  // Overall correlation coefficient (-1 to 1)
  correlationCoefficient: number;
  // Recommendation text
  recommendation: string;
}

export function sleepDurationHours(bedTime: string, wakeTime: string): number {
  const [bedH, bedM] = bedTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  let hours = wakeH - bedH;
  let mins = wakeM - bedM;
  if (mins < 0) { hours -= 1; mins += 60; }
  if (hours < 0) hours += 24;
  return hours + mins / 60;
}

function getDurationRange(hours: number): string {
  if (hours < 6) return '< 6h';
  if (hours < 7) return '6-7h';
  if (hours < 8) return '7-8h';
  if (hours < 9) return '8-9h';
  return '9h+';
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function analyzeSleepFocusCorrelation(
  sleepRecords: SleepRecord[],
  focusSessions: FocusSession[],
): SleepFocusCorrelation {
  // Group focus sessions by date
  const focusByDate = new Map<string, number>();
  for (const s of focusSessions) {
    focusByDate.set(s.date, (focusByDate.get(s.date) || 0) + s.durationMinutes);
  }

  // Match sleep records with next-day focus
  const matched: { sleep: SleepRecord; nextDayFocus: number; sleepHours: number }[] = [];
  for (const sleep of sleepRecords) {
    const nd = nextDay(sleep.date);
    const focus = focusByDate.get(nd) || 0;
    if (focus > 0) {
      matched.push({
        sleep,
        nextDayFocus: focus,
        sleepHours: sleepDurationHours(sleep.bedTime, sleep.wakeTime),
      });
    }
  }

  if (matched.length === 0) {
    return {
      qualityCorrelation: [],
      durationCorrelation: [],
      bestQuality: null,
      bestDurationRange: null,
      correlationCoefficient: 0,
      recommendation: '暂无足够数据。记录睡眠并开始专注会话后，即可查看关联分析。',
    };
  }

  // Quality correlation
  const qualityMap = new Map<number, { totalFocus: number; days: number }>();
  for (const m of matched) {
    const q = m.sleep.quality;
    const existing = qualityMap.get(q) || { totalFocus: 0, days: 0 };
    existing.totalFocus += m.nextDayFocus;
    existing.days += 1;
    qualityMap.set(q, existing);
  }
  const qualityCorrelation = Array.from(qualityMap.entries())
    .map(([quality, data]) => ({
      quality,
      avgFocusMinutes: Math.round(data.totalFocus / data.days),
      days: data.days,
    }))
    .sort((a, b) => a.quality - b.quality);

  // Duration correlation
  const durationMap = new Map<string, { totalFocus: number; days: number }>();
  for (const m of matched) {
    const range = getDurationRange(m.sleepHours);
    const existing = durationMap.get(range) || { totalFocus: 0, days: 0 };
    existing.totalFocus += m.nextDayFocus;
    existing.days += 1;
    durationMap.set(range, existing);
  }
  const durationCorrelation = Array.from(durationMap.entries())
    .map(([range, data]) => ({
      range,
      avgFocusMinutes: Math.round(data.totalFocus / data.days),
      days: data.days,
    }))
    .sort((a, b) => a.avgFocusMinutes - b.avgFocusMinutes);

  // Find best quality
  const bestQualityEntry = qualityCorrelation.reduce((best, curr) =>
    curr.avgFocusMinutes > best.avgFocusMinutes ? curr : best
  , qualityCorrelation[0]);
  const bestQuality = bestQualityEntry?.quality ?? null;

  // Find best duration range
  const bestDurationEntry = durationCorrelation.reduce((best, curr) =>
    curr.avgFocusMinutes > best.avgFocusMinutes ? curr : best
  , durationCorrelation[0]);
  const bestDurationRange = bestDurationEntry?.range ?? null;

  // Calculate Pearson correlation coefficient (sleep quality vs focus)
  const n = matched.length;
  const sumX = matched.reduce((s, m) => s + m.sleep.quality, 0);
  const sumY = matched.reduce((s, m) => s + m.nextDayFocus, 0);
  const sumXY = matched.reduce((s, m) => s + m.sleep.quality * m.nextDayFocus, 0);
  const sumX2 = matched.reduce((s, m) => s + m.sleep.quality ** 2, 0);
  const sumY2 = matched.reduce((s, m) => s + m.nextDayFocus ** 2, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  const correlationCoefficient = denominator === 0 ? 0 : numerator / denominator;

  // Generate recommendation
  let recommendation = '';
  if (bestQuality && bestDurationRange) {
    recommendation = `睡眠评分 ${bestQuality} 分、时长 ${bestDurationRange} 时，次日专注力最强。`;
    if (correlationCoefficient > 0.5) {
      recommendation += ' 睡眠与专注高度正相关，保持优质睡眠！';
    } else if (correlationCoefficient < -0.3) {
      recommendation += ' 当前数据呈负相关，可能存在其他干扰因素。';
    }
  }

  return {
    qualityCorrelation,
    durationCorrelation,
    bestQuality,
    bestDurationRange,
    correlationCoefficient,
    recommendation,
  };
}

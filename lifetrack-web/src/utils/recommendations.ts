import type { Goal, Task, Lesson, Habit, HabitLog, SleepRecord, FocusSession, MoodEntry } from '../db';
import { todayLocal, formatLocalDate } from '../db';

export interface Recommendation {
  type: 'goal' | 'task' | 'lesson' | 'habit' | 'sleep' | 'focus' | 'mood';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatLocalDate(d);
}

function hasRecentFocusSessions(sessions: FocusSession[], days: number): boolean {
  const cutoff = daysAgo(days);
  return sessions.some(s => s.date >= cutoff);
}

function hasRecentSleepRecords(records: SleepRecord[], days: number): boolean {
  const cutoff = daysAgo(days);
  return records.some(r => r.date >= cutoff);
}

function hasRecentMoodEntries(entries: MoodEntry[], days: number): boolean {
  const cutoff = daysAgo(days);
  return entries.some(e => e.date >= cutoff);
}

export function generateRecommendations(
  goals: Goal[],
  tasks: Task[],
  lessons: Lesson[],
  habits: Habit[],
  habitLogs: HabitLog[],
  sleepRecords: SleepRecord[],
  focusSessions: FocusSession[],
  moodEntries: MoodEntry[],
): Recommendation[] {
  const recs: Recommendation[] = [];
  const today = todayLocal();

  // Focus recommendations
  if (!hasRecentFocusSessions(focusSessions, 7)) {
    recs.push({
      type: 'focus',
      priority: 'high',
      title: '开始专注',
      description: '最近 7 天没有专注记录。尝试一个 25 分钟的番茄钟吧！',
      action: '去课程表开始专注',
    });
  }

  // Goal recommendations
  for (const goal of goals) {
    const goalTasks = tasks.filter(t => t.goalId === goal.id);
    const doneCount = goalTasks.filter(t => t.status === 'done').length;
    const total = goalTasks.length;
    const percent = total > 0 ? (doneCount / total) * 100 : 0;

    if (percent < 30 && total < 3) {
      recs.push({
        type: 'goal',
        priority: 'high',
        title: `「${goal.title}」需要更多任务`,
        description: '目标完成度不足 30%，建议添加 2-3 个具体任务来推进。',
        action: '去任务页添加',
      });
    } else if (percent >= 80) {
      recs.push({
        type: 'goal',
        priority: 'medium',
        title: `「${goal.title}」即将完成`,
        description: '完成度已超过 80%，冲刺一下就能达成！',
      });
    }
  }

  // Lesson completion rate
  const thisWeekStart = daysAgo(7);
  const thisWeekLessons = lessons.filter(l => {
    if (!l.completedDates) return false;
    return l.completedDates.some(d => d >= thisWeekStart);
  });
  const totalWeeklyLessons = lessons.filter(l => {
    // Approximate: lessons that would appear this week
    const day = new Date().getDay();
    return l.dayOfWeek === day || (l.repeatDays?.includes(day) ?? false);
  });
  if (totalWeeklyLessons.length > 0) {
    const completionRate = thisWeekLessons.length / totalWeeklyLessons.length;
    if (completionRate < 0.5) {
      recs.push({
        type: 'lesson',
        priority: 'high',
        title: '本周课程完成率偏低',
        description: `本周仅完成了 ${Math.round(completionRate * 100)}% 的课程，建议补课追赶进度。`,
        action: '去课程表查看',
      });
    }
  }

  // Habit streak
  for (const habit of habits) {
    const logs = habitLogs.filter(l => l.habitId === habit.id).sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    for (let i = 0; i < logs.length; i++) {
      const expected = daysAgo(i);
      if (logs[i]?.date === expected) streak++;
      else break;
    }
    if (streak === 0 && logs.length > 0 && logs[0].date === today) {
      // checked today but no streak
    } else if (streak === 0 && logs.length > 0) {
      recs.push({
        type: 'habit',
        priority: 'medium',
        title: `「${habit.name}」打卡中断了`,
        description: '习惯养成贵在坚持，今天重新开始吧！',
        action: '去习惯页打卡',
      });
    } else if (streak >= 7) {
      recs.push({
        type: 'habit',
        priority: 'low',
        title: `「${habit.name}」连续 ${streak} 天！`,
        description: '太棒了，继续保持这个好习惯！',
      });
    }
  }

  // Sleep recommendations
  if (!hasRecentSleepRecords(sleepRecords, 3)) {
    recs.push({
      type: 'sleep',
      priority: 'medium',
      title: '记得记录睡眠',
      description: '连续 3 天没有睡眠记录。规律作息是高效学习的基础。',
      action: '去睡眠页记录',
    });
  }

  // Mood recommendations
  if (!hasRecentMoodEntries(moodEntries, 3)) {
    recs.push({
      type: 'mood',
      priority: 'low',
      title: '记录一下心情',
      description: '连续 3 天没有心情记录。关注情绪变化有助于调整状态。',
      action: '去总览记录心情',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recs.slice(0, 5); // Max 5 recommendations
}

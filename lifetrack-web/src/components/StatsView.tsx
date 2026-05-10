import { useState, useEffect } from 'react';
import { db, type Task, type Lesson, type SleepRecord, type FocusSession, type MoodEntry, type Habit, type HabitLog, type BadgeUnlock, type Goal, formatLocalDate } from '../db';
import { Trophy, Star, Zap, Sunrise, Moon, BedDouble, TrendingUp, Clock, CheckCircle2, Smile, ArrowLeft, Target, Download, BrainCircuit } from 'lucide-react';
import { generateCsv, downloadCsv } from '../utils/csvExport';
import { analyzeSleepFocusCorrelation, type SleepFocusCorrelation } from '../utils/sleep-focus-correlation';

const BADGE_DEFS = [
  { id: 'first-task', name: '初出茅庐', desc: '完成第一个任务', icon: Star, color: '#F59E0B' },
  { id: 'early-bird', name: '早起鸟', desc: '连续 3 天 7 点前起床', icon: Sunrise, color: '#F97316' },
  { id: 'night-owl', name: '夜猫子', desc: '连续 3 天凌晨 1 点后睡觉', icon: Moon, color: '#6366F1' },
  { id: 'grinder', name: '肝帝', desc: '单日专注超过 4 小时', icon: Zap, color: '#EF4444' },
  { id: 'sleep-god', name: '睡神', desc: '单日睡眠超过 10 小时', icon: BedDouble, color: '#8B5CF6' },
  { id: 'perfect-day', name: '全勤', desc: '单日完成所有习惯', icon: CheckCircle2, color: '#10B981' },
  { id: 'week-champ', name: '周冠军', desc: '一周完成 20 个任务', icon: Trophy, color: '#EC4899' },
  { id: 'streak-7', name: '连续 7 天', desc: '连续 7 天有完成任务', icon: TrendingUp, color: '#3B82F6' },
  { id: 'goal-completed', name: '目标达成', desc: '某个目标下的所有任务全部完成', icon: Star, color: '#10B981' },
];

export default function StatsView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [badgeUnlocks, setBadgeUnlocks] = useState<BadgeUnlock[]>([]);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sleepFocusCorr, setSleepFocusCorr] = useState<SleepFocusCorrelation | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [t, l, s, f, m, h, hl, bu, g] = await Promise.all([
      db.tasks.toArray(),
      db.lessons.toArray(),
      db.sleepRecords.toArray(),
      db.focusSessions.toArray(),
      db.moodEntries.toArray(),
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.badgeUnlocks.toArray(),
      db.goals.toArray(),
    ]);
    setTasks(t);
    setLessons(l);
    setSleepRecords(s.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setFocusSessions(f);
    setMoodEntries(m.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setBadgeUnlocks(bu);
    setGoals(g);
    setSleepFocusCorr(analyzeSleepFocusCorrelation(s, f));

    // Check for new badge unlocks
    const newlyUnlocked: string[] = [];
    for (const badge of BADGE_DEFS) {
      if (!bu.some(b => b.badgeId === badge.id) && checkBadge(badge.id, t, s, f, h, hl, g)) {
        newlyUnlocked.push(badge.id);
      }
    }
    if (newlyUnlocked.length > 0) {
      await db.badgeUnlocks.bulkAdd(newlyUnlocked.map(id => ({ badgeId: id, unlockedAt: new Date().toISOString() })));
      setNewBadges(newlyUnlocked);
      setBadgeUnlocks(await db.badgeUnlocks.toArray());
    }
  }

  function checkBadge(
    badgeId: string,
    tasks: Task[],
    sleepRecords: SleepRecord[],
    focusSessions: FocusSession[],
    habits: Habit[],
    habitLogs: HabitLog[],
    goals: Goal[]
  ): boolean {
    const today = new Date();
    switch (badgeId) {
      case 'first-task':
        return tasks.some(t => t.status === 'done');
      case 'early-bird': {
        let streak = 0;
        for (let i = 0; i < 30; i++) {
          const d = new Date(today); d.setDate(d.getDate() - i);
          const ds = formatLocalDate(d);
          const record = sleepRecords.find(s => s.date === ds);
          if (record) {
            const [h] = record.wakeTime.split(':').map(Number);
            if (h <= 7) { streak++; if (streak >= 3) return true; }
            else break;
          } else break;
        }
        return false;
      }
      case 'night-owl': {
        let streak = 0;
        for (let i = 0; i < 30; i++) {
          const d = new Date(today); d.setDate(d.getDate() - i);
          const ds = formatLocalDate(d);
          const record = sleepRecords.find(s => s.date === ds);
          if (record) {
            const [h] = record.bedTime.split(':').map(Number);
            if (h >= 1 && h < 6) { streak++; if (streak >= 3) return true; }
            else break;
          } else break;
        }
        return false;
      }
      case 'grinder': {
        const dailyFocus: Record<string, number> = {};
        for (const f of focusSessions) {
          dailyFocus[f.date] = (dailyFocus[f.date] || 0) + f.durationMinutes;
        }
        return Object.values(dailyFocus).some(m => m >= 240);
      }
      case 'sleep-god': {
        for (const s of sleepRecords) {
          const [bh, bm] = s.bedTime.split(':').map(Number);
          const [wh, wm] = s.wakeTime.split(':').map(Number);
          let bedMin = bh * 60 + bm;
          let wakeMin = wh * 60 + wm;
          if (wakeMin < bedMin) wakeMin += 24 * 60;
          if ((wakeMin - bedMin) >= 600) return true;
        }
        return false;
      }
      case 'perfect-day': {
        if (habits.length === 0) return false;
        for (let i = 0; i < 30; i++) {
          const d = new Date(today); d.setDate(d.getDate() - i);
          const ds = formatLocalDate(d);
          const dayLogs = habitLogs.filter(l => l.date === ds);
          if (dayLogs.length > 0 && dayLogs.length >= habits.length) return true;
        }
        return false;
      }
      case 'week-champ': {
        for (let i = 0; i < 30; i++) {
          const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - i * 7);
          const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() - 6);
          let count = 0;
          for (const t of tasks) {
            if (t.status === 'done' && t.completedAt) {
              const cd = t.completedAt.slice(0, 10);
              if (cd <= formatLocalDate(weekStart) && cd >= formatLocalDate(weekEnd)) count++;
            }
          }
          if (count >= 20) return true;
        }
        return false;
      }
      case 'streak-7': {
        let streak = 0;
        for (let i = 0; i < 30; i++) {
          const d = new Date(today); d.setDate(d.getDate() - i);
          const ds = formatLocalDate(d);
          if (tasks.some(t => t.status === 'done' && t.completedAt?.startsWith(ds))) {
            streak++;
            if (streak >= 7) return true;
          } else {
            break;
          }
        }
        return false;
      }
      case 'goal-completed': {
        for (const goal of goals) {
          const goalTasks = tasks.filter(t => t.goalId === goal.id);
          if (goalTasks.length > 0 && goalTasks.every(t => t.status === 'done')) return true;
        }
        return false;
      }
    }
    return false;
  }

  // Goal completion stats
  const goalStats = goals.map(goal => {
    const goalTasks = tasks.filter(t => t.goalId === goal.id);
    return { goal, total: goalTasks.length, completed: goalTasks.filter(t => t.status === 'done').length };
  }).sort((a, b) => {
    const aPct = a.total > 0 ? a.completed / a.total : 0;
    const bPct = b.total > 0 ? b.completed / b.total : 0;
    return bPct - aPct;
  });

  // === Last 7 days data ===
  const last7Days: { date: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last7Days.push({ date: formatLocalDate(d), label: `${d.getMonth() + 1}/${d.getDate()}` });
  }

  // Workload per day
  const workloadData = last7Days.map(({ date }) => {
    const dayLessons = lessons.filter(l => l.completedDates?.includes(date));
    const lessonMinutes = dayLessons.reduce((s, l) => s + l.durationMinutes, 0);
    const dayTasks = tasks.filter(t => t.status === 'done' && t.completedAt?.startsWith(date) && !lessons.some(l => l.taskId === t.id));
    const extraMinutes = dayTasks.length * 60;
    return (lessonMinutes + extraMinutes) / 60;
  });

  // Tasks done per day
  const taskData = last7Days.map(({ date }) =>
    tasks.filter(t => t.status === 'done' && t.completedAt?.startsWith(date)).length
  );

  // Sleep duration per day
  const sleepData = last7Days.map(({ date }) => {
    const rec = sleepRecords.find(s => s.date === date);
    if (!rec) return null;
    const [bh, bm] = rec.bedTime.split(':').map(Number);
    const [wh, wm] = rec.wakeTime.split(':').map(Number);
    let bedMin = bh * 60 + bm;
    let wakeMin = wh * 60 + wm;
    if (wakeMin < bedMin) wakeMin += 24 * 60;
    return (wakeMin - bedMin) / 60;
  });

  // Focus stats
  const totalFocusMinutes = focusSessions.reduce((s, f) => s + f.durationMinutes, 0);
  const thisWeekFocus = focusSessions.filter(f => {
    const d = new Date(f.date);
    const todayD = new Date();
    return todayD.getTime() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
  });

  // Focus per day (last 7 days)
  const focusData = last7Days.map(({ date }) => {
    const dayFocus = focusSessions.filter(f => f.date === date);
    return dayFocus.reduce((s, f) => s + f.durationMinutes, 0) / 60;
  });

  // Focus streak (consecutive days with focus sessions)
  const focusStreak = (() => {
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = formatLocalDate(d);
      if (focusSessions.some(f => f.date === ds)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  })();

  // SVG chart helpers
  function BarChart({ data, color }: { data: (number | null)[]; color: string }) {
    const max = Math.max(...data.filter(d => d !== null) as number[], 1);
    const w = 300;
    const h = 100;
    const barW = 30;
    const gap = (w - barW * 7) / 6;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {data.map((v, i) => {
          if (v === null) return (
            <text key={i} x={i * (barW + gap) + barW / 2} y={h / 2 + 4} textAnchor="middle" fill="#d1d5db" fontSize="10">—</text>
          );
          const barH = (v / max) * (h - 20);
          return (
            <g key={i}>
              <rect x={i * (barW + gap)} y={h - barH - 15} width={barW} height={barH} rx="4" fill={color} opacity="0.8" />
              <text x={i * (barW + gap) + barW / 2} y={h - 2} textAnchor="middle" fill="#9ca3af" fontSize="9">{last7Days[i].label}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  function LineChart({ data, color }: { data: (number | null)[]; color: string }) {
    const valid = data.filter(d => d !== null) as number[];
    const max = Math.max(...valid, 1);
    const min = Math.min(...valid, 0);
    const w = 300;
    const h = 100;
    const stepX = w / 6;

    let path = '';
    data.forEach((v, i) => {
      if (v === null) return;
      const x = i * stepX;
      const y = h - 15 - ((v - min) / (max - min || 1)) * (h - 30);
      path += path ? ` L ${x} ${y}` : `M ${x} ${y}`;
    });

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {path && <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {data.map((v, i) => {
          if (v === null) return null;
          const x = i * stepX;
          const y = h - 15 - ((v - min) / (max - min || 1)) * (h - 30);
          return <circle key={i} cx={x} cy={y} r="3.5" fill={color} />;
        })}
        {last7Days.map((d, i) => (
          <text key={i} x={i * stepX} y={h - 2} textAnchor="middle" fill="#9ca3af" fontSize="9">{d.label}</text>
        ))}
      </svg>
    );
  }

  // CSV Export
  function exportWorkloadCsv() {
    const rows = last7Days.map(({ date, label }) => {
      const dayLessons = lessons.filter(l => l.completedDates?.includes(date));
      const lessonMinutes = dayLessons.reduce((s, l) => s + l.durationMinutes, 0);
      const dayTasks = tasks.filter(t => t.status === 'done' && t.completedAt?.startsWith(date) && !lessons.some(l => l.taskId === t.id));
      const extraMinutes = dayTasks.length * 60;
      return {
        日期: date,
        标签: label,
        课程时长分钟: lessonMinutes,
        任务时长分钟: extraMinutes,
        总时长分钟: lessonMinutes + extraMinutes,
        总时长小时: ((lessonMinutes + extraMinutes) / 60).toFixed(2),
      };
    });
    const csv = generateCsv(['日期', '标签', '课程时长分钟', '任务时长分钟', '总时长分钟', '总时长小时'], rows);
    downloadCsv(`lifetrack-workload-${formatLocalDate(new Date())}.csv`, csv);
  }

  function exportTasksCsv() {
    const rows = tasks.map(t => ({
      ID: t.id,
      标题: t.title,
      状态: t.status,
      优先级: t.priority,
      类型: t.scheduleType,
      是否重复: t.isRecurring ? '是' : '否',
      截止日期: t.dueDate || '',
      创建日期: t.createdAt.slice(0, 10),
      完成日期: t.completedAt?.slice(0, 10) || '',
    }));
    const csv = generateCsv(['ID', '标题', '状态', '优先级', '类型', '是否重复', '截止日期', '创建日期', '完成日期'], rows);
    downloadCsv(`lifetrack-tasks-${formatLocalDate(new Date())}.csv`, csv);
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }))}
                  className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">数据回顾</h1>
        </div>
        <p className="text-sm text-gray-400 mt-0.5">看看这段时间的进步 📈</p>
      </div>

      </div>

      <div className="p-4 space-y-4">
        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={exportWorkloadCsv}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> 导出工作量 CSV
          </button>
          <button
            onClick={exportTasksCsv}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> 导出任务 CSV
          </button>
        </div>

        {/* New badges toast */}
        {newBadges.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 rounded-xl p-3 flex items-center gap-3">
            <Trophy size={24} className="text-yellow-600" />
            <div>
              <div className="text-sm font-bold text-yellow-800">解锁新成就！</div>
              <div className="text-xs text-yellow-700">
                {newBadges.map(id => BADGE_DEFS.find(b => b.id === id)?.name).join('、')}
              </div>
            </div>
            <button onClick={() => setNewBadges([])} className="ml-auto text-yellow-600 text-xs">知道了</button>
          </div>
        )}

        {/* Focus Stats */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-900">专注统计</h2>
          </div>
          <div className="flex gap-4">
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-gray-900">{(totalFocusMinutes / 60).toFixed(1)}</div>
              <div className="text-xs text-gray-400">累计小时</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-gray-900">{thisWeekFocus.length}</div>
              <div className="text-xs text-gray-400">本周次数</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-gray-900">
                {focusSessions.length > 0 ? Math.round(totalFocusMinutes / focusSessions.length) : 0}
              </div>
              <div className="text-xs text-gray-400">平均分钟</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-gray-900">{focusStreak}</div>
              <div className="text-xs text-gray-400">连续天数</div>
            </div>
          </div>
        </div>

        {/* Focus Trend */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-900">专注趋势（小时）</h2>
          </div>
          <BarChart data={focusData} color="#3B82F6" />
        </div>

        {/* Workload Trend */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-fuchsia-600" />
            <h2 className="font-semibold text-gray-900">工作量趋势（小时）</h2>
          </div>
          <BarChart data={workloadData} color="#C026D3" />
        </div>

        {/* Tasks Done Trend */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <h2 className="font-semibold text-gray-900">任务完成数</h2>
          </div>
          <BarChart data={taskData} color="#10B981" />
        </div>

        {/* Sleep-Focus Correlation */}
        {sleepFocusCorr && sleepFocusCorr.qualityCorrelation.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit size={18} className="text-purple-500" />
              <h2 className="font-semibold text-gray-900">睡眠与专注关联分析</h2>
            </div>
            <p className="text-sm text-gray-700 mb-3">{sleepFocusCorr.recommendation}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">按睡眠质量</p>
                <div className="space-y-1.5">
                  {sleepFocusCorr.qualityCorrelation.map(q => (
                    <div key={q.quality} className="flex items-center gap-2">
                      <span className="text-xs w-8">{q.quality}分</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, q.avgFocusMinutes / 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{q.avgFocusMinutes}分</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">按睡眠时长</p>
                <div className="space-y-1.5">
                  {sleepFocusCorr.durationCorrelation.map(d => (
                    <div key={d.range} className="flex items-center gap-2">
                      <span className="text-xs w-10">{d.range}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, d.avgFocusMinutes / 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{d.avgFocusMinutes}分</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-400 text-center">
              基于 {sleepFocusCorr.qualityCorrelation.reduce((s, q) => s + q.days, 0)} 天数据 · 相关系数 {sleepFocusCorr.correlationCoefficient.toFixed(2)}
            </div>
          </div>
        )}

        {/* Sleep Trend */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <BedDouble size={18} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-900">睡眠时长（小时）</h2>
          </div>
          <LineChart data={sleepData} color="#6366F1" />
        </div>

        {/* Mood Timeline */}
        {moodEntries.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Smile size={18} className="text-yellow-500" />
              <h2 className="font-semibold text-gray-900">心情记录</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {moodEntries.slice(0, 7).map(m => (
                <div key={m.id} className="flex flex-col items-center min-w-[3rem]">
                  <div className="text-2xl">{m.emoji}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{m.date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goal Completion */}
        {goals.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-teal-500" />
              <h2 className="font-semibold text-gray-900">目标完成度</h2>
            </div>
            <div className="space-y-3">
              {goalStats.map(({ goal, total, completed }) => {
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.color }} />
                        <span className="text-sm font-medium text-gray-900">{goal.title}</span>
                      </div>
                      <span className="text-xs text-gray-500">{completed}/{total} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Badge Wall */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-900">成就徽章</h2>
            <span className="text-xs text-gray-400 ml-auto">
              {badgeUnlocks.length} / {BADGE_DEFS.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {BADGE_DEFS.map(badge => {
              const unlocked = badgeUnlocks.some(b => b.badgeId === badge.id);
              const Icon = badge.icon;
              return (
                <div key={badge.id}
                     className={`rounded-xl p-3 border ${unlocked ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}
                     style={unlocked ? { backgroundColor: badge.color + '10' } : {}}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                         style={{ backgroundColor: unlocked ? badge.color : '#e5e7eb' }}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">{badge.name}</div>
                  </div>
                  <div className="text-xs text-gray-400">{badge.desc}</div>
                  {unlocked && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      {new Date(badgeUnlocks.find(b => b.badgeId === badge.id)!.unlockedAt).toLocaleDateString('zh-CN')} 解锁
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

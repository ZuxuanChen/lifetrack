import { useState, useEffect } from 'react';
import { db, type Goal, type Task, type Lesson, type SleepRecord, type Habit, type HabitLog, type MoodEntry, todayLocal, formatLocalDate } from '../db';
import { Calendar, Target, ListTodo, Moon, ChevronRight, Clock, Star, Briefcase, CheckCircle2, Flame, Palette, Dumbbell, BarChart3, Smile, AlertTriangle, Bell, Lightbulb } from 'lucide-react';
import { isNotificationsEnabled, requestNotificationPermission, setNotificationsEnabled } from '../utils/notifications';
import { generateRecommendations, type Recommendation } from '../utils/recommendations';

interface Props {
  onNavigate: (tab: 'schedule' | 'task' | 'goal' | 'sleep' | 'habit' | 'stats') => void;
}


// 简单的 SVG 饼图组件
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  let cumulative = 0;
  const radius = 40;
  const cx = 50;
  const cy = 50;

  const slices = data.map((d) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: d.color,
      label: d.label,
      value: d.value,
    };
  });

  return (
    <div className="flex items-center gap-3">
      <svg width="80" height="80" viewBox="0 0 100 100">
        {slices.map((slice, i) => (
          <path key={i} d={slice.path} fill={slice.color} stroke="white" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r="18" fill="white" />
      </svg>
      <div className="flex-1 space-y-1">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
            <span className="truncate text-gray-600">{slice.label}</span>
            <span className="text-gray-400 shrink-0">{Math.round((slice.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardView({ onNavigate }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [moodEntry, setMoodEntry] = useState<MoodEntry | null>(null);
  const [showMoodForm, setShowMoodForm] = useState(false);
  const [moodEmoji, setMoodEmoji] = useState('😊');
  const [notifEnabled, setNotifEnabled] = useState(() => isNotificationsEnabled());

  async function toggleNotifications() {
    if (notifEnabled) {
      setNotificationsEnabled(false);
      setNotifEnabled(false);
    } else {
      const granted = await requestNotificationPermission();
      setNotifEnabled(granted);
    }
  }
  const [moodNote, setMoodNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  async function loadData() {
    const [g, t, l, s, h, hl, m, f] = await Promise.all([
      db.goals.toArray(),
      db.tasks.toArray(),
      db.lessons.toArray(),
      db.sleepRecords.toArray(),
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.moodEntries.toArray(),
      db.focusSessions.toArray(),
    ]);
    setGoals(g);
    setTasks(t);
    setLessons(l);
    s.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSleepRecords(s);
    setHabits(h);
    setHabitLogs(hl);
    const todayMood = m.find(e => e.date === todayLocal());
    setMoodEntry(todayMood || null);
    if (todayMood) {
      setMoodEmoji(todayMood.emoji);
      setMoodNote(todayMood.note);
    }
    setRecommendations(generateRecommendations(g, t, l, h, hl, s, f, m));
  }

  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const todayDateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const weekDayLabel = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][todayDayOfWeek];

  // Theme color picker
  const THEME_COLORS = [
    { name: '蓝', value: '#2563EB', bg: 'bg-blue-600' },
    { name: '绿', value: '#16A34A', bg: 'bg-green-600' },
    { name: '橙', value: '#EA580C', bg: 'bg-orange-600' },
    { name: '紫', value: '#7C3AED', bg: 'bg-violet-600' },
    { name: '粉', value: '#DB2777', bg: 'bg-pink-600' },
    { name: '青', value: '#0891B2', bg: 'bg-cyan-600' },
  ];
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('lifetrack-theme') || '#2563EB');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const applyTheme = (color: string) => {
    setThemeColor(color);
    localStorage.setItem('lifetrack-theme', color);
    setShowColorPicker(false);
  };

  const themeBgStyle = { backgroundColor: themeColor };


  // Streak: consecutive days with completed tasks
  const streak = (() => {
    let count = 0;
    const checkDate = new Date(today);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasDone = tasks.some(t =>
        t.status === 'done' && t.completedAt?.startsWith(dateStr)
      );
      if (hasDone) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  })();

  // Check if a lesson should appear on the given date
  function lessonVisibleOnDate(lesson: Lesson, date: Date): boolean {
    const dateStr = formatLocalDate(date);
    const day = date.getDay();
    if (lesson.repeatDays && lesson.repeatDays.length > 0) {
      if (!lesson.repeatDays.includes(day)) return false;
      if (lesson.startDate && dateStr < lesson.startDate) return false;
      if (lesson.endDate && dateStr > lesson.endDate) return false;
      return true;
    }
    if (lesson.dayOfWeek === day) return true;
    return false;
  }

  // Today's lessons
  const todayLessons = lessons
    .filter(l => lessonVisibleOnDate(l, today))
    .sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));

  // Important tasks
  const importantTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  const todayStr = todayLocal();
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < todayStr);

  // Goal progress
  const goalProgress = goals.map(goal => {
    const goalTasks = tasks.filter(t => t.goalId === goal.id);
    const doneCount = goalTasks.filter(t => t.status === 'done').length;
    const total = goalTasks.length || 1;
    return { goal, doneCount, total, percent: Math.round((doneCount / total) * 100) };
  });

  // Recent sleep
  const recentSleep = sleepRecords.slice(0, 3);

  // === Workload Stats ===
  const todayStr = todayLocal();

  // Course time: completed lessons today (per-date tracking via completedDates)
  const todayDoneLessons = lessons.filter(l =>
    l.completedDates?.includes(todayStr)
  );
  const courseTimeMinutes = todayDoneLessons.reduce((sum, l) => sum + l.durationMinutes, 0);

  // Project time: completed tasks without a lesson
  const todayDoneTasks = tasks.filter(t => {
    if (t.status !== 'done' || !t.completedAt) return false;
    return t.completedAt.startsWith(todayStr);
  });
  const tasksWithoutLessons = todayDoneTasks.filter(t => !lessons.some(l => l.taskId === t.id));
  const projectTimeMinutes = tasksWithoutLessons.length * 60;

  const totalMinutes = courseTimeMinutes + projectTimeMinutes;
  const courseTimeHours = (courseTimeMinutes / 60).toFixed(1);
  const projectTimeHours = (projectTimeMinutes / 60).toFixed(1);
  const totalWorkloadHours = (totalMinutes / 60).toFixed(1);

  const todayHabitLogs = habitLogs.filter(l => l.date === todayStr);
  const habitDoneCount = todayHabitLogs.length;
  const habitTotal = habits.length;

  // Quick toggle habit log
  async function toggleHabitLog(habitId: number, date: string) {
    const existing = habitLogs.find(l => l.habitId === habitId && l.date === date);
    if (existing) {
      await db.habitLogs.delete(existing.id!);
    } else {
      await db.habitLogs.add({ habitId, date });
    }
    loadData();
  }

  // Quick mark task done
  async function quickMarkTaskDone(taskId: number) {
    await db.tasks.update(taskId, { status: 'done', completedAt: new Date().toISOString() });
    loadData();
  }

  // Quick toggle lesson complete for today
  async function toggleLessonComplete(lesson: Lesson) {
    const today = todayLocal();
    const dates = lesson.completedDates || [];
    const hasToday = dates.includes(today);
    const newDates = hasToday ? dates.filter(d => d !== today) : [...dates, today];
    await db.lessons.update(lesson.id!, { completedDates: newDates });
    loadData();
  }
    const today = todayLocal();
    const existing = await db.moodEntries.where('date').equals(today).first();
    if (existing) {
      await db.moodEntries.update(existing.id!, { emoji: moodEmoji, note: moodNote.trim() });
    } else {
      await db.moodEntries.add({ date: today, emoji: moodEmoji, note: moodNote.trim() });
    }
    setShowMoodForm(false);
    loadData();
  }

  // Goal deadline urgency
  const goalDeadlineUrgency = goals.map(goal => {
    if (!goal.deadline || goalProgress.find(g => g.goal.id === goal.id)?.percent === 100) return null;
    const daysUntil = Math.ceil((new Date(goal.deadline + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { goal, level: 'overdue' as const, days: Math.abs(daysUntil) };
    if (daysUntil <= 3) return { goal, level: 'urgent' as const, days: daysUntil };
    if (daysUntil <= 7) return { goal, level: 'warning' as const, days: daysUntil };
    return null;
  }).filter(Boolean);
  const pieData = todayDoneLessons
    .map(lesson => ({
      label: lesson.title.length > 6 ? lesson.title.slice(0, 6) + '…' : lesson.title,
      value: lesson.durationMinutes,
      color: lesson.color,
    }))
    .filter(d => d.value > 0);

  // Mood trend
  const recentMoodEntries = moodEntries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);
  const moodDistribution = (() => {
    const map = new Map<string, number>();
    recentMoodEntries.forEach(e => { map.set(e.emoji, (map.get(e.emoji) || 0) + 1); });
    return map;
  })();
  const moodTrend = (() => {
    if (recentMoodEntries.length < 2) return null;
    const today = recentMoodEntries[0];
    const yesterday = recentMoodEntries[1];
    const score: Record<string, number> = { '😊': 5, '🙂': 4, '😐': 3, '😟': 2, '😫': 1 };
    const diff = (score[today.emoji] || 3) - (score[yesterday.emoji] || 3);
    if (diff > 0) return 'up';
    if (diff < 0) return 'down';
    return 'same';
  })();

  function calcDuration(bed: string, wake: string): number {
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    let bedMin = bh * 60 + bm;
    let wakeMin = wh * 60 + wm;
    if (wakeMin < bedMin) wakeMin += 24 * 60;
    return wakeMin - bedMin;
  }

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 text-white" style={themeBgStyle}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">总览</h1>
            <p className="text-sm text-white/70 mt-0.5">{todayDateStr} · {weekDayLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
                <Flame size={16} className="text-yellow-300" />
                <span className="text-sm font-bold">{streak}</span>
                <span className="text-xs text-white/80">天连击</span>
              </div>
            )}
            <div className="relative">
              <button onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                <Palette size={16} />
              </button>
              {showColorPicker && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-10 flex gap-1.5">
                  {THEME_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => applyTheme(c.value)}
                      className={`w-7 h-7 rounded-full border-2 ${themeColor === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Notification Toggle */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} className={notifEnabled ? 'text-blue-500' : 'text-gray-400'} />
            <span className="text-sm font-medium text-gray-900">提醒通知</span>
          </div>
          <button
            onClick={toggleNotifications}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              notifEnabled
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {notifEnabled ? '已开启' : '开启'}
          </button>
        </div>

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={18} className="text-yellow-500" />
              <h3 className="font-semibold text-gray-900">智能推荐</h3>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className={`p-2.5 rounded-lg text-sm ${
                  rec.priority === 'high' ? 'bg-red-50 border border-red-100' :
                  rec.priority === 'medium' ? 'bg-yellow-50 border border-yellow-100' :
                  'bg-gray-50 border border-gray-100'
                }`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{rec.priority === 'high' ? '重要' : rec.priority === 'medium' ? '建议' : '提示'}</span>
                    <span className="font-medium text-gray-800">{rec.title}</span>
                  </div>
                  <p className="text-gray-600 text-xs">{rec.description}</p>
                  {rec.action && (
                    <button
                      onClick={() => {
                        if (rec.type === 'task') onNavigate('task');
                        else if (rec.type === 'goal') onNavigate('task');
                        else if (rec.type === 'lesson') onNavigate('schedule');
                        else if (rec.type === 'habit') onNavigate('habit');
                        else if (rec.type === 'sleep') onNavigate('sleep');
                        else if (rec.type === 'focus') onNavigate('schedule');
                        else if (rec.type === 'mood') onNavigate('stats');
                      }}
                      className="text-xs text-blue-600 mt-1 hover:underline"
                    >{rec.action}</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Entry Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Habit Entry */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Dumbbell size={18} className="text-green-500" />
              <span className="text-xs font-medium text-green-600">{habitDoneCount}/{habitTotal}</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">习惯打卡</div>
            {habits.length > 0 ? (
              <div className="mt-2 space-y-1">
                {habits.slice(0, 3).map(habit => {
                  const logged = habitLogs.some(l => l.habitId === habit.id && l.date === todayStr);
                  return (
                    <button
                      key={habit.id}
                      onClick={() => toggleHabitLog(habit.id!, todayStr)}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors ${
                        logged ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${logged ? 'bg-green-500' : 'bg-gray-300'}`} style={logged ? {} : { backgroundColor: habit.color }} />
                      <span className="truncate flex-1 text-left">{habit.name}</span>
                      {logged && <CheckCircle2 size={12} />}
                    </button>
                  );
                })}
                {habits.length > 3 && (
                  <button onClick={() => onNavigate('habit')} className="text-xs text-blue-600 text-left w-full">
                    +{habits.length - 3} 更多…
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 mt-0.5">还没有习惯</div>
            )}
          </div>

          {/* Mood Entry */}
          <button onClick={() => setShowMoodForm(true)} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-left">
            <div className="flex items-center justify-between mb-2">
              <Smile size={18} className="text-yellow-500" />
              <span className="text-xl">{moodEntry?.emoji || '—'}</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">今日心情</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {moodEntry ? moodEntry.note || '已记录' : '点我记录'}
            </div>
          </button>

          {/* Stats Entry */}
          <button onClick={() => onNavigate('stats')} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-left">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 size={18} className="text-blue-500" />
            </div>
            <div className="text-sm font-semibold text-gray-900">数据回顾</div>
            <div className="text-xs text-gray-400 mt-0.5">查看统计</div>
          </button>
        </div>

        {/* Workload Stats Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={18} className="text-fuchsia-600" />
            <h2 className="font-semibold text-gray-900">今日工作量</h2>
          </div>

          <div className="flex gap-3 mb-3">
            <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-700">{courseTimeHours}</div>
              <div className="text-[10px] text-blue-500">课程时间(h)</div>
            </div>
            <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-orange-700">{projectTimeHours}</div>
              <div className="text-[10px] text-orange-500">项目时间(h)</div>
            </div>
            <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-purple-700">{totalWorkloadHours}</div>
              <div className="text-[10px] text-purple-500">总时长(h)</div>
            </div>
          </div>

          {pieData.length > 0 && <PieChart data={pieData} />}

          {todayDoneLessons.length === 0 && tasksWithoutLessons.length === 0 ? (
            <p className="text-sm text-gray-400 mt-3">今天还没有完成任务，加油！💪</p>
          ) : (
            <div className="space-y-1.5 mt-3">
              {todayDoneLessons.slice(0, 3).map(lesson => (
                <div key={lesson.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  <span className="truncate">{lesson.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDuration(lesson.durationMinutes)}
                  </span>
                </div>
              ))}
              {tasksWithoutLessons.slice(0, Math.max(0, 3 - todayDoneLessons.length)).map(task => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  <span className="truncate">{task.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">60分钟</span>
                </div>
              ))}
              {(todayDoneLessons.length + tasksWithoutLessons.length) > 3 && (
                <p className="text-xs text-gray-400 mt-1">
                  还有 {todayDoneLessons.length + tasksWithoutLessons.length - 3} 个…
                </p>
              )}
            </div>
          )}
        </div>

        {/* Overdue Tasks Alert */}
        {overdueTasks.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-700">
                {overdueTasks.length} 个任务已过期
              </span>
              <button onClick={() => onNavigate('task')} className="ml-auto text-xs text-red-600 font-medium">
                去处理 →
              </button>
            </div>
          </div>
        )}

        {/* Today's Schedule */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              <h2 className="font-semibold text-gray-900">今日日程</h2>
            </div>
            <button onClick={() => onNavigate('schedule')} className="text-xs text-blue-600 flex items-center gap-0.5">
              查看全部 <ChevronRight size={14} />
            </button>
          </div>
          {todayLessons.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">今天没有课，可以摸鱼了 🐟</p>
          ) : (
            <div className="space-y-2">
              {todayLessons.map(lesson => {
                const isDone = lesson.completedDates?.includes(todayStr);
                const now = new Date();
                const nowMin = now.getHours() * 60 + now.getMinutes();
                const startMin = lesson.startHour * 60 + lesson.startMinute;
                const endMin = startMin + lesson.durationMinutes;
                const isActive = !isDone && nowMin >= startMin && nowMin < endMin;
                const isPast = !isDone && nowMin >= endMin;
                const isUpcoming = !isDone && nowMin < startMin;
                return (
                  <div key={lesson.id} className={`flex items-center gap-3 rounded-lg p-2 ${isActive ? 'bg-blue-50 border border-blue-100' : ''}`}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lesson.color }} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>{lesson.title}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <span>{lesson.startHour.toString().padStart(2, '0')}:{lesson.startMinute.toString().padStart(2, '0')} · {lesson.durationMinutes}分钟</span>
                        {isActive && <span className="text-blue-600 font-medium">进行中</span>}
                        {isDone && <span className="text-green-600">已完成</span>}
                        {isPast && <span className="text-gray-400">已结束</span>}
                        {isUpcoming && <span className="text-orange-500">即将开始</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLessonComplete(lesson)}
                      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
                      }`}
                      title={isDone ? '取消完成' : '标记完成'}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Important Tasks */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListTodo size={18} className="text-orange-500" />
              <h2 className="font-semibold text-gray-900">重要任务</h2>
            </div>
            <button onClick={() => onNavigate('task')} className="text-xs text-blue-600 flex items-center gap-0.5">
              查看全部 <ChevronRight size={14} />
            </button>
          </div>
          {importantTasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">所有任务已完成 🎉 可以躺平了</p>
          ) : (
            <div className="space-y-2">
              {importantTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2">
                  <button
                    onClick={() => quickMarkTaskDone(task.id!)}
                    className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center transition-colors"
                    title="标记完成"
                  >
                    <CheckCircle2 size={12} className="text-green-500 opacity-0 hover:opacity-100" />
                  </button>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    task.priority === 3 ? 'bg-red-500' : task.priority === 2 ? 'bg-orange-400' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 truncate">{task.title}</div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {task.status === 'in_progress' ? '进行中' : '待办'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goal Deadline Alerts */}
        {goalDeadlineUrgency.length > 0 && (
          <div className="space-y-2">
            {goalDeadlineUrgency.map(({ goal, level, days }) => (
              <div
                key={goal.id}
                className={`rounded-xl p-3 shadow-sm border text-left flex items-center gap-2 ${
                  level === 'overdue'
                    ? 'bg-red-50 border-red-200'
                    : level === 'urgent'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <AlertTriangle size={16} className={
                  level === 'overdue' ? 'text-red-500' : level === 'urgent' ? 'text-orange-500' : 'text-yellow-500'
                } />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    level === 'overdue' ? 'text-red-700' : level === 'urgent' ? 'text-orange-700' : 'text-yellow-700'
                  }`}>
                    {goal.title}
                  </div>
                  <div className={`text-xs ${
                    level === 'overdue' ? 'text-red-500' : level === 'urgent' ? 'text-orange-500' : 'text-yellow-600'
                  }`}>
                    {level === 'overdue' ? `已过期 ${days} 天` : `还有 ${days} 天截止`}
                  </div>
                </div>
                <button onClick={() => onNavigate('goal')} className="text-xs font-medium shrink-0"
                  style={{ color: level === 'overdue' ? '#DC2626' : level === 'urgent' ? '#EA580C' : '#CA8A04' }}
                >
                  去处理 →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Goal Progress */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-green-500" />
              <h2 className="font-semibold text-gray-900">目标进度</h2>
            </div>
            <button onClick={() => onNavigate('goal')} className="text-xs text-blue-600 flex items-center gap-0.5">
              查看全部 <ChevronRight size={14} />
            </button>
          </div>
          {goalProgress.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">还没有设定目标，先立个 flag 🚩</p>
          ) : (
            <div className="space-y-3">
              {goalProgress.map(({ goal, doneCount, total, percent }) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.color }} />
                      <span className="text-sm text-gray-800">{goal.title}</span>
                    </div>
                    <span className="text-xs text-gray-400">{doneCount}/{total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percent}%`, backgroundColor: goal.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sleep */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Moon size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-900">近期睡眠</h2>
            </div>
            <button onClick={() => onNavigate('sleep')} className="text-xs text-blue-600 flex items-center gap-0.5">
              查看全部 <ChevronRight size={14} />
            </button>
          </div>
          {recentSleep.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">还没有睡眠记录，别熬了早点睡 😴</p>
          ) : (
            <div className="space-y-2">
              {recentSleep.map(record => {
                const d = new Date(record.date);
                const duration = calcDuration(record.bedTime, record.wakeTime);
                return (
                  <div key={record.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {d.getMonth() + 1}/{d.getDate()} · {formatDuration(duration)}
                      </span>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          size={12}
                          className={s <= record.quality ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mood Trend */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smile size={18} className="text-yellow-500" />
              <h2 className="font-semibold text-gray-900">心情趋势</h2>
            </div>
            {moodTrend && (
              <span className={`text-xs font-medium ${
                moodTrend === 'up' ? 'text-green-600' : moodTrend === 'down' ? 'text-red-500' : 'text-gray-400'
              }`}>
                {moodTrend === 'up' ? '↑ 比昨天好' : moodTrend === 'down' ? '↓ 比昨天差' : '→ 持平'}
              </span>
            )}
          </div>
          {recentMoodEntries.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">还没有心情记录，点上方卡片记录一下 😊</p>
          ) : (
            <div className="space-y-3">
              {/* Recent 7 days */}
              <div className="flex items-center gap-1">
                {recentMoodEntries.slice().reverse().map(e => (
                  <button
                    key={e.date}
                    onClick={() => onNavigate('stats')}
                    className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    title={`${e.date}${e.note ? ': ' + e.note : ''}`}
                  >
                    <span className="text-lg">{e.emoji}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(e.date).getMonth() + 1}/{new Date(e.date).getDate()}
                    </span>
                  </button>
                ))}
              </div>
              {/* Distribution */}
              {moodDistribution.size > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <span className="text-xs text-gray-500">分布：</span>
                  {Array.from(moodDistribution.entries()).map(([emoji, count]) => (
                    <span key={emoji} className="flex items-center gap-0.5 text-xs text-gray-600">
                      <span>{emoji}</span>
                      <span className="font-medium">{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mood Form Modal */}
        {showMoodForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
               onClick={() => setShowMoodForm(false)}>
            <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
                 onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">今日心情</h2>
                <button onClick={() => setShowMoodForm(false)}>
                  <span className="text-gray-400 text-xl">&times;</span>
                </button>
              </div>
              <div className="flex justify-center gap-3 mb-4">
                {['😊', '🙂', '😐', '😟', '😫'].map(emoji => (
                  <button key={emoji} onClick={() => setMoodEmoji(emoji)}
                          className={`text-3xl p-2 rounded-xl transition-transform ${moodEmoji === emoji ? 'bg-yellow-100 scale-110' : 'hover:bg-gray-100'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
              <textarea value={moodNote} onChange={e => setMoodNote(e.target.value)}
                        placeholder="写点什么...（可选）"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none h-20" />
              <button onClick={saveMood}
                      className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium">
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

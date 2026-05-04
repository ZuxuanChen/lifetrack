import { useState, useEffect } from 'react';
import { db, type Goal, type Task, type Lesson, type SleepRecord, type Habit, type HabitLog, type MoodEntry, todayLocal } from '../db';
import { Calendar, Target, ListTodo, Moon, ChevronRight, Clock, Star, Briefcase, CheckCircle2, Flame, Palette, Dumbbell, BarChart3, Smile } from 'lucide-react';

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
  const [moodNote, setMoodNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [g, t, l, s, h, hl, m] = await Promise.all([
      db.goals.toArray(),
      db.tasks.toArray(),
      db.lessons.toArray(),
      db.sleepRecords.toArray(),
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.moodEntries.toArray(),
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
    if (lesson.dayOfWeek !== date.getDay()) return false;
    if (!lesson.isRecurring) return true;
    const dateStr = date.toISOString().split('T')[0];
    if (lesson.startDate && dateStr < lesson.startDate) return false;
    if (lesson.endDate && dateStr > lesson.endDate) return false;
    return true;
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
  const todayDoneTasks = tasks.filter(t => {
    if (t.status !== 'done' || !t.completedAt) return false;
    return t.completedAt.startsWith(todayStr);
  });

  const completedTaskIds = new Set(todayDoneTasks.map(t => t.id));
  const todayWorkloadMinutes = lessons
    .filter(l => l.taskId && completedTaskIds.has(l.taskId))
    .reduce((sum, l) => sum + l.durationMinutes, 0);

  const tasksWithoutLessons = todayDoneTasks.filter(t => !lessons.some(l => l.taskId === t.id));
  const estimatedExtraMinutes = tasksWithoutLessons.length * 60;
  const totalWorkloadHours = ((todayWorkloadMinutes + estimatedExtraMinutes) / 60).toFixed(1);

  const todayHabitLogs = habitLogs.filter(l => l.date === todayStr);
  const habitDoneCount = todayHabitLogs.length;
  const habitTotal = habits.length;

  async function saveMood() {
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

  // Pie chart data
  const pieData = todayDoneTasks
    .map(task => {
      const lesson = lessons.find(l => l.taskId === task.id);
      return {
        label: task.title.length > 6 ? task.title.slice(0, 6) + '…' : task.title,
        value: lesson ? lesson.durationMinutes : 60,
        color: lesson?.color || '#888888',
      };
    })
    .filter(d => d.value > 0);

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
        {/* Quick Entry Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Habit Entry */}
          <button onClick={() => onNavigate('habit')} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-left">
            <div className="flex items-center justify-between mb-2">
              <Dumbbell size={18} className="text-green-500" />
              <span className="text-xs font-medium text-green-600">{habitDoneCount}/{habitTotal}</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">习惯打卡</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {habitTotal === 0 ? '还没有习惯' : habitDoneCount >= habitTotal ? '今日全勤 🎉' : `还有 ${habitTotal - habitDoneCount} 个`}
            </div>
          </button>

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

        {/* Workload Stats Card with Pie Chart */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={18} className="text-fuchsia-600" />
            <h2 className="font-semibold text-gray-900">今日工作量</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center shrink-0">
              <div className="text-3xl font-bold text-gray-900">{totalWorkloadHours}</div>
              <div className="text-xs text-gray-400">小时</div>
            </div>
            {pieData.length > 0 && <PieChart data={pieData} />}
          </div>

          {todayDoneTasks.length === 0 ? (
            <p className="text-sm text-gray-400 mt-3">今天还没有完成任务，加油！💪</p>
          ) : (
            <div className="space-y-1.5 mt-3">
              {todayDoneTasks.slice(0, 3).map(task => {
                const linkedLesson = lessons.find(l => l.taskId === task.id);
                return (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    <span className="truncate">{task.title}</span>
                    {linkedLesson && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatDuration(linkedLesson.durationMinutes)}
                      </span>
                    )}
                  </div>
                );
              })}
              {todayDoneTasks.length > 3 && (
                <p className="text-xs text-gray-400 mt-1">还有 {todayDoneTasks.length - 3} 个任务…</p>
              )}
            </div>
          )}
        </div>

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
              {todayLessons.map(lesson => (
                <div key={lesson.id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lesson.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{lesson.title}</div>
                    <div className="text-xs text-gray-400">
                      {lesson.startHour.toString().padStart(2, '0')}:{lesson.startMinute.toString().padStart(2, '0')} · {lesson.durationMinutes}分钟
                    </div>
                  </div>
                </div>
              ))}
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

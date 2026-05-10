import { useState, useEffect } from 'react';
import { db, type Habit, type HabitLog, formatLocalDate, todayLocal, COLORS } from '../db';
import { Plus, X, Trash2, ArrowLeft } from 'lucide-react';

const FUN_QUOTES = [
  "不要骗自己哦～",
  "穿越时空的打卡？",
  "补卡成功，但时间都知道 😉",
  "未来的你给现在的你点了个赞 👍",
  "这次是真的哦？",
  "打卡成功，记得下次准时！",
  "时间旅行者认证成功 🚀",
];

export default function HabitView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('⭐');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [toast, setToast] = useState<string | null>(null);

  const today = todayLocal();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function loadData() {
    const [h, l] = await Promise.all([db.habits.toArray(), db.habitLogs.toArray()]);
    setHabits(h);
    setLogs(l);
  }

  function isLogged(habitId: number, date: string): boolean {
    return logs.some(l => l.habitId === habitId && l.date === date);
  }

  async function toggleLog(habitId: number, date: string) {
    if (date > today) {
      alert('还不能给未来打卡哦 👀');
      return;
    }

    const existing = logs.find(l => l.habitId === habitId && l.date === date);
    if (existing) {
      await db.habitLogs.delete(existing.id!);
    } else {
      await db.habitLogs.add({ habitId, date });
    }

    if (date < today && !existing) {
      const quote = FUN_QUOTES[Math.floor(Math.random() * FUN_QUOTES.length)];
      setToast(quote);
    }

    loadData();
  }

  async function addHabit() {
    if (!newName.trim()) return;
    await db.habits.add({
      name: newName.trim(),
      color: newColor,
      icon: newIcon,
      createdAt: new Date().toISOString(),
    });
    setShowForm(false);
    setNewName('');
    setNewIcon('⭐');
    setNewColor(COLORS[0]);
    loadData();
  }

  async function deleteHabit(id: number) {
    if (!confirm('确定删除这个习惯吗？相关的打卡记录也会删除。')) return;
    await db.habits.delete(id);
    const relatedLogs = await db.habitLogs.where('habitId').equals(id).toArray();
    await db.habitLogs.bulkDelete(relatedLogs.map(l => l.id!));
    loadData();
  }

  // Generate last 35 days (5 weeks) for heatmap
  const days: { date: string; label: string; dayNum: number }[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = formatLocalDate(d);
    days.push({
      date: ds,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dayNum: d.getDate(),
    });
  }
  // Group into weeks (Mon-Sun)
  const weeks: { date: string; label: string; dayNum: number }[][] = [];
  let currentWeek: typeof days = [];
  for (const day of days) {
    const dow = new Date(day.date + 'T00:00:00').getDay(); // 0=Sun, 1=Mon...
    const mondayBased = dow === 0 ? 6 : dow - 1; // 0=Mon, 6=Sun
    if (mondayBased === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  function getIntensity(habitId: number, date: string): string {
    // Return hex alpha based on streak length around this date
    const habitLogs = logs.filter(l => l.habitId === habitId).map(l => l.date).sort();
    const idx = habitLogs.indexOf(date);
    if (idx === -1) return '00';
    // Count consecutive days including this one (backward)
    let consecutive = 1;
    for (let i = idx - 1; i >= 0; i--) {
      const prev = new Date(habitLogs[i] + 'T00:00:00');
      const curr = new Date(habitLogs[i + 1] + 'T00:00:00');
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) consecutive++;
      else break;
    }
    if (consecutive >= 7) return 'FF';
    if (consecutive >= 5) return 'CC';
    if (consecutive >= 3) return '99';
    if (consecutive >= 2) return '66';
    return '44';
  }

  function calcStreak(habitId: number): number {
    const dates = logs
      .filter(l => l.habitId === habitId)
      .map(l => l.date)
      .sort();
    if (dates.length === 0) return 0;

    const dateSet = new Set(dates);
    let streak = 0;
    let checkDate = today;

    // If today not logged, check yesterday
    if (!dateSet.has(checkDate)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = formatLocalDate(yesterday);
      if (!dateSet.has(yestStr)) return 0;
      checkDate = yestStr;
    }

    while (dateSet.has(checkDate)) {
      streak++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = formatLocalDate(d);
    }
    return streak;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700 ">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }))}
                    className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold">习惯打卡</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white p-2 rounded-full shadow-sm">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Habit list */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {habits.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400 dark:text-gray-500 text-sm">还没有习惯，先立一个小目标吧 🎯</p>
          </div>
        )}

        {habits.map(habit => {
          const loggedToday = isLogged(habit.id!, today);
          const streak = calcStreak(habit.id!);
          return (
            <div key={habit.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                       style={{ backgroundColor: habit.color + '20' }}>
                    {habit.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 ">{habit.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                      <span>{days.filter(d => isLogged(habit.id!, d.date)).length} / 30 天</span>
                      {streak > 0 && (
                        <span className="text-orange-500 font-medium">🔥 {streak} 天连续</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLog(habit.id!, today)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      loggedToday
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                    style={loggedToday ? { backgroundColor: habit.color } : undefined}
                  >
                    {loggedToday ? '已打卡' : '打卡'}
                  </button>
                  <button onClick={() => deleteHabit(habit.id!)} className="p-2 text-gray-300 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Heatmap - 7-day week layout */}
              <div className="mt-2">
                <div className="grid grid-cols-7 gap-1 max-w-xs">
                  {weeks.map((week, wi) =>
                    week.map((day, di) => {
                      const logged = isLogged(habit.id!, day.date);
                      const isToday = day.date === today;
                      const intensity = logged ? getIntensity(habit.id!, day.date) : 0;
                      return (
                        <button
                          key={`${wi}-${di}`}
                          onClick={() => toggleLog(habit.id!, day.date)}
                          title={day.label}
                          className="flex flex-col items-center"
                        >
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-sm transition-all hover:scale-110 ${isToday ? 'ring-2 ring-offset-1' : ''}`}
                            style={{
                              backgroundColor: logged ? `${habit.color}${intensity}` : '#f3f4f6',
                              boxShadow: isToday ? `0 0 0 2px white, 0 0 0 4px ${habit.color}` : undefined,
                            }}
                          />
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1 max-w-xs text-center text-[9px] text-gray-400 dark:text-gray-500 mt-1">
                  {['一','二','三','四','五','六','日'].map(d => <span key={d}>{d}</span>)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Habit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">添加习惯</h2>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400 dark:text-gray-500 " /></button>
              </div>
              <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">习惯名称</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                       placeholder="比如：早起、喝水、阅读"
                       className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">图标（emoji）</label>
                <input value={newIcon} onChange={e => setNewIcon(e.target.value.slice(0, 2))}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl" />
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">颜色</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                            className={`w-8 h-8 rounded-full border-2 ${newColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <button onClick={addHabit}
                      className="w-full mt-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium">
                添加
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fun quote toast */}
      {toast && (
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-4 py-2 rounded-full text-sm shadow-lg animate-bounce">
          {toast}
        </div>
      )}

      {/* CSS for 15-column grid */}
      <style>{`
        .grid-cols-15 {
          grid-template-columns: repeat(15, minmax(0, 1fr));
        }
      `}</style>
    </div>
  );
}

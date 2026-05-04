import { useState, useEffect } from 'react';
import { db, type Habit, type HabitLog, formatLocalDate, todayLocal } from '../db';
import { Plus, X, Trash2, ArrowLeft } from 'lucide-react';

const COLORS = [
  '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1'
];

export default function HabitView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('⭐');
  const [newColor, setNewColor] = useState(COLORS[0]);

  const today = todayLocal();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [h, l] = await Promise.all([db.habits.toArray(), db.habitLogs.toArray()]);
    setHabits(h);
    setLogs(l);
  }

  function isLogged(habitId: number, date: string): boolean {
    return logs.some(l => l.habitId === habitId && l.date === date);
  }

  async function toggleToday(habitId: number) {
    const existing = logs.find(l => l.habitId === habitId && l.date === today);
    if (existing) {
      await db.habitLogs.delete(existing.id!);
    } else {
      await db.habitLogs.add({ habitId, date: today });
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

  // Generate last 30 days for the grid
  const days: { date: string; label: string; dayNum: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = formatLocalDate(d);
    days.push({
      date: ds,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dayNum: d.getDate(),
    });
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }))}
                    className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
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
            <p className="text-gray-400 text-sm">还没有习惯，先立一个小目标吧 🎯</p>
          </div>
        )}

        {habits.map(habit => {
          const loggedToday = isLogged(habit.id!, today);
          return (
            <div key={habit.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                       style={{ backgroundColor: habit.color + '20' }}>
                    {habit.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{habit.name}</div>
                    <div className="text-xs text-gray-400">
                      {days.filter(d => isLogged(habit.id!, d.date)).length} / 30 天
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleToday(habit.id!)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      loggedToday
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

              {/* Mini calendar grid */}
              <div className="grid grid-cols-15 gap-1">
                {days.map(d => {
                  const logged = isLogged(habit.id!, d.date);
                  const isToday = d.date === today;
                  return (
                    <div key={d.date} className="flex flex-col items-center">
                      <div
                        className={`w-full aspect-square rounded-md ${isToday ? 'ring-2 ring-offset-1' : ''}`}
                        style={{
                          backgroundColor: logged ? habit.color : '#f3f4f6',
                          boxShadow: isToday ? `0 0 0 2px white, 0 0 0 4px ${habit.color}` : undefined,
                        }}
                      />
                      <span className="text-[9px] text-gray-400 mt-0.5">{d.dayNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Habit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">添加习惯</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">习惯名称</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                       placeholder="比如：早起、喝水、阅读"
                       className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-500">图标（emoji）</label>
                <input value={newIcon} onChange={e => setNewIcon(e.target.value.slice(0, 2))}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl" />
              </div>
              <div>
                <label className="text-sm text-gray-500">颜色</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                            className={`w-8 h-8 rounded-full border-2 ${newColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <button onClick={addHabit}
                    className="w-full mt-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium">
              添加
            </button>
          </div>
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

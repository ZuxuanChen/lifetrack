import { useState, useEffect } from 'react';
import { db, type Goal, COLORS } from '../db';
import { Plus, X, Target, CalendarDays, ArrowLeft, Clock } from 'lucide-react';


export default function GoalView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTaskCounts, setGoalTaskCounts] = useState<Record<number, { total: number; done: number }>>({});
  const [goalLessonMinutes, setGoalLessonMinutes] = useState<Record<number, { total: number; completed: number }>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    const [allGoals, allTasks, allLessons] = await Promise.all([db.goals.toArray(), db.tasks.toArray(), db.lessons.toArray()]);
    setGoals(allGoals.reverse());
    const counts: Record<number, { total: number; done: number }> = {};
    const lessonMinutes: Record<number, { total: number; completed: number }> = {};
    for (const g of allGoals) {
      const related = allTasks.filter(t => t.goalId === g.id);
      counts[g.id!] = { total: related.length, done: related.filter(t => t.status === 'done').length };
      // Calculate lesson time investment
      const relatedLessons = allLessons.filter(l => l.taskId && related.some(t => t.id === l.taskId));
      const totalMin = relatedLessons.reduce((s, l) => s + l.durationMinutes, 0);
      const completedMin = relatedLessons
        .filter(l => l.completedDates && l.completedDates.length > 0)
        .reduce((s, l) => s + l.durationMinutes * (l.completedDates?.length || 0), 0);
      lessonMinutes[g.id!] = { total: totalMin, completed: completedMin };
    }
    setGoalTaskCounts(counts);
    setGoalLessonMinutes(lessonMinutes);
  }

  function openForm(goal?: Goal) {
    if (goal) {
      setEditing(goal);
      setTitle(goal.title);
      setDescription(goal.description);
      setDeadline(goal.deadline || '');
      setColor(goal.color);
    } else {
      setEditing(null);
      setTitle('');
      setDescription('');
      setDeadline('');
      setColor(COLORS[0]);
    }
    setShowForm(true);
  }

  async function saveGoal() {
    const data = {
      id: editing?.id,
      title: title.trim() || '未命名目标',
      description: description.trim(),
      deadline: deadline || undefined,
      color,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    if (editing?.id) {
      await db.goals.update(editing.id, data);
    } else {
      await db.goals.add(data);
    }
    setShowForm(false);
    loadGoals();
  }

  async function deleteGoal() {
    if (editing?.id && confirm('确定删除这个目标吗？相关任务不会受影响。')) {
      await db.goals.delete(editing.id);
      setShowForm(false);
      loadGoals();
    }
  }

  function formatDate(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }))}
                  className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">我的目标</h1>
        </div>
        <button onClick={() => openForm()} className="bg-blue-600 text-white p-2 rounded-full shadow-sm">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {goals.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <Target size={48} className="mx-auto mb-3 opacity-40" />
            <p>还没有目标，点击右上角添加</p>
          </div>
        )}

        {goals.map(goal => {
          const progress = goalTaskCounts[goal.id!];
          const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
          return (
            <button
              key={goal.id}
              onClick={() => openForm(goal)}
              className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: goal.color }} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{goal.description}</p>
                  )}
                  {progress && progress.total > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span>进度 {progress.done}/{progress.total}</span>
                        <span className={pct === 100 ? 'text-green-600 font-medium' : ''}>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {goalLessonMinutes[goal.id!] && goalLessonMinutes[goal.id!].total > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <Clock size={12} />
                      <span>
                        已投入 {Math.floor(goalLessonMinutes[goal.id!].completed / 60)}小时{goalLessonMinutes[goal.id!].completed % 60}分钟
                        {goalLessonMinutes[goal.id!].total > goalLessonMinutes[goal.id!].completed && (
                          <span className="text-gray-300"> / 总计 {Math.floor(goalLessonMinutes[goal.id!].total / 60)}小时{goalLessonMinutes[goal.id!].total % 60}分钟</span>
                        )}
                      </span>
                    </div>
                  )}
                  {goal.deadline && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <CalendarDays size={12} />
                      <span>截止: {formatDate(goal.deadline)}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? '编辑目标' : '添加目标'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">目标名称</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm text-gray-500">描述</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                          rows={3}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="text-sm text-gray-500">截止日期（可选）</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm text-gray-500">颜色</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                            className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              {editing && (
                <button onClick={deleteGoal}
                        className="px-4 py-2.5 rounded-xl text-red-600 bg-red-50 font-medium">
                  删除
                </button>
              )}
              <button onClick={saveGoal}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

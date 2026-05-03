import { useState, useEffect } from 'react';
import { db, type Task, type Goal } from '../db';
import { Plus, X, CheckCircle2, Circle, Clock, ArrowRight, Filter, Repeat, Zap } from 'lucide-react';

type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done';

const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
};

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
  done: 'bg-green-100 text-green-600',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: '低',
  2: '中',
  3: '高',
};

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-500',
  2: 'bg-orange-100 text-orange-600',
  3: 'bg-red-100 text-red-600',
};

export default function TaskView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [showFilter, setShowFilter] = useState(false);

  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState(2);
  const [status, setStatus] = useState<Task['status']>('todo');
  const [scheduleType, setScheduleType] = useState<Task['scheduleType']>('single');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [allTasks, allGoals] = await Promise.all([
      db.tasks.toArray(),
      db.goals.toArray(),
    ]);
    setTasks(allTasks.reverse());
    setGoals(allGoals);
  }

  function openForm(task?: Task) {
    if (task) {
      setEditing(task);
      setTitle(task.title);
      setGoalId(task.goalId);
      setPriority(task.priority);
      setStatus(task.status);
      setScheduleType(task.scheduleType);
    } else {
      setEditing(null);
      setTitle('');
      setGoalId(undefined);
      setPriority(2);
      setStatus('todo');
      setScheduleType('single');
    }
    setShowForm(true);
  }

  async function saveTask() {
    const data = {
      id: editing?.id,
      title: title.trim() || '未命名任务',
      goalId: goalId || undefined,
      priority,
      status,
      scheduleType,
      createdAt: editing?.createdAt || new Date().toISOString(),
      completedAt: status === 'done' ? (editing?.completedAt || new Date().toISOString()) : undefined,
    };
    if (editing?.id) {
      await db.tasks.update(editing.id, data);
    } else {
      await db.tasks.add(data);
    }
    setShowForm(false);
    loadData();
  }

  async function deleteTask() {
    if (editing?.id && confirm('确定删除这个任务吗？')) {
      await db.tasks.delete(editing.id);
      setShowForm(false);
      loadData();
    }
  }

  async function toggleStatus(task: Task) {
    const newStatus: Task['status'] = task.status === 'done' ? 'todo' : 'done';
    await db.tasks.update(task.id!, {
      status: newStatus,
      completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
    });
    loadData();
  }

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">任务追踪</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowFilter(!showFilter)} className="p-2 text-gray-500">
              <Filter size={18} />
            </button>
            <button onClick={() => openForm()} className="bg-blue-600 text-white p-2 rounded-full shadow-sm">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-xs text-gray-500 mb-1">
          <span>总: {stats.total}</span>
          <span className="text-green-600">已完成: {stats.done}</span>
          <span className="text-blue-600">进行中: {stats.inProgress}</span>
          <span className="text-gray-400">待办: {stats.todo}</span>
        </div>

        {/* Filter chips */}
        {showFilter && (
          <div className="flex gap-2 mt-2">
            {(['all', 'todo', 'in_progress', 'done'] as FilterStatus[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                {f === 'all' ? '全部' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredTasks.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <CheckCircle2 size={48} className="mx-auto mb-3 opacity-40" />
            <p>没有任务</p>
          </div>
        )}

        {filteredTasks.map(task => {
          const goal = goals.find(g => g.id === task.goalId);
          return (
            <div key={task.id}
                 className={`bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-start gap-3 ${task.status === 'done' ? 'opacity-60' : ''}`}>
              <button onClick={() => toggleStatus(task)} className="mt-0.5 shrink-0">
                {task.status === 'done' ? (
                  <CheckCircle2 size={22} className="text-green-500" />
                ) : task.status === 'in_progress' ? (
                  <Clock size={22} className="text-blue-500" />
                ) : (
                  <Circle size={22} className="text-gray-300" />
                )}
              </button>

              <button onClick={() => openForm(task)} className="flex-1 text-left min-w-0">
                <div className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {task.title}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {PRIORITY_LABELS[task.priority]}优先级
                  </span>
                  {task.scheduleType === 'recurring' ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 flex items-center gap-0.5">
                      <Repeat size={10} /> 多次
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-0.5">
                      <Zap size={10} /> 单次
                    </span>
                  )}
                  {goal && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <ArrowRight size={10} />
                      {goal.title}
                    </span>
                  )}
                </div>
              </button>
            </div>
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
              <h2 className="text-lg font-bold">{editing ? '编辑任务' : '添加任务'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">任务名称</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm text-gray-500">关联目标（可选）</label>
                <select value={goalId || ''} onChange={e => setGoalId(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">无</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-500">优先级</label>
                  <select value={priority} onChange={e => setPriority(Number(e.target.value))}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg">
                    {[3, 2, 1].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-500">状态</label>
                  <select value={status} onChange={e => setStatus(e.target.value as Task['status'])}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="todo">待办</option>
                    <option value="in_progress">进行中</option>
                    <option value="done">已完成</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">排课类型</label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setScheduleType('single')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                      scheduleType === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Zap size={12} /> 单次（用完消失）
                  </button>
                  <button
                    onClick={() => setScheduleType('recurring')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                      scheduleType === 'recurring' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Repeat size={12} /> 多次（可反复用）
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              {editing && (
                <button onClick={deleteTask}
                        className="px-4 py-2.5 rounded-xl text-red-600 bg-red-50 font-medium">
                  删除
                </button>
              )}
              <button onClick={saveTask}
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

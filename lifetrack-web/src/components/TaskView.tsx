import { useState, useEffect } from 'react';
import { db, type Task, type Goal, COLORS } from '../db';
import { Plus, X, CheckCircle2, Circle, Clock, ArrowRight, Filter, Repeat, Zap, ArrowUpDown, ArrowLeft } from 'lucide-react';

type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done' | 'overdue';
type SortOrder = 'default' | 'priorityDesc' | 'priorityAsc' | 'dueDateAsc';

const STATUS_LABELS: Record<string, string> = {
  all: '全部',
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  overdue: '已过期',
};

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-100 dark:bg-gray-700 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
  done: 'bg-green-100 text-green-600',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: '低',
  2: '中',
  3: '高',
};

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
  2: 'bg-orange-100 text-orange-600',
  3: 'bg-red-100 text-red-600',
};

const SORT_LABELS: Record<SortOrder, string> = {
  default: '默认排序',
  priorityDesc: '优先级 ↓',
  priorityAsc: '优先级 ↑',
  dueDateAsc: '截止日期 ↑',
};


export default function TaskView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [showFilter, setShowFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  const [goalFilter, setGoalFilter] = useState<number | 'all'>('all');

  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState(2);
  // Task status is auto-managed: todo -> in_progress (when scheduled) -> done (when completed)
  const [scheduleType, setScheduleType] = useState<Task['scheduleType']>('single');
  const [color, setColor] = useState(COLORS[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dueDate, setDueDate] = useState(''); // NEW: due date
  const [description, setDescription] = useState(''); // NEW: task description
  const [repeatCount, setRepeatCount] = useState<number | ''>(''); // NEW: repeat count for recurring tasks
  const [durationMinutes, setDurationMinutes] = useState(60); // NEW: default duration for scheduling
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showBatchGoalForm, setShowBatchGoalForm] = useState(false);
  const [batchGoalId, setBatchGoalId] = useState<number | undefined>(undefined);

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
      // status kept as-is, auto-managed by schedule/complete flow
      setScheduleType(task.scheduleType);
      setColor(task.color);
      setIsRecurring(task.isRecurring);
      setStartDate(task.startDate || '');
      setEndDate(task.endDate || '');
      setDueDate(task.dueDate || '');
      setDescription(task.description || '');
      setRepeatCount(task.repeatCount ?? '');
      setDurationMinutes(task.durationMinutes ?? 60);
    } else {
      setEditing(null);
      setTitle('');
      setGoalId(undefined);
      setPriority(2);
      // new tasks always start as todo
      setScheduleType('single');
      setColor(COLORS[0]);
      setIsRecurring(false);
      setStartDate('');
      setEndDate('');
      setDueDate('');
      setDescription('');
      setRepeatCount('');
      setDurationMinutes(60);
    }
    setShowForm(true);
  }

  async function saveTask() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert('任务标题不能为空');
      return;
    }
    if (trimmedTitle.length > 60) {
      alert('任务标题不能超过60字');
      return;
    }

    const data = {
      id: editing?.id,
      title: trimmedTitle || '未命名任务',
      description: description.trim() || undefined,
      goalId: goalId || undefined,
      priority,
      status: editing?.status || 'todo',
      scheduleType,
      createdAt: editing?.createdAt || new Date().toISOString(),
      completedAt: editing?.completedAt,
      dueDate: dueDate || undefined,
      color,
      isRecurring,
      startDate: isRecurring ? startDate || undefined : undefined,
      endDate: isRecurring ? endDate || undefined : undefined,
      repeatCount: scheduleType === 'recurring' && repeatCount !== '' ? Number(repeatCount) : undefined,
      durationMinutes,
    };
    if (editing?.id) {
      await db.tasks.update(editing.id, data);
      // Sync color across all tasks with the same title
      if (editing.color !== color) {
        const all = await db.tasks.toArray();
        const toUpdate = all.filter(t => t.id !== editing.id && t.title === editing.title && t.color !== color);
        for (const t of toUpdate) {
          await db.tasks.update(t.id!, { color });
        }
      }
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

  // Batch operations
  function toggleSelection(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(sortedTasks.map(t => t.id!)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function batchMarkDone() {
    const ids = Array.from(selectedIds);
    const now = new Date().toISOString();
    for (const id of ids) {
      await db.tasks.update(id, { status: 'done', completedAt: now });
    }
    setBatchMode(false);
    clearSelection();
    loadData();
  }

  async function batchDelete() {
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个任务吗？`)) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await db.tasks.delete(id);
    }
    setBatchMode(false);
    clearSelection();
    loadData();
  }

  async function batchAssignGoal() {
    if (!batchGoalId) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await db.tasks.update(id, { goalId: batchGoalId });
    }
    setShowBatchGoalForm(false);
    setBatchMode(false);
    clearSelection();
    loadData();
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const filteredTasks = tasks.filter(t => {
    if (goalFilter !== 'all' && t.goalId !== goalFilter) return false;
    if (filter === 'all') return true;
    if (filter === 'overdue') return t.status !== 'done' && t.dueDate && t.dueDate < todayStr;
    return t.status === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortOrder === 'priorityDesc') return b.priority - a.priority;
    if (sortOrder === 'priorityAsc') return a.priority - b.priority;
    if (sortOrder === 'dueDateAsc') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-gray-800 px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700 ">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }))}
                    className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold">任务追踪</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (batchMode) {
                  setBatchMode(false);
                  clearSelection();
                } else {
                  setBatchMode(true);
                }
              }}
              className={`p-2 rounded-full text-sm font-medium transition-colors ${
                batchMode ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100'
              }`}
            >
              {batchMode ? '完成' : '批量'}
            </button>
            <button onClick={() => setShowFilter(!showFilter)} className="p-2 text-gray-500 dark:text-gray-400 ">
              <Filter size={18} />
            </button>
            <button onClick={() => openForm()} className="bg-blue-600 text-white p-2 rounded-full shadow-sm">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>总: {stats.total}</span>
          <span className="text-green-600">已完成: {stats.done}</span>
          <span className="text-blue-600">进行中: {stats.inProgress}</span>
          <span className="text-gray-400 dark:text-gray-500 ">待办: {stats.todo}</span>
        </div>

        {/* Filter & Sort chips */}
        {showFilter && (
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Goal filter */}
            {goals.length > 0 && (
              <select
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-2 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="all">全部目标</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            )}
            {(['all', 'todo', 'in_progress', 'done', 'overdue'] as FilterStatus[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                      }`}>
                {STATUS_LABELS[f]}
              </button>
            ))}
            <button onClick={() => {
              const orders: SortOrder[] = ['default', 'priorityDesc', 'priorityAsc', 'dueDateAsc'];
              const idx = orders.indexOf(sortOrder);
              setSortOrder(orders[(idx + 1) % orders.length]);
            }}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600 flex items-center gap-1">
              <ArrowUpDown size={12} />
              {SORT_LABELS[sortOrder]}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sortedTasks.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-20">
            <CheckCircle2 size={48} className="mx-auto mb-3 opacity-40" />
            <p>没有任务</p>
          </div>
        )}

        {sortedTasks.map(task => {
          const goal = goals.find(g => g.id === task.goalId);
          const isSelected = selectedIds.has(task.id!);
          const PRIORITY_BAR_COLORS: Record<string, string> = {
            P3: '#EF4444',
            P2: '#F59E0B',
            P1: '#9CA3AF',
          };
          return (
            <div key={task.id}
                 className={`bg-white rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-3 ${task.status === 'done' ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                 style={{ borderLeftWidth: '3px', borderLeftColor: PRIORITY_BAR_COLORS[task.priority] || '#9CA3AF' }}>
              {batchMode ? (
                <button
                  onClick={() => toggleSelection(task.id!)}
                  className="mt-0.5 shrink-0"
                >
                  {isSelected ? (
                    <CheckCircle2 size={22} className="text-blue-500" />
                  ) : (
                    <Circle size={22} className="text-gray-300" />
                  )}
                </button>
              ) : (
                <button onClick={() => toggleStatus(task)} className="mt-0.5 shrink-0">
                  {task.status === 'done' ? (
                    <CheckCircle2 size={22} className="text-green-500" />
                  ) : task.status === 'in_progress' ? (
                    <Clock size={22} className="text-blue-500" />
                  ) : (
                    <Circle size={22} className="text-gray-300" />
                  )}
                </button>
              )}

              <button onClick={() => {
                if (batchMode) {
                  toggleSelection(task.id!);
                } else {
                  openForm(task);
                }
              }} className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                  <div className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {task.title}
                  </div>
                </div>
                {task.description && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{task.description}</div>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {PRIORITY_LABELS[task.priority]}优先级
                  </span>
                  {task.scheduleType === 'recurring' ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 flex items-center gap-0.5">
                      <Repeat size={10} />
                      {task.repeatCount !== undefined ? `剩 ${task.repeatCount} 次` : '多次'}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                      <Zap size={10} /> 单次
                    </span>
                  )}
                  {task.dueDate && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${
                      task.status === 'done' ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' :
                      new Date(task.dueDate) < new Date(new Date().toISOString().split('T')[0]) ? 'bg-red-100 text-red-600' :
                      task.dueDate === new Date().toISOString().split('T')[0] ? 'bg-orange-100 text-orange-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {new Date(task.dueDate) < new Date(new Date().toISOString().split('T')[0]) && task.status !== 'done' ? '⚠️ ' : '📅 '}
                      {task.dueDate.slice(5)}
                    </span>
                  )}
                  {goal && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
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

      {/* Batch action bar */}
      {batchMode && selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 bg-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between"
             style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ">已选 {selectedIds.size} 项</span>
          </div>
          <div className="flex gap-2">
            <button onClick={selectAll} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200">
              全选
            </button>
            <button onClick={clearSelection} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200">
              清空
            </button>
            <button onClick={() => setShowBatchGoalForm(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700">
              分配目标
            </button>
            <button onClick={batchMarkDone} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700">
              标记完成
            </button>
            <button onClick={batchDelete} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700">
              删除
            </button>
          </div>
        </div>
      )}

      {/* Batch Goal Assignment Modal */}
      {showBatchGoalForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowBatchGoalForm(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">分配目标（已选 {selectedIds.size} 项）</h2>
              <button onClick={() => setShowBatchGoalForm(false)}><X size={20} className="text-gray-400 dark:text-gray-500 " /></button>
            </div>
            <div className="space-y-3">
              <select
                value={batchGoalId || ''}
                onChange={e => setBatchGoalId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择目标...</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowBatchGoalForm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={batchAssignGoal}
                  disabled={!batchGoalId}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium disabled:bg-gray-300"
                >
                  确认分配
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? '编辑任务' : '添加任务'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400 dark:text-gray-500 " /></button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">任务名称</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">备注（可选）</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="添加任务详情、步骤、参考链接..."
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">关联目标（可选）</label>
                <select value={goalId || ''} onChange={e => setGoalId(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">无</option>
                  {goals.map(g => {
                    const goalTasks = tasks.filter(t => t.goalId === g.id);
                    const completed = goalTasks.filter(t => t.status === 'done').length;
                    return <option key={g.id} value={g.id}>{g.title} ({completed}/{goalTasks.length})</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">优先级</label>
                <select value={priority} onChange={e => setPriority(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                  {[3, 2, 1].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">排课类型</label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setScheduleType('single')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                      scheduleType === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                    }`}
                  >
                    <Zap size={12} /> 单次（用完消失）
                  </button>
                  <button
                    onClick={() => setScheduleType('recurring')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                      scheduleType === 'recurring' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                    }`}
                  >
                    <Repeat size={12} /> 多次（可反复用）
                  </button>
                </div>
                {scheduleType === 'recurring' && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 ">可用次数（留空表示无限次）</label>
                    <input
                      type="number"
                      min={1}
                      value={repeatCount}
                      onChange={e => {
                        const v = e.target.value;
                        setRepeatCount(v === '' ? '' : Math.max(1, Number(v)));
                      }}
                      placeholder="无限次"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Default Duration */}
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">预计时长（分钟）</label>
                <select
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  {[30, 45, 60, 90, 120, 150, 180].map(m =>
                    <option key={m} value={m}>{m}分钟</option>
                  )}
                </select>
              </div>

              {/* Recurring options */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}
                         className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ">每周重复</span>
                </label>
                {isRecurring && (
                  <div className="flex gap-3 mt-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 dark:text-gray-400 ">开始日期</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                             className="w-full mt-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 dark:text-gray-400 ">结束日期</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                             className="w-full mt-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm" />
                    </div>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">截止日期（可选）</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {dueDate && new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]) && (
                  <p className="text-xs text-red-500 mt-1">⚠️ 截止日期已过</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 ">颜色</label>
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

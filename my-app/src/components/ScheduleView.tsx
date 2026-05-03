import { useState, useEffect } from 'react';
import { db, type Lesson, type Task, type Goal } from '../db';
import { Plus, X, ChevronLeft, ChevronRight, ListTodo, GripVertical } from 'lucide-react';

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const START_HOUR = 7;
const END_HOUR = 23;
const SLOT_HEIGHT = 48;

const COLORS = [
  '#4A6FA5', '#FF6B6B', '#34C759', '#FF9500', '#AF52DE',
  '#5856D6', '#FF2D55', '#5AC8FA', '#FFCC00', '#8E8E93'
];

export default function ScheduleView() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showTaskScheduleForm, setShowTaskScheduleForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const [title, setTitle] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [duration, setDuration] = useState(60);
  const [color, setColor] = useState(COLORS[0]);
  const [location, setLocation] = useState('');

  useEffect(() => {
    loadLessons();
    loadTasks();
  }, []);

  async function loadLessons() {
    const all = await db.lessons.toArray();
    setLessons(all);
  }

  async function loadTasks() {
    const [allTasks, allGoals] = await Promise.all([
      db.tasks.toArray(),
      db.goals.toArray(),
    ]);
    // Load ALL tasks so we can check done status for lessons
    setTasks(allTasks);
    setGoals(allGoals);
  }

  const timeSlots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    timeSlots.push(`${h}:00`);
    timeSlots.push(`${h}:30`);
  }

  const weekDates = (() => {
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + weekOffset * 7);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  })();

  function openForm(lesson?: Lesson) {
    if (lesson) {
      setEditing(lesson);
      setTitle(lesson.title);
      setDayOfWeek(lesson.dayOfWeek);
      setStartHour(lesson.startHour);
      setStartMinute(lesson.startMinute);
      setDuration(lesson.durationMinutes);
      setColor(lesson.color);
      setLocation(lesson.location || '');
    } else {
      setEditing(null);
      setTitle('');
      setDayOfWeek(1);
      setStartHour(9);
      setStartMinute(0);
      setDuration(60);
      setColor(COLORS[0]);
      setLocation('');
    }
    setShowForm(true);
  }

  async function saveLesson() {
    const data: Lesson = {
      id: editing?.id,
      title: title.trim() || '未命名',
      dayOfWeek,
      startHour,
      startMinute,
      durationMinutes: duration,
      color,
      location: location.trim() || undefined,
    };
    if (editing?.id) {
      await db.lessons.update(editing.id, data);
    } else {
      await db.lessons.add(data);
    }
    setShowForm(false);
    loadLessons();
  }

  async function deleteLesson() {
    if (editing?.id && confirm('确定删除这门课吗？')) {
      await db.lessons.delete(editing.id);
      setShowForm(false);
      loadLessons();
    }
  }

  // Schedule a task into the calendar
  function openTaskScheduleForm(task: Task) {
    setSelectedTask(task);
    setTitle(task.title);
    setDayOfWeek(new Date().getDay());
    setStartHour(9);
    setStartMinute(0);
    setDuration(60);
    const goal = goals.find(g => g.id === task.goalId);
    setColor(goal?.color || COLORS[0]);
    setLocation('');
    setShowTaskPanel(false);
    setShowTaskScheduleForm(true);
  }

  async function saveTaskAsLesson() {
    if (!selectedTask) return;
    const data: Lesson = {
      taskId: selectedTask.id,
      title: title.trim() || selectedTask.title,
      dayOfWeek,
      startHour,
      startMinute,
      durationMinutes: 60,
      color,
      location: location.trim() || undefined,
    };
    await db.lessons.add(data);

    // Task stays in task list regardless of scheduleType

    setShowTaskScheduleForm(false);
    setSelectedTask(null);
    loadLessons();
    loadTasks();
  }

  function getLessonStyle(lesson: Lesson) {
    const slotIndex = (lesson.startHour - START_HOUR) * 2 + (lesson.startMinute >= 30 ? 1 : 0);
    const top = slotIndex * SLOT_HEIGHT;
    const height = (lesson.durationMinutes / 30) * SLOT_HEIGHT;
    return { top, height };
  }

  const isToday = (date: Date) => {
    const t = new Date();
    return date.getFullYear() === t.getFullYear() &&
           date.getMonth() === t.getMonth() &&
           date.getDate() === t.getDate();
  };

  // Drag: task -> lesson slot
  function handleTaskDragStart(e: React.DragEvent, task: Task) {
    e.dataTransfer.setData('type', 'task');
    e.dataTransfer.setData('taskId', String(task.id));
    e.dataTransfer.setData('taskTitle', task.title);
    e.dataTransfer.setData('goalId', String(task.goalId || ''));
    e.dataTransfer.setData('scheduleType', task.scheduleType);
    e.dataTransfer.effectAllowed = 'copy';
  }

  // Drag: lesson -> move
  function handleLessonDragStart(e: React.DragEvent, lesson: Lesson) {
    e.dataTransfer.setData('type', 'lesson');
    e.dataTransfer.setData('lessonId', String(lesson.id));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDropOnSlot(e: React.DragEvent, dayIdx: number, slotIdx: number) {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const hour = START_HOUR + Math.floor(slotIdx / 2);
    const minute = (slotIdx % 2) * 30;

    if (type === 'lesson') {
      const lessonId = Number(e.dataTransfer.getData('lessonId'));
      if (!lessonId) return;
      await db.lessons.update(lessonId, {
        dayOfWeek: dayIdx,
        startHour: hour,
        startMinute: minute,
      });
      loadLessons();
      return;
    }

    if (type === 'task') {
      const taskId = Number(e.dataTransfer.getData('taskId'));
      const taskTitle = e.dataTransfer.getData('taskTitle');
      const goalIdStr = e.dataTransfer.getData('goalId');
      const goal = goals.find(g => g.id === Number(goalIdStr));

      await db.lessons.add({
        taskId,
        title: taskTitle,
        dayOfWeek: dayIdx,
        startHour: hour,
        startMinute: minute,
        durationMinutes: 60,
        color: goal?.color || COLORS[0],
      });

      loadLessons();
      loadTasks();
    }
  }

  async function handleDropOnDayColumn(e: React.DragEvent, dayIdx: number) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slotIdx = Math.floor(y / SLOT_HEIGHT);
    handleDropOnSlot(e, dayIdx, Math.max(0, Math.min(slotIdx, timeSlots.length - 1)));
  }

  // Tasks for checking done status
  const allTasksRef = tasks;
  const undoneTasks = tasks.filter(t => t.status !== 'done');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">课程表</h1>
          <div className="flex gap-2">
            <button onClick={() => { setShowTaskPanel(!showTaskPanel); loadTasks(); }}
                    className={`p-2 rounded-full shadow-sm ${showTaskPanel ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
              <ListTodo size={18} />
            </button>
            <button onClick={() => openForm()} className="bg-blue-600 text-white p-2 rounded-full shadow-sm">
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 text-gray-500">
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-gray-600">
            {weekDates[0].getMonth() + 1}月{weekDates[0].getDate()}日 -
            {weekDates[6].getMonth() + 1}月{weekDates[6].getDate()}日
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 text-gray-500">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Task Panel */}
      {showTaskPanel && (
        <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 max-h-40 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-orange-700">未完成任务 — 拖拽到课程表，或点击安排</span>
            <button onClick={() => setShowTaskPanel(false)} className="text-orange-400"><X size={14} /></button>
          </div>
          {undoneTasks.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">没有未完成的任务</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {undoneTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleTaskDragStart(e, task)}
                  className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-orange-200 text-xs cursor-grab active:cursor-grabbing shadow-sm"
                >
                  <GripVertical size={12} className="text-gray-300" />
                  <span className="truncate max-w-[120px]">{task.title}</span>
                  <button
                    onClick={() => openTaskScheduleForm(task)}
                    className="ml-1 text-orange-600 hover:text-orange-800 font-medium"
                  >
                    安排
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Day headers */}
      <div className="flex bg-white border-b border-gray-200">
        <div className="w-12 shrink-0" />
        {DAYS.map((day, i) => (
          <div key={day} className={`flex-1 text-center py-2 text-xs ${isToday(weekDates[i]) ? 'bg-blue-50' : ''}`}>
            <div className="text-gray-500">{day}</div>
            <div className={`font-semibold ${isToday(weekDates[i]) ? 'text-blue-600' : 'text-gray-800'}`}>
              {weekDates[i].getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Schedule grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
        <div className="flex min-h-max">
          {/* Time labels */}
          <div className="w-12 shrink-0 border-r border-gray-100 bg-gray-50">
            {timeSlots.map((slot, i) => (
              <div key={i} className="text-[10px] text-gray-400 text-right pr-1 flex items-start justify-end"
                   style={{ height: SLOT_HEIGHT }}>
                {slot.endsWith(':00') ? slot : ''}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((_, dayIdx) => (
            <div key={dayIdx} className="flex-1 relative border-r border-gray-100 last:border-r-0"
                 style={{ height: timeSlots.length * SLOT_HEIGHT }}
                 onDragOver={handleDragOver}
                 onDrop={(e) => handleDropOnDayColumn(e, dayIdx)}>
              {/* Grid lines */}
              {timeSlots.map((_, i) => (
                <div key={i} className="border-b border-gray-50"
                     style={{ height: SLOT_HEIGHT }} />
              ))}
              {/* Lessons */}
              {lessons.filter(l => l.dayOfWeek === dayIdx).map(lesson => {
                const style = getLessonStyle(lesson);
                const linkedTask = lesson.taskId ? allTasksRef.find(t => t.id === lesson.taskId) : undefined;
                const isDone = linkedTask?.status === 'done';
                return (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={(e) => handleLessonDragStart(e, lesson)}
                    onClick={() => openForm(lesson)}
                    className={`absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-left text-xs text-white overflow-hidden shadow-sm cursor-grab active:cursor-grabbing ${
                      isDone ? 'opacity-50' : ''
                    }`}
                    style={{
                      top: style.top,
                      height: style.height - 2,
                      backgroundColor: lesson.color,
                    }}
                  >
                    <div className={`font-semibold truncate ${isDone ? 'line-through' : ''}`}>{lesson.title}</div>
                    {style.height > 30 && lesson.location && (
                      <div className={`truncate opacity-80 ${isDone ? 'line-through' : ''}`}>{lesson.location}</div>
                    )}
                    {isDone && (
                      <div className="absolute top-0.5 right-0.5 text-[8px] bg-white/30 px-1 rounded">已完成</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Lesson Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? '编辑课程' : '添加课程'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm text-gray-500">课程名称</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm text-gray-500">星期</label>
                <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-500">开始时间</label>
                  <div className="flex gap-2 mt-1">
                    <select value={startHour} onChange={e => setStartHour(Number(e.target.value))}
                            className="flex-1 px-2 py-2 border border-gray-300 rounded-lg">
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i}:00</option>)}
                    </select>
                    <select value={startMinute} onChange={e => setStartMinute(Number(e.target.value))}
                            className="flex-1 px-2 py-2 border border-gray-300 rounded-lg">
                      <option value={0}>00</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-500">时长(分钟)</label>
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg">
                    {[30, 45, 60, 90, 120, 150, 180].map(m =>
                      <option key={m} value={m}>{m}分钟</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">地点</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                       placeholder="可选"
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
                <button onClick={deleteLesson}
                        className="px-4 py-2.5 rounded-xl text-red-600 bg-red-50 font-medium">
                  删除
                </button>
              )}
              <button onClick={saveLesson}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium">
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Schedule Form Modal */}
      {showTaskScheduleForm && selectedTask && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowTaskScheduleForm(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">安排任务到课程表</h2>
              <button onClick={() => setShowTaskScheduleForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 mb-3 text-sm text-blue-800">
              任务: <strong>{selectedTask.title}</strong>
              {selectedTask.scheduleType === 'single' && (
                <span className="ml-2 text-xs text-orange-600">（单次任务，安排后将从列表移除）</span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">课程名称（可修改）</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm text-gray-500">星期</label>
                <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-500">开始时间</label>
                  <div className="flex gap-2 mt-1">
                    <select value={startHour} onChange={e => setStartHour(Number(e.target.value))}
                            className="flex-1 px-2 py-2 border border-gray-300 rounded-lg">
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i}:00</option>)}
                    </select>
                    <select value={startMinute} onChange={e => setStartMinute(Number(e.target.value))}
                            className="flex-1 px-2 py-2 border border-gray-300 rounded-lg">
                      <option value={0}>00</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                默认时长: <strong>60分钟</strong>（1小时）
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
              <button onClick={saveTaskAsLesson}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium">
                安排到课程表
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

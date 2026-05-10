import { useState, useEffect } from 'react';
import { db, type Lesson, type Task, type Goal, formatLocalDate, COLORS } from '../db';
import PomodoroTimer from './PomodoroTimer';
import { Plus, X, ChevronLeft, ChevronRight, ListTodo, GripVertical, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const START_HOUR = 7;
const END_HOUR = 23;
const SLOT_HEIGHT = 48;

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

export default function ScheduleView() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showTaskScheduleForm, setShowTaskScheduleForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [pomodoroLesson, setPomodoroLesson] = useState<Lesson | null>(null);
  const [pomodoroDuration, setPomodoroDuration] = useState(25);
  const [currentTimeTick, setCurrentTimeTick] = useState(0);
  // ===== 重叠检测工具函数 =====
  function lessonsOverlap(a: { dayOfWeek: number; startHour: number; startMinute: number; durationMinutes: number },
                          b: { dayOfWeek: number; startHour: number; startMinute: number; durationMinutes: number }): boolean {
    if (a.dayOfWeek !== b.dayOfWeek) return false;
    const aStart = a.startHour * 60 + a.startMinute;
    const aEnd = aStart + a.durationMinutes;
    const bStart = b.startHour * 60 + b.startMinute;
    const bEnd = bStart + b.durationMinutes;
    return aStart < bEnd && bStart < aEnd;
  }

  function validateLesson(data: { title: string; startHour: number; startMinute: number; durationMinutes: number }): string | null {
    if (!data.title.trim()) return '课程名称不能为空';
    if (data.title.trim().length > 50) return '课程名称不能超过50字';
    if (data.startHour < 0 || data.startHour > 23) return '开始时间无效';
    if (data.startMinute !== 0 && data.startMinute !== 15 && data.startMinute !== 30 && data.startMinute !== 45) return '开始分钟只能为0、15、30、45';
    if (data.durationMinutes <= 0 || data.durationMinutes > 480) return '时长必须在1分钟到8小时之间';
    return null;
  }

  const [formError, setFormError] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [duration, setDuration] = useState(60);
  const [color, setColor] = useState(COLORS[0]);
  const [location, setLocation] = useState('');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customPomodoro, setCustomPomodoro] = useState('');

  useEffect(() => {
    loadLessons();
    loadTasks();
  }, []);

  // Update current time indicator every minute
  useEffect(() => {
    const timer = setInterval(() => {
      // Force re-render to update current time line position
      setCurrentTimeTick(Date.now());
    }, 60000);
    return () => clearInterval(timer);
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
    setTasks(allTasks);
    setGoals(allGoals);
  }

  const timeSlots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    timeSlots.push(`${h}:00`);
    timeSlots.push(`${h}:30`);
  }

  // Current time indicator position (for week view)
  const now = new Date();
  const currentMinuteOfDay = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = ((currentMinuteOfDay - START_HOUR * 60) / 30) * SLOT_HEIGHT;
  const showCurrentTime = currentMinuteOfDay >= START_HOUR * 60 && currentMinuteOfDay < END_HOUR * 60;

  // Week view dates
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

  // Month view data
  const monthDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  })();
  const monthYear = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(monthYear, monthIndex, 1).getDay();

  function openForm(lesson?: Lesson, date?: Date) {
    if (lesson) {
      setEditing(lesson);
      setTitle(lesson.title);
      setDayOfWeek(lesson.dayOfWeek);
      setStartHour(lesson.startHour);
      setStartMinute(lesson.startMinute);
      setDuration(lesson.durationMinutes);
      setColor(lesson.color);
      setLocation(lesson.location || '');
      setRepeatDays(lesson.repeatDays || []);
      setStartDate(lesson.startDate || '');
      setEndDate(lesson.endDate || '');
    } else {
      setEditing(null);
      setTitle('');
      setDayOfWeek(1);
      setStartHour(9);
      setStartMinute(0);
      setDuration(60);
      setColor(COLORS[0]);
      setLocation('');
      setRepeatDays([]);
      setStartDate('');
      setEndDate('');
    }
    setEditingDate(date ? formatLocalDate(date) : null);
    setShowForm(true);
  }

  async function saveLesson() {
    const data: any = {
      id: editing?.id,
      title: title.trim() || '未命名',
      dayOfWeek,
      startHour,
      startMinute,
      durationMinutes: duration,
      color,
      location: location.trim() || undefined,
      repeatDays: repeatDays.length > 0 ? repeatDays : undefined,
      startDate: repeatDays.length > 1 ? startDate || undefined : undefined,
      endDate: repeatDays.length > 1 ? endDate || undefined : undefined,
      status: editing?.status || 'todo',
      completedDates: editing?.completedDates || [],
    };

    // Validation
    const error = validateLesson({ title: data.title, startHour, startMinute, durationMinutes: duration });
    if (error) {
      setFormError(error);
      return;
    }

    // Overlap detection
    const newLesson = { dayOfWeek, startHour, startMinute, durationMinutes: duration };
    const conflicts = lessons.filter(l => l.id !== editing?.id && lessonsOverlap(
      { dayOfWeek: l.dayOfWeek, startHour: l.startHour, startMinute: l.startMinute, durationMinutes: l.durationMinutes },
      newLesson
    ));
    if (conflicts.length > 0) {
      setOverlapWarning(`与「${conflicts[0].title}」时间重叠，确定保存吗？`);
      return;
    }

    setFormError(null);
    setOverlapWarning(null);

    if (editing?.id) {
      await db.lessons.update(editing.id, data);
      // Sync color across all lessons with the same title
      if (editing.color !== color) {
        const all = await db.lessons.toArray();
        const toUpdate = all.filter(l => l.id !== editing.id && l.title === editing.title && l.color !== color);
        for (const l of toUpdate) {
          await db.lessons.update(l.id!, { color });
        }
      }
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
    setRepeatDays([]);
    setStartDate('');
    setEndDate('');
    setShowTaskPanel(false);
    setShowTaskScheduleForm(true);
  }

  function openTaskScheduleFormWithDefaults(
    task: Task,
    defaults: { dayOfWeek: number; startHour: number; startMinute: number }
  ) {
    setSelectedTask(task);
    setTitle(task.title);
    setDayOfWeek(defaults.dayOfWeek);
    setStartHour(defaults.startHour);
    setStartMinute(defaults.startMinute);
    setDuration(60);
    const goal = goals.find(g => g.id === task.goalId);
    setColor(goal?.color || COLORS[0]);
    setLocation('');
    setRepeatDays([defaults.dayOfWeek]);
    setStartDate('');
    setEndDate('');
    setShowTaskScheduleForm(true);
  }

  async function saveTaskAsScheduled() {
    if (!selectedTask?.id) return;
    await db.tasks.update(selectedTask.id, {
      scheduledDayOfWeek: dayOfWeek,
      scheduledStartHour: startHour,
      scheduledStartMinute: startMinute,
      scheduledDurationMinutes: duration,
      status: 'in_progress',
    });
    setShowTaskScheduleForm(false);
    setSelectedTask(null);
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
      const dragged = lessons.find(l => l.id === lessonId);
      const update: Partial<Lesson> = {
        dayOfWeek: dayIdx,
        startHour: hour,
        startMinute: minute,
      };
      // If lesson has no repeatDays, set it to the new day's weekday
      if (dragged && (!dragged.repeatDays || dragged.repeatDays.length === 0)) {
        (update as any).repeatDays = [dayIdx];
      }
      await db.lessons.update(lessonId, update);
      loadLessons();
      return;
    }

    if (type === 'task') {
      const taskId = Number(e.dataTransfer.getData('taskId'));
      const draggedTask = tasks.find(t => t.id === taskId);
      if (draggedTask) {
        openTaskScheduleFormWithDefaults(draggedTask, {
          dayOfWeek: dayIdx,
          startHour: hour,
          startMinute: minute,
        });
      }
    }
  }

  async function handleDropOnDayColumn(e: React.DragEvent, dayIdx: number) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slotIdx = Math.floor(y / SLOT_HEIGHT);
    handleDropOnSlot(e, dayIdx, Math.max(0, Math.min(slotIdx, timeSlots.length - 1)));
  }

  // allTasksRef removed
  const undoneTasks = tasks.filter(t => {
    if (t.status === 'done') return false;
    if (t.scheduleType === 'single') {
      return !lessons.some(l => l.taskId === t.id);
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }))}
                    className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-lg font-bold">课程表</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
                    className="p-2 rounded-full shadow-sm bg-gray-100 text-gray-600"
                    title={viewMode === 'week' ? '切换到月视图' : '切换到周视图'}>
              {viewMode === 'week' ? <LayoutGrid size={18} /> : <CalendarIcon size={18} />}
            </button>
            <button onClick={() => { setShowTaskPanel(!showTaskPanel); loadTasks(); }}
                    className={`p-2 rounded-full shadow-sm ${showTaskPanel ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
              <ListTodo size={18} />
            </button>
            <button onClick={() => openForm()} className="bg-blue-600 text-white p-2 rounded-full shadow-sm">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {viewMode === 'week' ? (
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
        ) : (
          <div className="flex items-center justify-between">
            <button onClick={() => setMonthOffset(m => m - 1)} className="p-1 text-gray-500">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-gray-600 font-medium">
              {monthYear}年 {MONTH_NAMES[monthIndex]}
            </span>
            <button onClick={() => setMonthOffset(m => m + 1)} className="p-1 text-gray-500">
              <ChevronRight size={20} />
            </button>
          </div>
        )}
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

      {/* Week View */}
      {viewMode === 'week' && (
        <>
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
                  {/* Current time indicator */}
                  {showCurrentTime && isToday(weekDates[dayIdx]) && (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none"
                      style={{ top: currentTimeTop }}
                    >
                      <div className="flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.5" />
                        <div className="flex-1 h-px bg-red-500/70" />
                      </div>
                    </div>
                  )}
                  {/* Lessons filtered by date range */}
                  {lessons.filter(l => lessonVisibleOnDate(l, weekDates[dayIdx])).map(lesson => {
                    const style = getLessonStyle(lesson);
                    const dateStr = formatLocalDate(weekDates[dayIdx]);
                    const isDone = lesson.completedDates?.includes(dateStr);
                    return (
                      <div
                        key={lesson.id}
                        draggable
                        onDragStart={(e) => handleLessonDragStart(e, lesson)}
                        onClick={() => openForm(lesson, weekDates[dayIdx])}
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
                          <div className="absolute top-0.5 right-0.5 text-[8px] bg-white/30 px-1 rounded">✓ 已完成</div>
                        )}
                      </div>
                    )}
                  })}

                  {/* Scheduled tasks for this day */}
                  {tasks.filter(t =>
                    t.scheduledDayOfWeek === dayIdx &&
                    t.scheduledStartHour !== undefined &&
                    t.scheduledStartMinute !== undefined &&
                    t.scheduledDurationMinutes !== undefined
                  ).map(task => {
                    const startMin = task.scheduledStartHour! * 60 + task.scheduledStartMinute!;
                    const top = (startMin - START_HOUR * 60) / 60 * SLOT_HEIGHT;
                    const height = (task.scheduledDurationMinutes! / 60) * SLOT_HEIGHT;
                    return (
                      <div
                        key={`task-${task.id}`}
                        className={`absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-left text-xs overflow-hidden shadow-sm border-2 border-dashed ${
                          task.status === 'done' ? 'opacity-50' : ''
                        }`}
                        style={{
                          top,
                          height: height - 2,
                          backgroundColor: task.color + '20',
                          borderColor: task.color,
                          color: task.color,
                        }}
                      >
                        <div className={`font-semibold truncate ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</div>
                        <div className="text-[10px] opacity-70">📋 任务</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="flex-1 overflow-y-auto bg-white p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="h-20" />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const date = new Date(monthYear, monthIndex, dayNum);
              const isTodayDate = isToday(date);
              const dayLessons = lessons.filter(l => lessonVisibleOnDate(l, date));
              return (
                <button
                  key={dayNum}
                  onClick={() => {
                    // Switch to week view centered on this date
                    const today = new Date();
                    const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const weekDiff = Math.floor((diffDays + today.getDay()) / 7);
                    setWeekOffset(weekDiff);
                    setViewMode('week');
                  }}
                  className={`h-20 rounded-lg border p-1 text-left transition-colors ${
                    isTodayDate ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className={`text-xs font-medium ${isTodayDate ? 'text-blue-600' : 'text-gray-700'}`}>
                    {dayNum}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {dayLessons.slice(0, 4).map((lesson, idx) => (
                      <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lesson.color }} />
                    ))}
                    {dayLessons.length > 4 && (
                      <span className="text-[8px] text-gray-400">+{dayLessons.length - 4}</span>
                    )}
                  </div>
                  {dayLessons.length > 0 && (
                    <div className="text-[9px] text-gray-400 truncate mt-0.5">
                      {dayLessons[0].title}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lesson Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{editing ? '编辑事项' : '添加事项'}</h2>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="space-y-3">
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

              {/* Repeat days */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">重复频率</label>
                  <button
                    onClick={() => {
                      if (repeatDays.length > 0) {
                        setRepeatDays([]);
                      } else {
                        setRepeatDays([dayOfWeek]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      repeatDays.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    🔁 重复
                  </button>
                </div>
                {repeatDays.length > 0 && (
                  <>
                    <div className="flex gap-1">
                      {['日','一','二','三','四','五','六'].map((label, idx) => (
                        <button key={idx}
                                onClick={() => {
                                  if (repeatDays.includes(idx)) {
                                    setRepeatDays(repeatDays.filter(d => d !== idx));
                                  } else {
                                    setRepeatDays([...repeatDays, idx].sort());
                                  }
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  repeatDays.includes(idx) ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
                                }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {repeatDays.length > 1 && (
                      <div className="flex gap-3 mt-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">开始日期</label>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                 className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">结束日期</label>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                 className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                        </div>
                      </div>
                    )}
                  </>
                )}
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

            {/* Start Pomodoro */}
            {editing && (
              <div className="mt-4">
                <div className="flex gap-2 mb-2">
                  {[15, 25, 45, 60].map(m => (
                    <button key={m}
                            onClick={() => { setPomodoroDuration(m); setCustomPomodoro(''); }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              pomodoroDuration === m && !customPomodoro ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600'
                            }`}>
                      {m}分钟
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">或自定义</span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customPomodoro}
                    onChange={e => setCustomPomodoro(e.target.value)}
                    placeholder={String(pomodoroDuration)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center"
                  />
                  <span className="text-xs text-gray-500">分钟</span>
                </div>
                <button
                  onClick={() => {
                    const finalDuration = customPomodoro ? Math.min(180, Math.max(1, Number(customPomodoro))) : pomodoroDuration;
                    setPomodoroDuration(finalDuration);
                    setShowForm(false);
                    setPomodoroLesson(editing);
                    setShowPomodoro(true);
                  }}
                  className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-transform"
                >
                  ▶ 开始专注 {customPomodoro ? Math.min(180, Math.max(1, Number(customPomodoro))) : pomodoroDuration} 分钟
                </button>
              </div>
            )}

            {/* Complete button */}
            {editing && editingDate && (
              <button
                onClick={async () => {
                  if (editing.id) {
                    const dates = editing.completedDates || [];
                    const alreadyDone = dates.includes(editingDate);
                    const newDates = alreadyDone
                      ? dates.filter(d => d !== editingDate)
                      : [...dates, editingDate].sort();
                    await db.lessons.update(editing.id, {
                      status: newDates.length > 0 ? 'done' : 'todo',
                      completedDates: newDates,
                    });
                    // Sync task status
                    if (editing.taskId) {
                      await db.tasks.update(editing.taskId, {
                        status: alreadyDone ? 'in_progress' : 'done',
                      });
                      loadTasks();
                    }
                    loadLessons();
                    setShowForm(false);
                  }
                }}
                className={`w-full mt-4 py-3 rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-transform ${
                  editing.completedDates?.includes(editingDate)
                    ? 'bg-yellow-500 text-white'
                    : 'bg-green-500 text-white'
                }`}
              >
                {editing.completedDates?.includes(editingDate) ? '↩ 取消完成标记' : '✓ 标记这件事为已完成'}
              </button>
            )}

              {/* Error messages */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-600">
                  {formError}
                </div>
              )}
              {overlapWarning && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm space-y-2">
                  <p className="text-orange-700">{overlapWarning}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setOverlapWarning(null)} className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        setOverlapWarning(null);
                        const data: any = {
                          id: editing?.id,
                          title: title.trim() || '未命名',
                          dayOfWeek,
                          startHour,
                          startMinute,
                          durationMinutes: duration,
                          color,
                          location: location.trim() || undefined,
                          repeatDays: repeatDays.length > 0 ? repeatDays : undefined,
                          startDate: repeatDays.length > 1 ? startDate || undefined : undefined,
                          endDate: repeatDays.length > 1 ? endDate || undefined : undefined,
                          status: editing?.status || 'todo',
                          completedDates: editing?.completedDates || [],
                        };
                        if (editing?.id) {
                          await db.lessons.update(editing.id, data);
                        } else {
                          await db.lessons.add(data);
                        }
                        setShowForm(false);
                        loadLessons();
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-medium"
                    >
                      仍要保存
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
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
        </div>
      )}

      {/* Task Schedule Form Modal */}
      {showTaskScheduleForm && selectedTask && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowTaskScheduleForm(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">安排到日程表</h2>
                <button onClick={() => setShowTaskScheduleForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 mb-3 text-sm text-blue-800">
                任务: <strong>{selectedTask.title}</strong>
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
                <button onClick={saveTaskAsScheduled}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium">
                  安排到课程表
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pomodoro Timer Overlay */}
      {showPomodoro && pomodoroLesson && (
        <PomodoroTimer
          lesson={pomodoroLesson}
          durationMinutes={pomodoroDuration}
          onClose={() => {
            setShowPomodoro(false);
            setPomodoroLesson(null);
          }}
        />
      )}
    </div>
  );
}

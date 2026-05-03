import { useState, useEffect } from 'react';
import { db, type Goal, type Task, type Lesson, type SleepRecord } from '../db';
import { Calendar, Target, ListTodo, Moon, ChevronRight, Clock, Star, Briefcase, CheckCircle2 } from 'lucide-react';

interface Props {
  onNavigate: (tab: 'schedule' | 'task' | 'goal' | 'sleep') => void;
}

export default function DashboardView({ onNavigate }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [g, t, l, s] = await Promise.all([
      db.goals.toArray(),
      db.tasks.toArray(),
      db.lessons.toArray(),
      db.sleepRecords.toArray(),
    ]);
    setGoals(g);
    setTasks(t);
    setLessons(l);
    s.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSleepRecords(s);
  }

  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const todayDateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const weekDayLabel = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][todayDayOfWeek];

  // Today's lessons
  const todayLessons = lessons
    .filter(l => l.dayOfWeek === todayDayOfWeek)
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
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDoneTasks = tasks.filter(t => {
    if (t.status !== 'done' || !t.completedAt) return false;
    return t.completedAt.startsWith(todayStr);
  });

  // Calculate workload hours: sum of lesson durations linked to completed tasks
  const completedTaskIds = new Set(todayDoneTasks.map(t => t.id));
  const todayWorkloadMinutes = lessons
    .filter(l => l.taskId && completedTaskIds.has(l.taskId))
    .reduce((sum, l) => sum + l.durationMinutes, 0);

  // Also count tasks without lessons as 1 hour each (estimate)
  const tasksWithoutLessons = todayDoneTasks.filter(t => !lessons.some(l => l.taskId === t.id));
  const estimatedExtraMinutes = tasksWithoutLessons.length * 60;

  const totalWorkloadHours = ((todayWorkloadMinutes + estimatedExtraMinutes) / 60).toFixed(1);

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
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">总览</h1>
        <p className="text-sm text-gray-500 mt-0.5">{todayDateStr} · {weekDayLabel}</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Workload Stats Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 shadow-sm text-white">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={18} className="text-blue-200" />
            <h2 className="font-semibold">今日工作量</h2>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-bold">{totalWorkloadHours}</span>
            <span className="text-sm text-blue-200">小时</span>
          </div>
          {todayDoneTasks.length === 0 ? (
            <p className="text-sm text-blue-200">今天还没有完成任务，加油！</p>
          ) : (
            <div className="space-y-1.5">
              {todayDoneTasks.slice(0, 4).map(task => {
                const linkedLesson = lessons.find(l => l.taskId === task.id);
                return (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={14} className="text-green-300 shrink-0" />
                    <span className="truncate">{task.title}</span>
                    {linkedLesson && (
                      <span className="text-xs text-blue-200 shrink-0">
                        {formatDuration(linkedLesson.durationMinutes)}
                      </span>
                    )}
                  </div>
                );
              })}
              {todayDoneTasks.length > 4 && (
                <p className="text-xs text-blue-300 mt-1">还有 {todayDoneTasks.length - 4} 个任务...</p>
              )}
            </div>
          )}
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              <h2 className="font-semibold text-gray-900">今日日程</h2>
            </div>
            <button onClick={() => onNavigate('schedule')} className="text-xs text-blue-600 flex items-center gap-0.5">
              查看全部 <ChevronRight size={14} />
            </button>
          </div>
          {todayLessons.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">今天没有课程</p>
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
            <p className="text-sm text-gray-400 py-2">所有任务已完成 🎉</p>
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
              <Target size={18} className="text-green-600" />
              <h2 className="font-semibold text-gray-900">目标进度</h2>
            </div>
            <button onClick={() => onNavigate('goal')} className="text-xs text-blue-600 flex items-center gap-0.5">
              查看全部 <ChevronRight size={14} />
            </button>
          </div>
          {goalProgress.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">还没有设定目标</p>
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
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
            <p className="text-sm text-gray-400 py-2">还没有睡眠记录</p>
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
      </div>
    </div>
  );
}

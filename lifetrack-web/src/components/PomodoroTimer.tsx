import { useState, useEffect, useRef, useCallback } from 'react';
import { db, type Lesson, formatLocalDate } from '../db';
import { Play, Pause, X, CheckCircle2 } from 'lucide-react';

interface Props {
  lesson: Lesson;
  onClose: () => void;
}

const DURATION = 25 * 60; // 25 minutes in seconds

export default function PomodoroTimer({ lesson, onClose }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [markTaskDone, setMarkTaskDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = 1 - secondsLeft / DURATION;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const startTimer = useCallback(() => {
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const finishTimer = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsFinished(true);
    const actualDuration = DURATION - secondsLeft;
    await db.focusSessions.add({
      date: formatLocalDate(new Date()),
      lessonId: lesson.id,
      durationMinutes: Math.round(actualDuration / 60),
    });
  }, [lesson.id, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && !isFinished) {
      finishTimer();
    }
  }, [secondsLeft, isFinished, finishTimer]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleMarkTaskDone() {
    if (lesson.taskId) {
      await db.tasks.update(lesson.taskId, {
        status: 'done',
        completedAt: new Date().toISOString(),
      });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center text-white"
         style={{ backgroundColor: lesson.color }}>
      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30">
        <X size={24} />
      </button>

      {!isFinished ? (
        <>
          <div className="text-lg font-medium mb-2 opacity-80">{lesson.title}</div>
          <div className="text-sm opacity-60 mb-8">专注计时</div>

          {/* Circle progress */}
          <div className="relative w-[280px] h-[280px]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
              <circle cx="140" cy="140" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle cx="140" cy="140" r={radius} fill="none" stroke="white" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl font-bold tabular-nums">
                {minutes.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-4 mt-10">
            {!isRunning ? (
              <button onClick={startTimer}
                      className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-gray-900 font-semibold shadow-lg">
                <Play size={20} fill="currentColor" /> 开始
              </button>
            ) : (
              <button onClick={pauseTimer}
                      className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 font-semibold">
                <Pause size={20} /> 暂停
              </button>
            )}
            <button onClick={finishTimer}
                    className="px-6 py-3 rounded-full bg-white/20 font-semibold">
              完成
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-6xl mb-4">🎉</div>
          <div className="text-2xl font-bold mb-2">专注完成！</div>
          <div className="text-lg opacity-80 mb-8">
            本次专注了 {Math.round((DURATION - secondsLeft) / 60)} 分钟
          </div>

          {lesson.taskId && (
            <div className="bg-white/20 rounded-xl p-4 mb-4 w-72">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={markTaskDone} onChange={e => setMarkTaskDone(e.target.checked)}
                       className="w-5 h-5 rounded" />
                <span className="text-sm">同时标记关联任务为已完成</span>
              </label>
            </div>
          )}

          <button onClick={markTaskDone ? handleMarkTaskDone : onClose}
                  className="flex items-center gap-2 px-8 py-3 rounded-full bg-white text-gray-900 font-semibold shadow-lg">
            <CheckCircle2 size={20} /> 好的
          </button>
        </>
      )}
    </div>
  );
}

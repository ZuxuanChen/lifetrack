import { useState } from 'react';
import { Calendar, Target, ListTodo, Moon, LayoutDashboard, Dumbbell, BarChart3, MoreHorizontal, X } from 'lucide-react';

type Tab = 'dashboard' | 'schedule' | 'task' | 'goal' | 'sleep' | 'habit' | 'stats';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const MAIN_TABS: { key: Tab; label: string; icon: typeof Calendar }[] = [
  { key: 'schedule', label: '课程表', icon: Calendar },
  { key: 'task', label: '任务', icon: ListTodo },
  { key: 'habit', label: '习惯', icon: Dumbbell },
];

const MORE_TABS: { key: Tab; label: string; icon: typeof Calendar }[] = [
  { key: 'goal', label: '目标', icon: Target },
  { key: 'sleep', label: '睡眠', icon: Moon },
  { key: 'stats', label: '数据', icon: BarChart3 },
];

export default function BottomNav({ active, onChange }: Props) {
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = MORE_TABS.some(t => t.key === active);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50">
        {/* Left side tabs */}
        {MAIN_TABS.slice(0, 2).map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-0.5">{label}</span>
            </button>
          );
        })}

        {/* Center: Dashboard — prominent home button */}
        <button
          onClick={() => onChange('dashboard')}
          className={`relative -top-3 flex flex-col items-center justify-center w-16 h-16 rounded-2xl shadow-lg transition-all ${
            active === 'dashboard'
              ? 'bg-blue-600 text-white scale-110'
              : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          <LayoutDashboard size={24} strokeWidth={active === 'dashboard' ? 2.5 : 2} />
          <span className="text-[10px] mt-0.5 font-medium">总览</span>
        </button>

        {/* Right side tabs */}
        {MAIN_TABS.slice(2).map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-0.5">{label}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isMoreActive ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          {showMore ? <X size={20} /> : <MoreHorizontal size={20} />}
          <span className="text-[10px] mt-0.5">更多</span>
        </button>
      </nav>

      {/* More menu overlay */}
      {showMore && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-40 px-4 py-3">
          <div className="flex justify-around">
            {MORE_TABS.map(({ key, label, icon: Icon }) => {
              const isActive = active === key;
              return (
                <button
                  key={key}
                  onClick={() => { onChange(key); setShowMore(false); }}
                  className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-colors ${
                    isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
                  }`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-xs mt-1">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

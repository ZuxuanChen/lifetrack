import { Calendar, Target, ListTodo, Moon, LayoutDashboard } from 'lucide-react';

type Tab = 'dashboard' | 'schedule' | 'goal' | 'task' | 'sleep';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { key: Tab; label: string; icon: typeof Calendar }[] = [
  { key: 'dashboard', label: '总览', icon: LayoutDashboard },
  { key: 'schedule', label: '课程表', icon: Calendar },
  { key: 'task', label: '任务', icon: ListTodo },
  { key: 'goal', label: '目标', icon: Target },
  { key: 'sleep', label: '睡眠', icon: Moon },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-14 z-50">
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] mt-0.5">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

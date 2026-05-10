import { useState, useEffect } from 'react';
import { Calendar, Target, ListTodo, Moon, LayoutDashboard, Dumbbell, BarChart3, MoreHorizontal, X, Settings, Bot } from 'lucide-react';

type Tab = 'dashboard' | 'schedule' | 'task' | 'goal' | 'sleep' | 'habit' | 'stats' | 'settings' | 'ai';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const ALL_TAB_CONFIG: Record<Tab, { label: string; icon: typeof Calendar }> = {
  dashboard: { label: '总览', icon: LayoutDashboard },
  schedule: { label: '课程表', icon: Calendar },
  task: { label: '任务', icon: ListTodo },
  goal: { label: '目标', icon: Target },
  sleep: { label: '睡眠', icon: Moon },
  habit: { label: '习惯', icon: Dumbbell },
  stats: { label: '数据', icon: BarChart3 },
  settings: { label: '设置', icon: Settings },
  ai: { label: 'AI', icon: Bot },
};

const ALL_OPTIONS: Tab[] = ['task', 'habit', 'goal', 'sleep', 'stats', 'schedule', 'dashboard', 'settings', 'ai'];

function getSlot(key: string, fallback: string): Tab {
  const val = localStorage.getItem(key);
  if (ALL_OPTIONS.includes(val as Tab)) return val as Tab;
  return fallback as Tab;
}

function getSlotWithLegacy(slotKey: string, legacyKey: string | null, defaultValue: Tab): Tab {
  const val = localStorage.getItem(slotKey);
  if (ALL_OPTIONS.includes(val as Tab)) return val as Tab;
  if (legacyKey) {
    const legacy = localStorage.getItem(legacyKey);
    if (ALL_OPTIONS.includes(legacy as Tab)) return legacy as Tab;
  }
  return defaultValue;
}

export default function BottomNav({ active, onChange }: Props) {
  const [showMore, setShowMore] = useState(false);
  const [slot1, setSlot1] = useState<Tab>(() => getSlotWithLegacy('lifetrack-nav-slot-1', 'lifetrack-nav-1', 'task'));
  const [slot2, setSlot2] = useState<Tab>(() => getSlot('lifetrack-nav-slot-2', 'schedule'));
  const [slot3, setSlot3] = useState<Tab>(() => getSlot('lifetrack-nav-slot-3', 'dashboard'));
  const [slot4, setSlot4] = useState<Tab>(() => getSlotWithLegacy('lifetrack-nav-slot-4', 'lifetrack-nav-2', 'habit'));

  useEffect(() => {
    const handler = () => {
      setSlot1(getSlotWithLegacy('lifetrack-nav-slot-1', 'lifetrack-nav-1', 'task'));
      setSlot2(getSlot('lifetrack-nav-slot-2', 'schedule'));
      setSlot3(getSlot('lifetrack-nav-slot-3', 'dashboard'));
      setSlot4(getSlotWithLegacy('lifetrack-nav-slot-4', 'lifetrack-nav-2', 'habit'));
    };
    window.addEventListener('nav-config-changed', handler);
    return () => window.removeEventListener('nav-config-changed', handler);
  }, []);

  const mainTabs: Tab[] = [slot1, slot2, slot3, slot4];
  const moreTabs = (Object.keys(ALL_TAB_CONFIG) as Tab[]).filter(t => !mainTabs.includes(t));

  const isMoreActive = moreTabs.includes(active);

  function renderTabButton(tab: Tab, isProminent: boolean) {
    const { label, icon: Icon } = ALL_TAB_CONFIG[tab];
    const isActive = active === tab;

    if (isProminent) {
      return (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`relative -top-3 flex flex-col items-center justify-center w-16 h-16 rounded-2xl shadow-lg transition-all ${
            isActive
              ? 'bg-white text-blue-600 scale-110'
              : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-[10px] mt-0.5 font-medium">{label}</span>
        </button>
      );
    }

    return (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
          isActive ? 'text-blue-600' : 'text-gray-400'
        }`}
      >
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] mt-0.5">{label}</span>
      </button>
    );
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 z-50">
        {renderTabButton(slot1, false)}
        {renderTabButton(slot2, false)}
        {renderTabButton(slot3, true)}
        {renderTabButton(slot4, false)}

        {/* Far right: 更多 */}
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
        <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-lg z-40 px-4 py-3">
          <div className="flex justify-around">
            {moreTabs.map(key => {
              const { label, icon: Icon } = ALL_TAB_CONFIG[key];
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

import { useState, useEffect } from 'react';
import { seedData } from './db';
import BottomNav from './components/BottomNav';
import DashboardView from './components/DashboardView';
import ScheduleView from './components/ScheduleView';
import GoalView from './components/GoalView';
import TaskView from './components/TaskView';
import SleepView from './components/SleepView';
import HabitView from './components/HabitView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import ErrorBoundary from './components/ErrorBoundary';
import SearchOverlay from './components/SearchOverlay';
import AIChatView from './components/AIChatView';
import { ThemeProvider } from './components/ThemeProvider';

type Tab = 'dashboard' | 'schedule' | 'task' | 'goal' | 'sleep' | 'habit' | 'stats' | 'settings' | 'ai';

const TAB_ORDER: Tab[] = ['dashboard', 'schedule', 'task', 'goal', 'sleep', 'habit', 'stats', 'settings', 'ai'];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [ready, setReady] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    seedData().then(() => setReady(true));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as Tab;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('navigate-tab', handler);
    return () => window.removeEventListener('navigate-tab', handler);
  }, []);

  // Keyboard shortcuts: Ctrl+1..8 to switch tabs, Ctrl+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
        return;
      }
      if (!e.ctrlKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= TAB_ORDER.length) {
        e.preventDefault();
        setActiveTab(TAB_ORDER[num - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="h-full flex flex-col">
        <main className="flex-1 overflow-hidden pb-14">
          {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
          {activeTab === 'schedule' && <ScheduleView />}
          {activeTab === 'goal' && <GoalView />}
          {activeTab === 'task' && <TaskView />}
          {activeTab === 'sleep' && <SleepView />}
          {activeTab === 'habit' && <HabitView />}
          {activeTab === 'stats' && <StatsView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'ai' && <AIChatView onBack={() => setActiveTab('dashboard')} />}
        </main>
        <BottomNav active={activeTab} onChange={setActiveTab} />

        {showSearch && (
          <SearchOverlay
            onNavigate={(tab) => {
              // Cast to full Tab type since SearchOverlay only uses subset
              setActiveTab(tab as Tab);
            }}
            onClose={() => setShowSearch(false)}
          />
        )}
      </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;

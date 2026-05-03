import { useState, useEffect } from 'react';
import { seedData } from './db';
import BottomNav from './components/BottomNav';
import DashboardView from './components/DashboardView';
import ScheduleView from './components/ScheduleView';
import GoalView from './components/GoalView';
import TaskView from './components/TaskView';
import SleepView from './components/SleepView';

type Tab = 'dashboard' | 'schedule' | 'goal' | 'task' | 'sleep';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Initialize DB with demo data on first load
    seedData().then(() => setReady(true));
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
    <div className="h-full flex flex-col bg-gray-50">
      <main className="flex-1 overflow-hidden pb-14">
        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'goal' && <GoalView />}
        {activeTab === 'task' && <TaskView />}
        {activeTab === 'sleep' && <SleepView />}
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default App;

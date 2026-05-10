import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../db';
import { Search, X, ListTodo, Target, Calendar, Dumbbell, Moon, Smile, ArrowRight } from 'lucide-react';

type Tab = 'task' | 'goal' | 'schedule' | 'habit' | 'sleep' | 'dashboard';

interface SearchResult {
  type: 'task' | 'goal' | 'lesson' | 'habit' | 'sleep' | 'mood';
  title: string;
  subtitle?: string;
  tab: Tab;
  id?: number;
  color?: string;
}

interface Props {
  onNavigate: (tab: Tab) => void;
  onClose: () => void;
}

const TYPE_ICONS = {
  task: ListTodo,
  goal: Target,
  lesson: Calendar,
  habit: Dumbbell,
  sleep: Moon,
  mood: Smile,
};

const TYPE_LABELS = {
  task: '任务',
  goal: '目标',
  lesson: '课程',
  habit: '习惯',
  sleep: '睡眠',
  mood: '心情',
};

export default function SearchOverlay({ onNavigate, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase().trim();
    loadResults(q);
  }, [query]);

  async function loadResults(q: string) {
    const [tasks, goals, lessons, habits, sleepRecords, moodEntries] = await Promise.all([
      db.tasks.toArray(),
      db.goals.toArray(),
      db.lessons.toArray(),
      db.habits.toArray(),
      db.sleepRecords.toArray(),
      db.moodEntries.toArray(),
    ]);

    const matched: SearchResult[] = [];

    tasks.forEach(t => {
      const inTitle = t.title.toLowerCase().includes(q);
      const inDesc = t.description?.toLowerCase().includes(q);
      if (inTitle || inDesc) {
        matched.push({
          type: 'task', title: t.title, tab: 'task', id: t.id,
          subtitle: t.status === 'done' ? '已完成' : t.dueDate ? `截止: ${t.dueDate.slice(5)}` : undefined,
          color: t.color,
        });
      }
    });

    goals.forEach(g => {
      if (g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)) {
        matched.push({
          type: 'goal', title: g.title, tab: 'goal', id: g.id,
          subtitle: g.description || undefined,
          color: g.color,
        });
      }
    });

    lessons.forEach(l => {
      if (l.title.toLowerCase().includes(q) || (l.location && l.location.toLowerCase().includes(q))) {
        const dayLabel = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][l.dayOfWeek];
        matched.push({
          type: 'lesson', title: l.title, tab: 'schedule', id: l.id,
          subtitle: `${dayLabel} ${String(l.startHour).padStart(2, '0')}:${String(l.startMinute).padStart(2, '0')} ${l.location || ''}`,
          color: l.color,
        });
      }
    });

    habits.forEach(h => {
      if (h.name.toLowerCase().includes(q)) {
        matched.push({
          type: 'habit', title: h.name, tab: 'habit', id: h.id,
          color: h.color,
        });
      }
    });

    sleepRecords.forEach(s => {
      if (s.date.includes(q)) {
        matched.push({
          type: 'sleep', title: `${s.date} 睡眠记录`, tab: 'sleep', id: s.id,
          subtitle: `质量: ${s.quality}/5`,
        });
      }
    });

    moodEntries.forEach(m => {
      if (m.note.toLowerCase().includes(q) || m.date.includes(q)) {
        matched.push({
          type: 'mood', title: `${m.date} 心情`, tab: 'dashboard', id: m.id,
          subtitle: m.note || undefined,
        });
      }
    });

    setResults(matched.slice(0, 20));
    setSelectedIndex(0);
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      const r = results[selectedIndex];
      onNavigate(r.tab);
      onClose();
    }
  }, [results, selectedIndex, onNavigate, onClose]);

  function handleSelect(result: SearchResult) {
    onNavigate(result.tab);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 ">
          <Search size={20} className="text-gray-400 dark:text-gray-500 " />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索任务、目标、课程、习惯..."
            className="flex-1 text-base outline-none placeholder:text-gray-400 dark:text-gray-500 "
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 ">
              <X size={18} />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400 ">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 ">
              <Search size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">没有找到匹配的结果</p>
            </div>
          )}

          {results.length === 0 && !query.trim() && (
            <div className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 space-y-1">
              <p className="font-medium text-gray-500 dark:text-gray-400 mb-2">搜索提示</p>
              <p>· 输入关键词搜索任务、目标、课程、习惯</p>
              <p>· 支持心情日记内容搜索</p>
              <p>· 按 Enter 跳转，ESC 关闭</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-1">
              {results.map((result, index) => {
                const Icon = TYPE_ICONS[result.type];
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={`${result.type}-${result.id}-${index}`}
                    onClick={() => handleSelect(result)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: result.color || '#e5e7eb' }}
                    >
                      <Icon size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{result.subtitle}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {TYPE_LABELS[result.type]}
                      </span>
                      <ArrowRight size={14} className="text-gray-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-between">
            <span>{results.length} 个结果</span>
            <span>↑↓ 选择 · Enter 打开</span>
          </div>
        )}
      </div>
    </div>
  );
}

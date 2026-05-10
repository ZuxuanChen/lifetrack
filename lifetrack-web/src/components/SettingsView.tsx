import { useState, useRef } from 'react';
import { db, CURRENT_SCHEMA_VERSION } from '../db';
import { useTheme } from './ThemeProvider';
import { parseExcelFile } from '../utils/excel-import';
import { ArrowLeft, Trash2, AlertTriangle, Settings, LayoutTemplate, Download, Upload, FileJson, FileSpreadsheet, Moon, Sun, Monitor } from 'lucide-react';

const NAV_OPTIONS = [
  { value: 'task', label: '任务' },
  { value: 'habit', label: '习惯' },
  { value: 'goal', label: '目标' },
  { value: 'sleep', label: '睡眠' },
  { value: 'stats', label: '数据' },
  { value: 'schedule', label: '课程表' },
  { value: 'dashboard', label: '总览' },
  { value: 'settings', label: '设置' },
];

function getStoredNav(key: string, defaultValue: string): string {
  const val = localStorage.getItem(key);
  return NAV_OPTIONS.some(o => o.value === val) ? val! : defaultValue;
}

export default function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [showConfirm1, setShowConfirm1] = useState(false);
  const [showConfirm2, setShowConfirm2] = useState(false);
  const [slot1, setSlot1] = useState(() => getStoredNav('lifetrack-nav-slot-1', 'task'));
  const [slot2, setSlot2] = useState(() => getStoredNav('lifetrack-nav-slot-2', 'schedule'));
  const [slot3, setSlot3] = useState(() => getStoredNav('lifetrack-nav-slot-3', 'dashboard'));
  const [slot4, setSlot4] = useState(() => getStoredNav('lifetrack-nav-slot-4', 'habit'));

  function handleNavChange(key: string, value: string) {
    localStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent('nav-config-changed'));
  }

  async function handleClear() {
    await db.delete();
    window.location.reload();
  }

  // ===== 数据导出/导入 =====
  const [showExportImport, setShowExportImport] = useState(false);

  async function exportData() {
    const data = {
      goals: await db.goals.toArray(),
      tasks: await db.tasks.toArray(),
      lessons: await db.lessons.toArray(),
      sleepRecords: await db.sleepRecords.toArray(),
      habits: await db.habits.toArray(),
      habitLogs: await db.habitLogs.toArray(),
      moodEntries: await db.moodEntries.toArray(),
      focusSessions: await db.focusSessions.toArray(),
      badgeUnlocks: await db.badgeUnlocks.toArray(),
      exportAt: new Date().toISOString(),
      version: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifetrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    goals: number; tasks: number; lessons: number; sleep: number;
    habits: number; logs: number; moods: number; focus: number; badges: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('overwrite');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelImportResult, setExcelImportResult] = useState<{
    goalsAdded: number;
    tasksAdded: number;
    lessonsAdded: number;
    habitsAdded: number;
    errors: string[];
  } | null>(null);

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelImportResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const { goals, tasks, lessons, habits, errors } = parseExcelFile(buffer);
      const result = {
        goalsAdded: 0,
        tasksAdded: 0,
        lessonsAdded: 0,
        habitsAdded: 0,
        errors,
      };
      for (const g of goals) {
        if (g.title) {
          await db.goals.add(g as any);
          result.goalsAdded++;
        }
      }
      for (const t of tasks) {
        if (t.title) {
          await db.tasks.add(t as any);
          result.tasksAdded++;
        }
      }
      for (const l of lessons) {
        if (l.title) {
          await db.lessons.add(l as any);
          result.lessonsAdded++;
        }
      }
      for (const h of habits) {
        if (h.name) {
          await db.habits.add(h as any);
          result.habitsAdded++;
        }
      }
      setExcelImportResult(result);
    } catch (err: any) {
      setExcelImportResult({ goalsAdded: 0, tasksAdded: 0, lessonsAdded: 0, habitsAdded: 0, errors: [err.message || 'Excel 解析失败'] });
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !Array.isArray(data.goals)) {
        throw new Error('文件格式不正确，缺少必要字段');
      }
      const backupVersion = data.schemaVersion || 1;
      if (backupVersion < CURRENT_SCHEMA_VERSION) {
        setImportError(`⚠️ 备份来自旧版本 (v${backupVersion})，当前版本 v${CURRENT_SCHEMA_VERSION}。部分数据可能需要迁移。`);
      } else if (backupVersion > CURRENT_SCHEMA_VERSION) {
        setImportError(`⚠️ 备份来自新版本 (v${backupVersion})，当前版本 v${CURRENT_SCHEMA_VERSION}。请先升级应用。`);
        setImportPreview(null);
        return;
      } else {
        setImportError(null);
      }
      setImportPreview({
        goals: data.goals.length,
        tasks: data.tasks?.length || 0,
        lessons: data.lessons?.length || 0,
        sleep: data.sleepRecords?.length || 0,
        habits: data.habits?.length || 0,
        logs: data.habitLogs?.length || 0,
        moods: data.moodEntries?.length || 0,
        focus: data.focusSessions?.length || 0,
        badges: data.badgeUnlocks?.length || 0,
      });
    } catch (err: any) {
      setImportError(err.message || '文件解析失败');
      setImportPreview(null);
    }
  }

  async function confirmImport() {
    if (!importFile) return;
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);

      if (importMode === 'overwrite') {
        // Clear existing data
        await db.goals.clear();
        await db.tasks.clear();
        await db.lessons.clear();
        await db.sleepRecords.clear();
        await db.habits.clear();
        await db.habitLogs.clear();
        await db.moodEntries.clear();
        await db.focusSessions.clear();
        await db.badgeUnlocks.clear();
      }

      // Import new data (strip auto-increment IDs to let Dexie reassign)
      const stripId = (arr: any[]) => arr.map((item: any) => {
        const { id, ...rest } = item;
        return rest;
      });

      // For merge mode, we need to check for conflicts
      if (importMode === 'merge') {
        // Goals: skip if title exists
        const existingGoals = await db.goals.toArray();
        const newGoals = stripId(data.goals || []).filter((g: any) => !existingGoals.some(eg => eg.title === g.title));
        if (newGoals.length) await db.goals.bulkAdd(newGoals);

        // Tasks: skip if title exists
        const existingTasks = await db.tasks.toArray();
        const newTasks = stripId(data.tasks || []).filter((t: any) => !existingTasks.some(et => et.title === t.title));
        if (newTasks.length) await db.tasks.bulkAdd(newTasks);

        // Lessons: skip if same day+start time
        const existingLessons = await db.lessons.toArray();
        const newLessons = stripId(data.lessons || []).filter((l: any) => !existingLessons.some(el => el.dayOfWeek === l.dayOfWeek && el.startHour === l.startHour && el.startMinute === l.startMinute));
        if (newLessons.length) await db.lessons.bulkAdd(newLessons);

        // Sleep: skip if same date
        const existingSleep = await db.sleepRecords.toArray();
        const newSleep = stripId(data.sleepRecords || []).filter((s: any) => !existingSleep.some(es => es.date === s.date));
        if (newSleep.length) await db.sleepRecords.bulkAdd(newSleep);

        // Habits: skip if name exists
        const existingHabits = await db.habits.toArray();
        const newHabits = stripId(data.habits || []).filter((h: any) => !existingHabits.some(eh => eh.name === h.name));
        if (newHabits.length) await db.habits.bulkAdd(newHabits);

        // HabitLogs: skip if same habit+date
        const existingLogs = await db.habitLogs.toArray();
        const newLogs = stripId(data.habitLogs || []).filter((l: any) => !existingLogs.some(el => el.habitId === l.habitId && el.date === l.date));
        if (newLogs.length) await db.habitLogs.bulkAdd(newLogs);

        // MoodEntries: skip if same date
        const existingMoods = await db.moodEntries.toArray();
        const newMoods = stripId(data.moodEntries || []).filter((m: any) => !existingMoods.some(em => em.date === m.date));
        if (newMoods.length) await db.moodEntries.bulkAdd(newMoods);

        // FocusSessions: skip if same start time
        const existingFocus = await db.focusSessions.toArray();
        const newFocus = stripId(data.focusSessions || []).filter((f: any) => !existingFocus.some(ef => ef.startTime === f.startTime));
        if (newFocus.length) await db.focusSessions.bulkAdd(newFocus);

        // BadgeUnlocks: skip if same badge
        const existingBadges = await db.badgeUnlocks.toArray();
        const newBadges = stripId(data.badgeUnlocks || []).filter((b: any) => !existingBadges.some(eb => eb.badgeId === b.badgeId));
        if (newBadges.length) await db.badgeUnlocks.bulkAdd(newBadges);
      } else {
        // Overwrite mode: simple bulkAdd
        if (data.goals?.length) await db.goals.bulkAdd(stripId(data.goals));
        if (data.tasks?.length) await db.tasks.bulkAdd(stripId(data.tasks));
        if (data.lessons?.length) await db.lessons.bulkAdd(stripId(data.lessons));
        if (data.sleepRecords?.length) await db.sleepRecords.bulkAdd(stripId(data.sleepRecords));
        if (data.habits?.length) await db.habits.bulkAdd(stripId(data.habits));
        if (data.habitLogs?.length) await db.habitLogs.bulkAdd(stripId(data.habitLogs));
        if (data.moodEntries?.length) await db.moodEntries.bulkAdd(stripId(data.moodEntries));
        if (data.focusSessions?.length) await db.focusSessions.bulkAdd(stripId(data.focusSessions));
        if (data.badgeUnlocks?.length) await db.badgeUnlocks.bulkAdd(stripId(data.badgeUnlocks));
      }

      window.location.reload();
    } catch (err: any) {
      setImportError(err.message || '导入失败');
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-200 flex items-center gap-2">
        <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }))}
                className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Theme Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Moon size={18} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-900">主题模式</h2>
          </div>
          <div className="flex gap-2">
            {([
              { value: 'light' as const, label: '浅色', icon: Sun },
              { value: 'dark' as const, label: '深色', icon: Moon },
              { value: 'system' as const, label: '跟随系统', icon: Monitor },
            ]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Navigation Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <LayoutTemplate size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">底部导航</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">位置 1（最左）</label>
              <select
                value={slot1}
                onChange={e => { setSlot1(e.target.value); handleNavChange('lifetrack-nav-slot-1', e.target.value); }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {NAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">位置 2（左中）</label>
              <select
                value={slot2}
                onChange={e => { setSlot2(e.target.value); handleNavChange('lifetrack-nav-slot-2', e.target.value); }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {NAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">位置 3（中间·大按钮）</label>
              <select
                value={slot3}
                onChange={e => { setSlot3(e.target.value); handleNavChange('lifetrack-nav-slot-3', e.target.value); }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {NAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">位置 4（右中）</label>
              <select
                value={slot4}
                onChange={e => { setSlot4(e.target.value); handleNavChange('lifetrack-nav-slot-4', e.target.value); }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {NAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Export/Import Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <FileJson size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-900">数据备份</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={exportData}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium flex items-center justify-center gap-2"
            >
              <Download size={16} />
              导出所有数据（JSON）
            </button>
            <p className="text-xs text-gray-400 text-center">数据版本 v{CURRENT_SCHEMA_VERSION}</p>

            <button
              onClick={() => setShowExportImport(!showExportImport)}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              导入数据
            </button>

            {showExportImport && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 flex items-center justify-center gap-2"
                >
                  {importFile ? importFile.name : '选择 JSON 备份文件'}
                </button>

                {importError && (
                  <p className="text-xs text-red-600">{importError}</p>
                )}

                {importPreview && (
                  <div className="text-xs text-gray-600 space-y-1">
                    <p className="font-medium text-gray-800">检测到以下数据：</p>
                    <div className="grid grid-cols-3 gap-2">
                      <span>目标: {importPreview.goals}</span>
                      <span>任务: {importPreview.tasks}</span>
                      <span>课程: {importPreview.lessons}</span>
                      <span>睡眠: {importPreview.sleep}</span>
                      <span>习惯: {importPreview.habits}</span>
                      <span>打卡: {importPreview.logs}</span>
                      <span>心情: {importPreview.moods}</span>
                      <span>专注: {importPreview.focus}</span>
                      <span>徽章: {importPreview.badges}</span>
                    </div>

                    {/* Import Mode Selector */}
                    <div className="mt-3 space-y-2">
                      <p className="font-medium text-gray-800">导入模式</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setImportMode('overwrite')}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            importMode === 'overwrite'
                              ? 'bg-orange-100 text-orange-700 border border-orange-200'
                              : 'bg-white text-gray-600 border border-gray-200'
                          }`}
                        >
                          覆盖导入
                        </button>
                        <button
                          onClick={() => setImportMode('merge')}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            importMode === 'merge'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-white text-gray-600 border border-gray-200'
                          }`}
                        >
                          合并导入
                        </button>
                      </div>
                      {importMode === 'overwrite' ? (
                        <p className="text-red-600">⚠️ 覆盖导入将删除现有全部数据，不可恢复！</p>
                      ) : (
                        <p className="text-blue-600">ℹ️ 合并导入会跳过已存在的数据，保留现有内容</p>
                      )}
                    </div>

                    <button
                      onClick={() => setShowImportConfirm(true)}
                      className={`w-full py-2 rounded-lg text-white text-sm font-medium mt-2 ${
                        importMode === 'overwrite' ? 'bg-orange-600' : 'bg-blue-600'
                      }`}
                    >
                      确认{importMode === 'overwrite' ? '覆盖' : '合并'}导入
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Excel Import Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet size={18} className="text-green-500" />
              <h2 className="font-semibold text-gray-900">Excel 导入</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              从 .xlsx 文件导入数据。工作表名应包含对应类型（如 Goals、Tasks、Lessons、Habits）。
            </p>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelImport}
            />
            <button
              onClick={() => excelInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-green-600 text-white font-medium flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              选择 Excel 文件
            </button>
            {excelImportResult && (
              <div className="mt-3 text-xs space-y-1">
                <p className="font-medium text-gray-800">导入结果：</p>
                <div className="grid grid-cols-2 gap-1">
                  <span>目标: {excelImportResult.goalsAdded}</span>
                  <span>任务: {excelImportResult.tasksAdded}</span>
                  <span>课程: {excelImportResult.lessonsAdded}</span>
                  <span>习惯: {excelImportResult.habitsAdded}</span>
                </div>
                {excelImportResult.errors.length > 0 && (
                  <div className="text-red-600 mt-1">
                    {excelImportResult.errors.map((e, i) => (
                      <p key={i}>⚠ {e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Clear Data Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Settings size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">开发调试</h2>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-red-500" />
              <span className="font-semibold text-red-700">清除所有数据</span>
            </div>
            <p className="text-sm text-red-600 mb-3">
              这将删除所有本地存储的课程、任务、目标、睡眠记录、习惯打卡、心情记录等数据。操作不可恢复！
            </p>
            <button
              onClick={() => setShowConfirm1(true)}
              className="w-full py-2.5 rounded-xl bg-red-600 text-white font-medium flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              清除所有数据
            </button>
          </div>
        </div>
      </div>

      {/* Step 1 Confirm */}
      {showConfirm1 && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
             onClick={() => setShowConfirm1(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={24} className="text-red-500" />
              <h2 className="text-lg font-bold">确定清除？</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              确定要清除所有数据吗？课程、任务、目标、睡眠记录、习惯打卡、心情记录等将全部删除，<strong className="text-red-600">此操作不可恢复！</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm1(false)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium">
                取消
              </button>
              <button onClick={() => { setShowConfirm1(false); setShowConfirm2(true); }}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium">
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 Confirm */}
      {showConfirm2 && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
             onClick={() => setShowConfirm2(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={24} className="text-red-500" />
              <h2 className="text-lg font-bold">再次确认</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              所有本地数据将被<strong className="text-red-600">永久删除</strong>，无法恢复！确定要继续吗？
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm2(false)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium">
                取消
              </button>
              <button onClick={handleClear}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirm */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
             onClick={() => setShowImportConfirm(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={24} className={importMode === 'overwrite' ? 'text-orange-500' : 'text-blue-500'} />
              <h2 className="text-lg font-bold">确认{importMode === 'overwrite' ? '覆盖' : '合并'}导入？</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {importMode === 'overwrite' ? (
                <>导入将<strong className="text-orange-600">覆盖所有现有数据</strong>。当前数据将被替换为备份文件中的内容，此操作不可恢复。</>
              ) : (
                <>导入将<strong className="text-blue-600">合并到现有数据</strong>。已存在的数据会被保留，仅添加备份中不存在的记录。</>
              )}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowImportConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium">
                取消
              </button>
              <button onClick={confirmImport}
                      className={`flex-1 py-2.5 rounded-xl text-white font-medium ${
                        importMode === 'overwrite' ? 'bg-orange-600' : 'bg-blue-600'
                      }`}>
                确认{importMode === 'overwrite' ? '覆盖' : '合并'}导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { db, type SleepRecord } from '../db';
import { Plus, X, Moon, Star, TrendingUp, ArrowLeft } from 'lucide-react';

const QUALITY_LABELS: Record<number, string> = {
  1: '很差',
  2: '一般',
  3: '还行',
  4: '不错',
  5: '很好',
};

const QUALITY_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-600',
  2: 'bg-orange-100 text-orange-600',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-blue-100 text-blue-600',
  5: 'bg-green-100 text-green-600',
};

export default function SleepView() {
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SleepRecord | null>(null);

  const [date, setDate] = useState('');
  const [bedTime, setBedTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(3);
  const [note, setNote] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    const all = await db.sleepRecords.toArray();
    // Sort by date descending
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecords(all);
  }

  function openForm(record?: SleepRecord) {
    if (record) {
      setEditing(record);
      setDate(record.date);
      setBedTime(record.bedTime);
      setWakeTime(record.wakeTime);
      setQuality(record.quality);
      setNote(record.note || '');
    } else {
      setEditing(null);
      const today = new Date();
      setDate(today.toISOString().split('T')[0]);
      setBedTime('23:00');
      setWakeTime('07:00');
      setQuality(3);
      setNote('');
    }
    setShowForm(true);
  }

  async function saveRecord() {
    const data = {
      id: editing?.id,
      date,
      bedTime,
      wakeTime,
      quality,
      note: note.trim() || undefined,
    };
    if (editing?.id) {
      await db.sleepRecords.update(editing.id, data);
    } else {
      await db.sleepRecords.add(data);
    }
    setShowForm(false);
    loadRecords();
  }

  async function deleteRecord() {
    if (editing?.id && confirm('确定删除这条记录吗？')) {
      await db.sleepRecords.delete(editing.id);
      setShowForm(false);
      loadRecords();
    }
  }

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
    return `${h}小时${m > 0 ? m + '分钟' : ''}`;
  }

  const avgSleep = useMemo(() => {
    if (records.length === 0) return 0;
    const total = records.reduce((sum, r) => sum + calcDuration(r.bedTime, r.wakeTime), 0);
    return Math.round(total / records.length);
  }, [records]);

  const avgQuality = useMemo(() => {
    if (records.length === 0) return 0;
    const total = records.reduce((sum, r) => sum + r.quality, 0);
    return (total / records.length).toFixed(1);
  }, [records]);

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }))}
                  className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold">睡眠记录</h1>
        </div>
        <button onClick={() => openForm()} className="bg-blue-600 text-white p-2 rounded-full shadow-sm">
          <Plus size={18} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="flex gap-3 px-4 py-3">
        <div className="flex-1 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <TrendingUp size={12} />
            <span>平均睡眠</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {records.length > 0 ? formatDuration(avgSleep) : '--'}
          </div>
        </div>
        <div className="flex-1 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <Star size={12} />
            <span>平均质量</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {records.length > 0 ? `${avgQuality} / 5` : '--'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {records.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <Moon size={48} className="mx-auto mb-3 opacity-40" />
            <p>还没有睡眠记录</p>
          </div>
        )}

        {records.map(record => {
          const duration = calcDuration(record.bedTime, record.wakeTime);
          const dateObj = new Date(record.date);
          return (
            <button key={record.id} onClick={() => openForm(record)}
                    className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">
                    {dateObj.getMonth() + 1}月{dateObj.getDate()}日
                    <span className="text-xs text-gray-400 ml-1">
                      周{'日一二三四五六'[dateObj.getDay()]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {record.bedTime} → {record.wakeTime}
                    <span className="text-blue-600 font-medium ml-2">{formatDuration(duration)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${QUALITY_COLORS[record.quality]}`}>
                    {QUALITY_LABELS[record.quality]}
                  </span>
                  <div className="flex gap-0.5 mt-1.5 justify-end">
                    {[1, 2, 3, 4, 5].map(s => (
                      <div key={s} className={`w-1.5 h-1.5 rounded-full ${s <= record.quality ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
              </div>
              {record.note && (
                <p className="text-xs text-gray-400 mt-2">{record.note}</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? '编辑记录' : '添加记录'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">日期</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                       className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-500">入睡时间</label>
                  <input type="time" value={bedTime} onChange={e => setBedTime(e.target.value)}
                         className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-500">起床时间</label>
                  <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
                         className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">睡眠质量</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map(q => (
                    <button key={q} onClick={() => setQuality(q)}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                              quality === q ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                      {QUALITY_LABELS[q]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">备注（可选）</label>
                <input value={note} onChange={e => setNote(e.target.value)}
                       placeholder="比如：喝了咖啡、看了书..."
                       className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {date && bedTime && wakeTime && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  预计睡眠时长: <strong>{formatDuration(calcDuration(bedTime, wakeTime))}</strong>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              {editing && (
                <button onClick={deleteRecord}
                        className="px-4 py-2.5 rounded-xl text-red-600 bg-red-50 font-medium">
                  删除
                </button>
              )}
              <button onClick={saveRecord}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

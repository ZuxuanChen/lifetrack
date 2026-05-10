import { useState, useEffect, useRef } from 'react';
import { generateWithOllama, checkOllamaHealth, listOllamaModels } from '../utils/ollama';
import { ArrowLeft, Send, Bot, User, Wifi, WifiOff, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Props {
  onBack: () => void;
}

const SUGGESTIONS = [
  '帮我总结一下今天的学习进度',
  '给我一些提高专注力的建议',
  '分析一下我的课程安排是否合理',
  '推荐一个适合我的学习目标',
];

export default function AIChatView({ onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('phi4-mini');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkOllamaHealth().then(setOnline);
    listOllamaModels().then(m => {
      setModels(m);
      if (m.length > 0 && !m.includes(selectedModel)) {
        setSelectedModel(m[0]);
      }
    });
    // Re-check health every 10s
    const interval = setInterval(() => {
      checkOllamaHealth().then(setOnline);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const prompt = buildPrompt(text.trim());
      const res = await generateWithOllama(prompt, selectedModel);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.response.trim(),
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        role: 'assistant',
        content: `⚠️ ${err.message || 'AI 服务暂时不可用，请检查本地 Ollama 是否运行'}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function buildPrompt(userText: string): string {
    return `你是一个学习助手，帮助用户管理学习目标、课程安排和习惯养成。请用中文简短回答。\n\n用户：${userText}\n助手：`;
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-purple-500" />
          <h1 className="font-semibold text-gray-900">本地 AI 助手</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {online ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-red-500" />}
          <span className="text-xs text-gray-500">{online ? '已连接' : '未连接'}</span>
          {models.length > 0 && (
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1"
            >
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot size={48} className="mx-auto text-purple-200 mb-4" />
            <p className="text-gray-500 text-sm mb-6">你好！我是你的本地学习助手</p>
            <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            {!online && (
              <p className="text-xs text-red-500 mt-4">
                ⚠️ 未检测到本地 Ollama 服务，请先启动 ollama run {selectedModel}
              </p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-blue-100' : 'bg-purple-100'
            }`}>
              {msg.role === 'user' ? <User size={14} className="text-blue-600" /> : <Bot size={14} className="text-purple-600" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-purple-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-purple-500" />
              <span className="text-sm text-gray-500">思考中...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={online ? '输入问题...' : 'Ollama 未连接'}
            disabled={!online || loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!online || loading || !input.trim()}
            className="p-2.5 rounded-xl bg-purple-600 text-white disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          由本地 Ollama 驱动，数据不会离开您的设备
        </p>
      </div>
    </div>
  );
}

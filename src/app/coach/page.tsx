'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Send, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppData } from '@/hooks/useAppData';
import { loadHistory, type WorkoutSession } from '@/lib';
import { answerCoachQuestion, buildCoachInsights } from '@/lib/coachEngine';

type Message = { id: number; role: 'user' | 'coach'; text: string };

export default function CoachPage() {
  const router = useRouter();
  const { ready, onboarded, profile, plan } = useAppData();
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [counter, setCounter] = useState(1);
  const [chatReady, setChatReady] = useState(false);
  useEffect(() => { if (ready && !onboarded) router.replace('/onboarding'); }, [ready, onboarded, router]);
  useEffect(() => {
    setHistory(loadHistory());
    try {
      const saved = localStorage.getItem('gym-assistant:coach-chat:v1');
      if (saved) { const parsed = JSON.parse(saved) as Message[]; setMessages(parsed); setCounter(parsed.reduce((max, m) => Math.max(max, m.id), 0) + 1); }
    } catch { /* повреждённая история чата просто игнорируется */ }
    setChatReady(true);
  }, []);
  useEffect(() => { if (chatReady) localStorage.setItem('gym-assistant:coach-chat:v1', JSON.stringify(messages.slice(-40))); }, [messages, chatReady]);
  const insights = useMemo(() => profile && plan ? buildCoachInsights(profile, plan, history) : [], [profile, plan, history]);
  if (!ready || !onboarded || !profile || !plan) return <div className="flex min-h-dvh items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  const submit = (e: FormEvent) => {
    e.preventDefault(); const q = question.trim(); if (!q) return;
    const answer = answerCoachQuestion(q, profile, plan, history);
    setMessages((m) => [...m, { id: counter, role: 'user', text: q }, { id: counter + 1, role: 'coach', text: answer }]);
    setCounter((n) => n + 2); setQuestion('');
  };
  return <AppShell><div className="space-y-5 px-4 pb-8 pt-6">
    <header className="animate-enter"><div className="flex items-center gap-2 text-sm font-medium text-accent"><Sparkles size={16} /> Персональный помощник</div><h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">AI Coach</h1><p className="mt-1 text-sm text-gray-500">Анализ тренировок и рекомендации на основе вашего дневника.</p></header>
    <Card className="animate-enter overflow-hidden border-0 bg-[#17243b] p-4 text-white shadow-sm"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Bot size={23} /></div><div><p className="font-semibold">Ваш Coach активен</p><p className="mt-1 text-sm leading-relaxed text-slate-300">Работает локально, без OpenAI API и платных запросов. Использует профиль, программу и историю тренировок на этом устройстве.</p></div></div><div className="mt-4 flex items-center gap-2 text-xs text-slate-300"><ShieldCheck size={14} /> Данные не отправляются во внешнюю AI-службу</div></Card>
    <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-base font-semibold text-gray-900">Рекомендации</h2><span className="text-xs text-gray-400">По данным дневника</span></div>{insights.map((item) => <Card key={item.id} className="animate-enter p-4"><div className="flex items-start gap-3"><div className={['mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', item.tone === 'warning' ? 'bg-amber-50 text-amber-700' : item.tone === 'positive' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'].join(' ')}><TrendingUp size={18} /></div><div><h3 className="text-sm font-semibold text-gray-900">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-gray-600">{item.body}</p></div></div></Card>)}</section>
    <section className="space-y-3"><h2 className="text-base font-semibold text-gray-900">Спросить Coach</h2><Card className="space-y-3 p-4">{messages.length === 0 ? <p className="text-sm text-gray-500">Например: «Когда увеличивать рабочий вес?» или «Как лучше восстанавливаться?»</p> : <div className="max-h-80 space-y-3 overflow-y-auto">{messages.map((m) => <div key={m.id} className={m.role === 'user' ? 'ml-8 rounded-2xl rounded-br-md bg-blue-600 px-3 py-2.5 text-sm text-white' : 'mr-5 rounded-2xl rounded-bl-md bg-gray-100 px-3 py-2.5 text-sm leading-relaxed text-gray-700'}>{m.text}</div>)}</div>}<form onSubmit={submit} className="flex items-center gap-2 border-t border-gray-100 pt-3"><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ваш вопрос…" className="h-11 min-w-0 flex-1 rounded-xl bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /><Button type="submit" disabled={!question.trim()}><Send size={17} /></Button></form></Card></section>
    <p className="text-xs leading-relaxed text-gray-400">Рекомендации носят информационный характер и не заменяют тренера или врача. При боли, травме или хроническом заболевании обратитесь к квалифицированному специалисту.</p>
  </div></AppShell>;
}

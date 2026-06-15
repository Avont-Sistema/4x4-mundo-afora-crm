'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Plus, X, CheckSquare, Square, MapPin,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────
type EventType = 'evento' | 'tarefa' | 'lembrete';

interface AgendaEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: EventType;
  done: boolean;
}

interface AgendaTodo {
  id: string;
  text: string;
  done: boolean;
}

interface ExpRange {
  id: string;
  routeName: string;
  startDate: string;
  endDate?: string;
  location?: string;
  status: string;
}

// ── Constants ─────────────────────────────────────────────────────────────
const EVENTS_KEY = '4x4_agenda_events';
const TODOS_KEY = '4x4_agenda_todos';

const EVENT_COLORS: Record<EventType, string> = {
  evento: 'bg-yellow-400',
  tarefa: 'bg-amber-500',
  lembrete: 'bg-purple-500',
};
const EVENT_LABELS: Record<EventType, string> = {
  evento: 'Evento',
  tarefa: 'Tarefa',
  lembrete: 'Lembrete',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ── Helpers ───────────────────────────────────────────────────────────────
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseYMD(s: string): Date {
  return new Date(s.length <= 10 ? s + 'T12:00:00' : s);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// ── Component ─────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based
  const [selectedDay, setSelectedDay] = useState(toYMD(today));
  const [expeditions, setExpeditions] = useState<ExpRange[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [todos, setTodos] = useState<AgendaTodo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<EventType>('evento');
  const [newTodo, setNewTodo] = useState('');

  // Persist events/todos in localStorage
  useEffect(() => {
    try {
      const e = localStorage.getItem(EVENTS_KEY);
      if (e) setEvents(JSON.parse(e));
      const t = localStorage.getItem(TODOS_KEY);
      if (t) setTodos(JSON.parse(t));
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/expeditions')
      .then(r => r.json())
      .then(d => setExpeditions(
        (d.expeditions || []).filter((e: any) => e.startDate).map((e: any) => ({
          id: e.id,
          routeName: e.routeName,
          startDate: e.startDate,
          endDate: e.endDate,
          location: e.location,
          status: e.status,
        }))
      ))
      .catch(() => {});
  }, []);

  const saveEvents = (items: AgendaEvent[]) => {
    setEvents(items);
    try { localStorage.setItem(EVENTS_KEY, JSON.stringify(items)); } catch {}
  };
  const saveTodos = (items: AgendaTodo[]) => {
    setTodos(items);
    try { localStorage.setItem(TODOS_KEY, JSON.stringify(items)); } catch {}
  };

  // ── Calendar grid ─────────────────────────────────────────────────────
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Array of date strings or null for empty leading cells
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toYMD(new Date(viewYear, viewMonth, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  function expsForDay(dateStr: string): ExpRange[] {
    const day = parseYMD(dateStr).getTime();
    return expeditions.filter(exp => {
      const start = parseYMD(exp.startDate).getTime();
      const end = exp.endDate ? parseYMD(exp.endDate).getTime() : start;
      return day >= start && day <= end;
    });
  }

  function isExpStart(dateStr: string): boolean {
    const day = parseYMD(dateStr);
    return expeditions.some(e => sameDay(parseYMD(e.startDate), day));
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const todayStr = toYMD(today);
  const dayEvents = events.filter(e => e.date === selectedDay);
  const dayExps = expsForDay(selectedDay);

  const addEvent = () => {
    if (!newTitle.trim()) return;
    saveEvents([...events, {
      id: crypto.randomUUID(),
      date: selectedDay,
      title: newTitle.trim(),
      type: newType,
      done: false,
    }]);
    setNewTitle('');
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    saveTodos([...todos, { id: crypto.randomUUID(), text: newTodo.trim(), done: false }]);
    setNewTodo('');
  };

  // Formatted label for selected day
  const selDate = parseYMD(selectedDay);
  const selLabel = `${WEEKDAYS[selDate.getDay()]}, ${selDate.getDate()} de ${MONTHS_PT[selDate.getMonth()]}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl font-bold">Agenda</h1>
        <p className="text-gray-500 text-sm mt-1">Calendário de expedições, eventos e tarefas</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Calendar ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 card">
          {/* Header nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold">{MONTHS_PT[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {cells.map((dateStr, i) => {
              if (!dateStr) return <div key={i} className="bg-gray-50 h-[72px]" />;

              const inExp = expsForDay(dateStr);
              const expStart = isExpStart(dateStr);
              const hasEvents = events.some(e => e.date === dateStr);
              const isSelected = dateStr === selectedDay;
              const isToday = dateStr === todayStr;
              const dayNum = parseInt(dateStr.split('-')[2], 10);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(dateStr)}
                  className={`h-[72px] p-1.5 text-left flex flex-col transition-colors ${
                    isSelected
                      ? 'bg-yellow-400 text-black'
                      : inExp.length > 0
                        ? 'bg-yellow-50 hover:bg-yellow-100'
                        : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Day number */}
                  <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${
                    isToday && !isSelected
                      ? 'bg-yellow-400 text-black text-[10px]'
                      : ''
                  }`}>
                    {dayNum}
                  </span>

                  {/* Expedition label (first day of expedition) */}
                  <div className="mt-auto w-full overflow-hidden space-y-0.5">
                    {expStart && inExp.slice(0, 1).map(exp => (
                      <span
                        key={exp.id}
                        className={`block text-[9px] truncate px-1 rounded leading-tight ${
                          isSelected ? 'bg-yellow-400 text-black' : 'bg-yellow-200 text-amber-800'
                        }`}
                      >
                        {exp.routeName}
                      </span>
                    ))}

                    {/* Event dots */}
                    {hasEvents && (
                      <div className="flex gap-0.5 flex-wrap">
                        {events.filter(e => e.date === dateStr).slice(0, 4).map(ev => (
                          <span
                            key={ev.id}
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              isSelected ? 'bg-yellow-200' : EVENT_COLORS[ev.type]
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block" /> Expedição
            </span>
            {(Object.entries(EVENT_COLORS) as [EventType, string][]).map(([t, cls]) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full inline-block ${cls}`} /> {EVENT_LABELS[t]}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right panel ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Day details */}
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">{selLabel}</h3>

            {/* Expeditions on this day */}
            {dayExps.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {dayExps.map(exp => (
                  <Link
                    key={exp.id}
                    href={`/dashboard/expeditions/${exp.id}`}
                    className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group"
                  >
                    <MapPin size={12} className="text-amber-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-amber-800 truncate">{exp.routeName}</p>
                      {exp.location && (
                        <p className="text-[10px] text-amber-600 truncate">{exp.location}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Events for this day */}
            {dayEvents.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {dayEvents.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() =>
                        saveEvents(events.map(e => e.id === ev.id ? { ...e, done: !e.done } : e))
                      }
                      className="flex-shrink-0"
                    >
                      {ev.done
                        ? <CheckSquare size={15} className="text-emerald-500" />
                        : <Square size={15} className="text-gray-400 hover:text-amber-500" />}
                    </button>
                    <span className={`flex-1 text-sm min-w-0 truncate ${ev.done ? 'line-through text-gray-400' : ''}`}>
                      {ev.title}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full text-white flex-shrink-0 ${EVENT_COLORS[ev.type]}`}>
                      {EVENT_LABELS[ev.type]}
                    </span>
                    <button
                      onClick={() => saveEvents(events.filter(e => e.id !== ev.id))}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-50 rounded flex-shrink-0"
                    >
                      <X size={11} className="text-rose-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {dayExps.length === 0 && dayEvents.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">Nenhum evento neste dia</p>
            )}

            {/* Add event */}
            <div className="border-t border-gray-100 pt-3">
              {/* Type selector */}
              <div className="flex gap-1 mb-2">
                {(Object.keys(EVENT_LABELS) as EventType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                      newType === t ? `${EVENT_COLORS[t]} text-white` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {EVENT_LABELS[t]}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  className="input flex-1 text-sm py-1.5"
                  placeholder="Adicionar item..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEvent()}
                />
                <button onClick={addEvent} className="btn btn-primary px-2.5 py-1.5">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* General to-do */}
          <div className="card flex flex-col">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
              <CheckSquare size={15} className="text-purple-500" /> A Fazer (geral)
            </h3>
            <div className="flex gap-1 mb-3">
              <input
                className="input flex-1 text-sm py-1.5"
                placeholder="Nova tarefa..."
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
              />
              <button onClick={addTodo} className="btn btn-primary px-2.5 py-1.5">
                <Plus size={14} />
              </button>
            </div>

            {todos.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nenhuma tarefa ainda</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {todos.map(t => (
                  <div key={t.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => saveTodos(todos.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                      className="flex-shrink-0"
                    >
                      {t.done
                        ? <CheckSquare size={15} className="text-emerald-500" />
                        : <Square size={15} className="text-gray-400 hover:text-amber-500" />}
                    </button>
                    <span className={`flex-1 text-sm min-w-0 ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {t.text}
                    </span>
                    <button
                      onClick={() => saveTodos(todos.filter(x => x.id !== t.id))}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-50 rounded flex-shrink-0"
                    >
                      <X size={11} className="text-rose-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {todos.some(t => t.done) && (
              <button
                onClick={() => saveTodos(todos.filter(t => !t.done))}
                className="mt-3 text-xs text-gray-400 hover:text-rose-500 self-end transition-colors"
              >
                Limpar concluídos
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

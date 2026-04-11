import React, { useState } from 'react';
import { Task } from '../types';
import { cn } from '../lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  CheckCircle2, 
  Circle, 
  Clock 
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO,
  isValid
} from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  date: string | null;
  status?: string;
  type: 'task' | 'project';
  project_name?: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-indigo-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-indigo-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const date = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-2">
          {date[i]}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        const dayEvents = events.filter(event => {
          if (!event.date) return false;
          const eventDate = parseISO(event.date);
          return isValid(eventDate) && isSameDay(eventDate, cloneDay);
        });

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[120px] p-2 border border-slate-100 transition-all",
              !isSameMonth(day, monthStart) ? "bg-slate-50/30 text-slate-300" : "bg-white text-slate-900",
              isSameDay(day, new Date()) && "bg-indigo-50/30 border-indigo-100"
            )}
          >
            <span className={cn(
              "text-xs font-bold",
              isSameDay(day, new Date()) && "text-indigo-600"
            )}>{formattedDate}</span>
            
            <div className="mt-2 space-y-1">
              {dayEvents.map(event => (
                <div 
                  key={`${event.type}-${event.id}`} 
                  className={cn(
                    "text-[9px] font-bold p-1 rounded-md truncate border",
                    event.type === 'project'
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : event.status === 'Completed' 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : "bg-indigo-50 text-indigo-600 border-indigo-100"
                  )}
                  title={`${event.type.toUpperCase()}: ${event.title}${event.project_name ? ` (${event.project_name})` : ''}`}
                >
                  <span className="opacity-50 mr-1">
                    {event.type === 'project' ? 'P:' : 'T:'}
                  </span>
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">{rows}</div>;
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

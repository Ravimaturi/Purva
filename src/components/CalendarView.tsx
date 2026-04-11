import React, { useState } from 'react';
import { Task } from '../types';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
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
  onEventClick?: (event: CalendarEvent) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onEventClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

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
            onClick={() => setSelectedDay(cloneDay)}
            className={cn(
              "min-h-[120px] p-2 border border-slate-100 transition-all cursor-pointer",
              !isSameMonth(day, monthStart) ? "bg-slate-50/30 text-slate-300" : "bg-white text-slate-900",
              isSameDay(day, new Date()) && "bg-indigo-50/30 border-indigo-100",
              isSameDay(day, selectedDay) && "ring-2 ring-indigo-500 ring-inset z-10"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  className={cn(
                    "text-[9px] font-bold p-1 rounded-md truncate border cursor-pointer hover:brightness-95 transition-all",
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

  const renderSelectedDayEvents = () => {
    const dayEvents = events.filter(event => {
      if (!event.date) return false;
      const eventDate = parseISO(event.date);
      return isValid(eventDate) && isSameDay(eventDate, selectedDay);
    });

    return (
      <div className="mt-8 bg-slate-50 rounded-3xl p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
            Events for {format(selectedDay, 'MMMM d, yyyy')}
          </h3>
          <Badge variant="secondary" className="bg-white text-indigo-600 font-bold">
            {dayEvents.length} Events
          </Badge>
        </div>

        {dayEvents.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            No events scheduled for this day.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dayEvents.map(event => (
              <div 
                key={`${event.type}-${event.id}`}
                onClick={() => onEventClick?.(event)}
                className={cn(
                  "p-4 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group",
                  event.type === 'project' ? "border-amber-100" : "border-indigo-100"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn(
                    "text-[8px] font-black uppercase tracking-tighter",
                    event.type === 'project' ? "bg-amber-500" : "bg-indigo-500"
                  )}>
                    {event.type}
                  </Badge>
                  {event.status && (
                    <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest border-slate-200">
                      {event.status}
                    </Badge>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{event.title}</h4>
                {event.project_name && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Project: {event.project_name}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderSelectedDayEvents()}
    </div>
  );
};

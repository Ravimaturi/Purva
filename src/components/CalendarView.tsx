import React, { useState, useEffect } from 'react';
import { Calendar } from './ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '../lib/supabase';
import { Project } from '../types';
import { format, isSameDay, parseISO } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  MapPin, 
  User as UserIcon,
  Clock
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

export const CalendarView: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedDateProjects = projects.filter(p => 
    p.deadline && isSameDay(parseISO(p.deadline), date || new Date())
  );

  const upcomingProjects = projects
    .filter(p => p.deadline && parseISO(p.deadline) >= new Date())
    .sort((a, b) => parseISO(a.deadline!).getTime() - parseISO(b.deadline!).getTime())
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full animate-in fade-in zoom-in-95 duration-500">
      {/* Calendar Card */}
      <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden bg-white rounded-3xl">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-2xl border-none p-0"
                classNames={{
                  day_selected: "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white focus:bg-indigo-600 focus:text-white rounded-xl",
                  day_today: "bg-slate-100 text-indigo-600 font-bold rounded-xl",
                  day: "h-12 w-12 p-0 font-medium aria-selected:opacity-100 hover:bg-slate-50 rounded-xl transition-colors",
                  head_cell: "text-slate-400 font-bold text-[10px] uppercase tracking-widest h-12 w-12",
                  nav_button: "h-10 w-10 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-50 text-slate-500",
                }}
              />
            </div>
            <div className="w-full md:w-80 space-y-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {date ? format(date, 'MMMM d') : 'Select a date'}
                </h3>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">
                  {date ? format(date, 'EEEE, yyyy') : ''}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Deadlines for this day
                </h4>
                <div className="space-y-3">
                  {selectedDateProjects.length > 0 ? (
                    selectedDateProjects.map(p => (
                      <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors group cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</h5>
                            <p className="text-[10px] font-medium text-slate-500 mt-0.5">{p.client_name}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                      <CalendarIcon className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs font-medium text-slate-400">No deadlines scheduled</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden flex flex-col">
        <CardHeader className="p-6 border-b border-slate-50">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-[600px]">
            <div className="p-6 space-y-6">
              {upcomingProjects.map((p, i) => (
                <div key={p.id} className="flex gap-4 group cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex flex-col items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <span className="text-[10px] font-bold uppercase">{format(parseISO(p.deadline!), 'MMM')}</span>
                      <span className="text-lg font-black leading-none">{format(parseISO(p.deadline!), 'd')}</span>
                    </div>
                    {i !== upcomingProjects.length - 1 && <div className="w-px h-full bg-slate-100" />}
                  </div>
                  <div className="flex-1 pt-1 space-y-1">
                    <h5 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</h5>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <UserIcon className="w-3 h-3" />
                        <span>{p.assigned_to}</span>
                      </div>
                      <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 rounded-full px-2 py-0">
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

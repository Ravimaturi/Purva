import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Task, Project } from '../types';
import { CalendarView } from './CalendarView';
import { useUser } from '../contexts/UserContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const GlobalCalendar: React.FC<{ onProjectClick: (p: Project) => void }> = ({ onProjectClick }) => {
  const { user } = useUser();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Projects (for deadlines and mapping)
      let projectsQuery = supabase.from('projects').select('*');
      if (user?.role !== 'admin') {
        projectsQuery = projectsQuery.eq('assigned_to', user?.full_name);
      }
      const { data: projectsData, error: projectsError } = await projectsQuery;
      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch Tasks
      let tasksQuery = supabase.from('tasks').select('*, projects(name)');
      if (user?.role !== 'admin') {
        tasksQuery = tasksQuery.eq('assigned_to', user?.full_name);
      }
      const { data: tasksData, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      const taskEvents = (tasksData || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        date: t.deadline,
        status: t.status,
        type: 'task',
        project_id: t.project_id,
        project_name: t.projects?.name
      }));

      const projectEvents = (projectsData || []).map((p: Project) => ({
        id: p.id,
        title: `Project Deadline: ${p.name}`,
        date: p.deadline,
        status: p.status,
        type: 'project',
        project_id: p.id,
        project_name: p.name
      }));

      setEvents([...taskEvents, ...projectEvents]);
    } catch (err: any) {
      console.error('Error fetching global calendar data:', err);
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: any) => {
    const project = projects.find(p => p.id === event.project_id);
    if (project) {
      onProjectClick(project);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overall Calendar</h2>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Showing {events.length} events {user?.role !== 'admin' ? 'related to you' : 'across all projects'}
          </p>
        </div>
      </div>
      <CalendarView events={events} onEventClick={handleEventClick} />
    </div>
  );
};

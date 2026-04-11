import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Task, Project } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { useUser } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import { Loader2, Filter } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';

export const GlobalKanban: React.FC<{ onProjectClick: (p: Project) => void }> = ({ onProjectClick }) => {
  const { user } = useUser();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Projects
      let projectsQuery = supabase.from('projects').select('*');
      if (user?.role !== 'admin') {
        projectsQuery = projectsQuery.eq('assigned_to', user?.full_name);
      }
      const { data: projectsData, error: projectsError } = await projectsQuery;
      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch Tasks
      let query = supabase.from('tasks').select('*, projects(name)');
      if (user?.role !== 'admin') {
        query = query.eq('assigned_to', user?.full_name);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      console.error('Error fetching global tasks:', err);
      toast.error('Failed to load Kanban board');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'Completed' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;
      
      // Update local state
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      toast.success(`Task moved to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const handleTaskClick = (task: Task) => {
    const project = projects.find(p => p.id === task.project_id);
    if (project) {
      onProjectClick(project);
    }
  };

  const filteredTasks = selectedProjectId === 'all' 
    ? tasks 
    : tasks.filter(t => t.project_id === selectedProjectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('kanban')}</h2>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px] border-none shadow-none h-8 p-0 focus:ring-0 text-xs font-bold">
                <SelectValue placeholder={t('filter_by_project')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{t('all_projects')}</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {t('showing')} {filteredTasks.length} {t('tasks')} {user?.role !== 'admin' ? t('assigned_to_you') : t('across_all_projects')}
            </p>
          </div>
        </div>
      </div>
      <KanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange} onTaskClick={handleTaskClick} />
    </div>
  );
};

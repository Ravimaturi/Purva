import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { useUser } from '../contexts/UserContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const GlobalKanban: React.FC = () => {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let query = supabase.from('tasks').select('*');
      
      // If not admin, only show tasks assigned to the user
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
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overall Kanban Board</h2>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Showing {tasks.length} tasks {user?.role !== 'admin' ? 'assigned to you' : 'across all projects'}
          </p>
        </div>
      </div>
      <KanbanBoard tasks={tasks} onStatusChange={handleStatusChange} />
    </div>
  );
};

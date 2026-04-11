import React from 'react';
import { Task } from '../types';
import { cn } from '../lib/utils';
import { Calendar, User, CheckCircle2, Circle, Clock } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

interface TaskWithProject extends Task {
  projects?: {
    name: string;
  };
}

interface KanbanBoardProps {
  tasks: TaskWithProject[];
  onStatusChange: (task: TaskWithProject, newStatus: Task['status']) => void;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'MMM d') : 'N/A';
  } catch {
    return 'N/A';
  }
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onStatusChange }) => {
  const columns: { title: string; status: Task['status']; icon: any; color: string }[] = [
    { title: 'To Do', status: 'Todo', icon: Circle, color: 'bg-slate-100 text-slate-600' },
    { title: 'In Progress', status: 'In Progress', icon: Clock, color: 'bg-indigo-50 text-indigo-600' },
    { title: 'Completed', status: 'Completed', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
      {columns.map((column) => (
        <div key={column.status} className="flex flex-col gap-4">
          <div className={cn(
            "flex items-center justify-between p-3 rounded-xl font-bold text-xs uppercase tracking-widest",
            column.color
          )}>
            <div className="flex items-center gap-2">
              <column.icon className="w-4 h-4" />
              {column.title}
            </div>
            <span className="bg-white/50 px-2 py-0.5 rounded-full">
              {tasks.filter(t => t.status === column.status).length}
            </span>
          </div>

          <div className="flex-1 bg-slate-50/50 rounded-2xl p-3 space-y-3 border border-slate-100">
            {tasks.filter(t => t.status === column.status).map((task) => (
              <div 
                key={task.id} 
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group cursor-pointer"
                onClick={() => {
                  const nextStatusMap: Record<Task['status'], Task['status']> = {
                    'Todo': 'In Progress',
                    'In Progress': 'Completed',
                    'Completed': 'Todo'
                  };
                  onStatusChange(task, nextStatusMap[task.status]);
                }}
              >
                <h4 className="text-sm font-bold text-slate-900 mb-1">{task.title}</h4>
                {task.projects?.name && (
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight mb-3">
                    {task.projects.name}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-3">
                  {task.assigned_to && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="w-2.5 h-2.5 text-indigo-600" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {task.assigned_to}
                      </span>
                    </div>
                  )}
                  {task.deadline && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        new Date(task.deadline) < new Date() && task.status !== 'Completed' 
                          ? "text-red-500" 
                          : "text-slate-400"
                      )}>
                        {formatDate(task.deadline)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {tasks.filter(t => t.status === column.status).length === 0 && (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Empty</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

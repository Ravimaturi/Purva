import React, { useState } from 'react';
import { Task } from '../types';
import { cn } from '../lib/utils';
import { Calendar, User, CheckCircle2, Circle, Clock } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskWithProject extends Task {
  projects?: {
    name: string;
  };
}

interface KanbanBoardProps {
  tasks: TaskWithProject[];
  onStatusChange: (task: TaskWithProject, newStatus: Task['status']) => void;
  onTaskClick?: (task: TaskWithProject) => void;
}

interface SortableTaskCardProps {
  task: TaskWithProject;
  onClick?: (task: TaskWithProject) => void;
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing"
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
              {isValid(parseISO(task.deadline)) ? format(parseISO(task.deadline), 'MMM d') : 'N/A'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onStatusChange, onTaskClick }) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns: { title: string; status: Task['status']; icon: any; color: string }[] = [
    { title: 'To Do', status: 'Todo', icon: Circle, color: 'bg-slate-100 text-slate-600' },
    { title: 'In Progress', status: 'In Progress', icon: Clock, color: 'bg-indigo-50 text-indigo-600' },
    { title: 'Completed', status: 'Completed', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' }
  ];

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    let newStatus: Task['status'] = activeTask.status;

    if (['Todo', 'In Progress', 'Completed'].includes(overId as string)) {
      newStatus = overId as Task['status'];
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (activeTask.status !== newStatus) {
      onStatusChange(activeTask, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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

            <SortableContext
              id={column.status}
              items={tasks.filter(t => t.status === column.status).map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 bg-slate-50/50 rounded-2xl p-3 space-y-3 border border-slate-100">
                {tasks.filter(t => t.status === column.status).map((task) => (
                  <SortableTaskCard key={task.id} task={task} onClick={onTaskClick} />
                ))}
                {tasks.filter(t => t.status === column.status).length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Drop here</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="bg-white p-4 rounded-xl shadow-xl border-2 border-indigo-500 scale-105 rotate-2">
            <h4 className="text-sm font-bold text-slate-900">
              {tasks.find(t => t.id === activeId)?.title}
            </h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

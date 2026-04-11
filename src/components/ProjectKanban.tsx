import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Project, ProjectStatus } from '../types';
import { PROJECT_STAGES, STAGE_LABELS } from '../constants';
import { cn } from '../lib/utils';
import { 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';
import { useUser } from '../contexts/UserContext';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

const SortableProjectCard: React.FC<SortableProjectCardProps> = ({ project, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.id });

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
      onClick={() => onClick(project)}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing"
    >
      <h4 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{project.name}</h4>
      <p className="text-[10px] font-medium text-slate-500 line-clamp-2 mb-3 leading-relaxed">
        {project.description || 'No description provided.'}
      </p>
      
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="w-3 h-3 text-slate-500" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[80px]">
            {project.assigned_to}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {project.deadline ? format(parseISO(project.deadline), 'MMM d') : 'N/A'}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Progress</span>
          <span className="text-[9px] font-black text-indigo-600 tracking-tighter">{project.progress}%</span>
        </div>
        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-600 h-full transition-all duration-500" 
            style={{ width: `${project.progress}%` }} 
          />
        </div>
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  stage: ProjectStatus;
  projects: Project[];
  onProjectClick: (p: Project) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, projects, onProjectClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const stageProjects = projects.filter(p => p.status === stage);

  return (
    <div className="flex flex-col gap-4 min-w-[300px] w-[300px]">
      <div className={cn(
        "flex items-center justify-between p-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-colors",
        isOver ? "bg-indigo-100 border-indigo-300 text-indigo-800" :
        STAGE_LABELS[stage] === 'Handover' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        STAGE_LABELS[stage] === 'In Progress' ? "bg-amber-50 text-amber-700 border-amber-100" :
        STAGE_LABELS[stage] === 'On Hold' ? "bg-red-50 text-red-700 border-red-100" :
        STAGE_LABELS[stage] === 'Design & Prep' ? "bg-blue-50 text-blue-700 border-blue-100" :
        "bg-slate-50 text-slate-600 border-slate-100"
      )}>
        <div className="flex items-center gap-2">
          {STAGE_LABELS[stage] === 'Handover' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
           STAGE_LABELS[stage] === 'In Progress' ? <Clock className="w-3.5 h-3.5" /> : 
           STAGE_LABELS[stage] === 'On Hold' ? <AlertCircle className="w-3.5 h-3.5" /> :
           <AlertCircle className="w-3.5 h-3.5" />}
          {STAGE_LABELS[stage]}
        </div>
        <span className="bg-white/50 px-2 py-0.5 rounded-full">
          {stageProjects.length}
        </span>
      </div>

      <SortableContext
        id={stage}
        items={stageProjects.map(p => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div 
          ref={setNodeRef}
          className={cn(
            "flex-1 bg-slate-50/50 rounded-2xl p-3 space-y-3 border transition-colors min-h-[500px]",
            isOver ? "bg-indigo-50/50 border-indigo-200" : "border-slate-100"
          )}
        >
          {stageProjects.map((project) => (
            <SortableProjectCard 
              key={project.id} 
              project={project} 
              onClick={onProjectClick}
            />
          ))}
          {stageProjects.length === 0 && (
            <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Drop here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export const ProjectKanban: React.FC<{ onProjectClick: (p: Project) => void }> = ({ onProjectClick }) => {
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<ProjectStatus | null>(null);

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

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    const project = projects.find(p => p.id === active.id);
    if (project) {
      setOriginalStatus(project.status);
    }
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Check if dragging over a column or another card
    const isOverAColumn = PROJECT_STAGES.includes(overId as any);
    let newStatus: ProjectStatus | null = null;
    
    if (isOverAColumn) {
      newStatus = overId as ProjectStatus;
    } else {
      const overProject = projects.find(p => p.id === overId);
      if (overProject) {
        newStatus = overProject.status;
      }
    }

    if (newStatus) {
      const activeProject = projects.find(p => p.id === activeId);
      if (activeProject && activeProject.status !== newStatus) {
        setProjects(prev => prev.map(p => 
          p.id === activeId ? { ...p, status: newStatus } : p
        ));
      }
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) {
      setOriginalStatus(null);
      return;
    }

    const activeId = active.id;
    const activeProject = projects.find(p => p.id === activeId);
    
    if (activeProject && originalStatus && activeProject.status !== originalStatus) {
      const newStatus = activeProject.status;
      try {
        const { error } = await supabase
          .from('projects')
          .update({ 
            status: newStatus,
            last_updated: new Date().toISOString()
          })
          .eq('id', activeId);

        if (error) throw error;
        toast.success(`Project moved to ${STAGE_LABELS[newStatus]}`);
      } catch (err) {
        toast.error('Failed to update project status');
        fetchProjects(); // Revert on error
      }
    }
    
    setOriginalStatus(null);
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
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Project Status Kanban</h2>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Drag projects between stages to update status
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px]">
          {PROJECT_STAGES.map((stage) => (
            <KanbanColumn 
              key={stage} 
              stage={stage} 
              projects={projects} 
              onProjectClick={onProjectClick} 
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-white p-4 rounded-xl shadow-xl border-2 border-indigo-500 scale-105 rotate-2">
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                {projects.find(p => p.id === activeId)?.name}
              </h4>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full" 
                  style={{ width: `${projects.find(p => p.id === activeId)?.progress}%` }} 
                />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

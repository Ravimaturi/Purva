import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  Paperclip,
  User as UserIcon,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { supabase } from '../lib/supabase';
import { Project, ProjectStatus } from '../types';
import { PROJECT_STAGES } from '../constants';
import { toast } from 'sonner';
import { ProjectDetails } from './ProjectDetails';
import { NewProjectDialog } from './NewProjectDialog';
import { Sheet, SheetContent } from './ui/sheet';

export const KanbanBoard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

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

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as ProjectStatus;
    const isCompleting = newStatus === 'Completed';
    const projectToUpdate = projects.find(p => p.id === draggableId);

    if (!projectToUpdate) return;

    // Optimistic update
    const updatedProjects = projects.map(p => 
      p.id === draggableId ? { 
        ...p, 
        status: newStatus,
        completed_at: isCompleting ? new Date().toISOString() : p.completed_at 
      } : p
    );
    setProjects(updatedProjects);

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: newStatus, 
          last_updated: new Date().toISOString(),
          completed_at: isCompleting ? new Date().toISOString() : projectToUpdate.completed_at
        })
        .eq('id', draggableId);

      if (error) throw error;
      toast.success(`Project moved to ${newStatus}`);
      
      // Log change (audit log)
      await supabase.from('audit_logs').insert({
        project_id: draggableId,
        action: 'Status Change',
        details: `Moved from ${source.droppableId} to ${newStatus}`,
        created_at: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error updating project status:', err);
      toast.error('Failed to update status');
      fetchProjects(); // Revert on error
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProjectsByStatus = (status: ProjectStatus) => {
    return filteredProjects.filter(p => p.status === status);
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 bg-white border-slate-200 rounded-xl w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-xl border-slate-200 bg-white">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
        <Button 
          onClick={() => setIsNewDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full min-w-max">
            {PROJECT_STAGES.map((stage) => (
              <div key={stage} className="w-80 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{stage}</h3>
                    <Badge variant="secondary" className="bg-slate-200 text-slate-700 rounded-full px-2 py-0">
                      {getProjectsByStatus(stage).length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex-1 rounded-2xl p-2 transition-colors duration-200 min-h-[500px]",
                        snapshot.isDraggingOver ? "bg-indigo-50/50 border-2 border-dashed border-indigo-200" : "bg-slate-100/50"
                      )}
                    >
                      {getProjectsByStatus(stage).map((project, index) => (
                        // @ts-ignore
                        <Draggable key={project.id} draggableId={project.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-3"
                              onClick={() => {
                                setSelectedProject(project);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Card className={cn(
                                "border-none shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group",
                                snapshot.isDragging ? "shadow-xl ring-2 ring-indigo-500" : ""
                              )}>
                                <CardContent className="p-4 space-y-4">
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{project.name}</h4>
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter border-slate-200">
                                      {project.client_name}
                                    </Badge>
                                  </div>
                                  
                                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {project.description || 'No description provided.'}
                                  </p>

                                  <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                                    <div className="flex -space-x-2">
                                      <Avatar className="h-6 w-6 border-2 border-white">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${project.assigned_to}`} />
                                        <AvatarFallback><UserIcon className="w-3 h-3" /></AvatarFallback>
                                      </Avatar>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400">
                                      <div className="flex items-center gap-1 text-[10px] font-medium">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>3</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] font-medium">
                                        <Paperclip className="w-3 h-3" />
                                        <span>2</span>
                                      </div>
                                    </div>
                                  </div>

                                  {project.deadline && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                      <CalendarIcon className="w-3 h-3" />
                                      <span>{new Date(project.deadline).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      <NewProjectDialog 
        open={isNewDialogOpen} 
        onOpenChange={setIsNewDialogOpen} 
        onSuccess={fetchProjects} 
      />

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-[85vw] w-full p-0 border-l-slate-200 shadow-2xl">
          {selectedProject && (
            <ProjectDetails 
              project={selectedProject} 
              onClose={() => setIsDetailsOpen(false)} 
              onUpdate={fetchProjects}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Helper for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

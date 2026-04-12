import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Search, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Project } from '../types';
import { PROJECT_STAGES, STAGE_LABELS } from '../constants';
import { ProjectDetails } from './ProjectDetails';
import { NewProjectDialog } from './NewProjectDialog';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { Sheet, SheetContent } from './ui/sheet';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { getInitials, cn } from '../lib/utils';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'MMM d, yyyy') : 'N/A';
  } catch {
    return 'N/A';
  }
};

interface ProjectListProps {
  employeeView?: boolean;
  onProjectClick?: (project: Project, tab?: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ employeeView, onProjectClick }) => {
  const { user } = useUser();
  const { addNotification } = useNotifications();
  const { t, translateData } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Delete confirmation state
  const [projectIdToDelete, setProjectIdToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof Project>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Column filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [assignedFilter, setAssignedFilter] = useState<string>('All');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      let finalProjects = data || [];
      
      if (employeeView && user) {
        const { data: userTasks } = await supabase
          .from('tasks')
          .select('project_id')
          .eq('assigned_to', user.full_name);
          
        const projectIdsWithTasks = new Set(userTasks?.map(t => t.project_id) || []);
        
        finalProjects = finalProjects.filter(p => 
          p.assigned_to === user.full_name || projectIdsWithTasks.has(p.id)
        );
      }
      
      setProjects(finalProjects);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      toast.error(`Failed to load projects: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectIdToDelete) return;

    try {
      const projectToDelete = projects.find(p => p.id === projectIdToDelete);
      const { error } = await supabase.from('projects').delete().eq('id', projectIdToDelete);
      if (error) throw error;

      if (projectToDelete) {
        await addNotification('Project Deleted', `Project "${projectToDelete.name}" has been deleted.`);
      }

      toast.success('Project deleted');
      fetchProjects();
    } catch (err) {
      toast.error('Failed to delete project');
    } finally {
      setProjectIdToDelete(null);
    }
  };

  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedProjects = projects
    .filter(p => {
      const matchesSearch = (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (p.client_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (p.assigned_to?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchesAssigned = assignedFilter === 'All' || p.assigned_to === assignedFilter;
      
      return matchesSearch && matchesStatus && matchesAssigned;
    })
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      
      return 0;
    });

  const uniqueStatuses = ['All', ...Array.from(new Set(projects.map(p => p.status)))];
  const uniqueAssignees = ['All', ...Array.from(new Set(projects.map(p => p.assigned_to).filter(Boolean)))];

  const SortIcon = ({ field }: { field: keyof Project }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-3 h-3 ml-1 text-indigo-600" /> 
      : <ChevronDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <Input 
              placeholder={t('search_projects')} 
              className="pl-10 bg-white border-slate-200 rounded-2xl h-11 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {!employeeView && (
          <Button 
            onClick={() => setIsNewDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-100 h-11 px-6 font-bold text-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('add_project')}
          </Button>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 animate-pulse space-y-4">
              <div className="h-6 bg-slate-100 rounded-lg w-3/4" />
              <div className="h-4 bg-slate-50 rounded-lg w-1/2" />
              <div className="h-2 bg-slate-100 rounded-full w-full" />
            </div>
          ))
        ) : filteredAndSortedProjects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No projects found</p>
          </div>
        ) : (
          filteredAndSortedProjects.map((project) => (
            <Card 
              key={project.id} 
              onClick={() => {
                if (onProjectClick) {
                  onProjectClick(project);
                } else {
                  setSelectedProject(project);
                  setIsDetailsOpen(true);
                }
              }}
              className="border-none shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer overflow-hidden rounded-3xl"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-slate-900 tracking-tight truncate">{translateData(project.name)}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{translateData(project.client_name)}</p>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-tighter shrink-0">
                    {translateData(STAGE_LABELS[project.status])}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-indigo-600 text-white font-bold text-[8px]">
                        {getInitials(project.assigned_to || 'Unassigned')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate max-w-[100px]">
                      {project.assigned_to ? translateData(project.assigned_to) : 'Unassigned'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: `${project.progress}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-900">{project.progress}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead 
                  className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    {t('project_name')} <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap hidden md:table-cell cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => handleSort('client_name')}
                >
                  <div className="flex items-center">
                    {t('client_name')} <SortIcon field="client_name" />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {t('status')}
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        render={
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md hover:bg-slate-200">
                            <Filter className={cn("w-3 h-3", statusFilter !== 'All' ? "text-indigo-600" : "text-slate-400")} />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="rounded-xl">
                        {uniqueStatuses.map(status => (
                          <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                            <span className={cn(statusFilter === status && "font-bold text-indigo-600")}>
                              {status === 'All' ? t('all_projects') : translateData(STAGE_LABELS[status as any] || status)}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
                <TableHead className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    {t('assigned_to')}
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        render={
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md hover:bg-slate-200">
                            <Filter className={cn("w-3 h-3", assignedFilter !== 'All' ? "text-indigo-600" : "text-slate-400")} />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="rounded-xl">
                        {uniqueAssignees.map(assignee => (
                          <DropdownMenuItem key={assignee} onClick={() => setAssignedFilter(assignee)}>
                            <span className={cn(assignedFilter === assignee && "font-bold text-indigo-600")}>{assignee}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap hidden lg:table-cell cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => handleSort('deadline')}
                >
                  <div className="flex items-center">
                    {t('deadline')} <SortIcon field="deadline" />
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => handleSort('progress')}
                >
                  <div className="flex items-center">
                    {t('progress')} <SortIcon field="progress" />
                  </div>
                </TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs font-bold uppercase tracking-widest">Loading projects...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Search className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">No projects found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedProjects.map((project) => (
                  <TableRow 
                    key={project.id} 
                    className="hover:bg-indigo-50/30 border-slate-50 group cursor-pointer transition-colors"
                    onClick={() => {
                      if (onProjectClick) {
                        onProjectClick(project);
                      } else {
                        setSelectedProject(project);
                        setIsDetailsOpen(true);
                      }
                    }}
                  >
                    <TableCell className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {project.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{translateData(project.name)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap hidden md:table-cell">{translateData(project.client_name)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">
                        {translateData(STAGE_LABELS[project.status])}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Avatar className="h-7 w-7 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-indigo-600 text-white font-bold text-[9px]">
                            {getInitials(project.assigned_to || 'Unassigned')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          {project.assigned_to ? translateData(project.assigned_to) : 'Unassigned'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap hidden lg:table-cell">
                      {STAGE_LABELS[project.status] === 'Handover' 
                        ? formatDate(project.completed_at || project.deadline) 
                        : formatDate(project.deadline)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4 whitespace-nowrap">
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-900 tracking-tighter">{project.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger 
                          className="rounded-xl h-9 w-9 text-slate-400 hover:bg-white hover:shadow-sm flex items-center justify-center transition-all outline-none border border-transparent hover:border-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 shadow-xl p-1.5 min-w-[160px]">
                          <DropdownMenuItem 
                            className="rounded-xl py-2 font-bold text-xs uppercase tracking-widest"
                            onClick={() => {
                              if (onProjectClick) {
                                onProjectClick(project);
                              } else {
                                setSelectedProject(project);
                                setIsDetailsOpen(true);
                              }
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2 text-indigo-600" /> View Details
                          </DropdownMenuItem>
                          {!employeeView && (
                            <DropdownMenuItem 
                              className="rounded-xl py-2 font-bold text-xs uppercase tracking-widest text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => {
                                setProjectIdToDelete(project.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Project
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NewProjectDialog 
        open={isNewDialogOpen} 
        onOpenChange={setIsNewDialogOpen} 
        onSuccess={fetchProjects} 
      />

      <Sheet open={isDetailsOpen} onOpenChange={(open) => {
        setIsDetailsOpen(open);
        if (!open) setIsMaximized(false);
      }}>
        <SheetContent className={cn(
          "w-full p-0 border-l-slate-200 shadow-2xl transition-all duration-500 ease-in-out",
          isMaximized ? "sm:max-w-[100vw]" : "sm:max-w-[85vw]"
        )}>
          {selectedProject && (
            <ProjectDetails 
              project={selectedProject} 
              onClose={() => setIsDetailsOpen(false)} 
              onUpdate={fetchProjects}
              isMaximized={isMaximized}
              onToggleMaximize={() => setIsMaximized(!isMaximized)}
            />
          )}
        </SheetContent>
      </Sheet>
      <ConfirmDialog 
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone and all associated data will be removed."
      />
    </div>
  );
};

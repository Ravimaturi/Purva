import { useState } from 'react';
import { UserProvider } from './contexts/UserContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { GlobalKanban } from './components/GlobalKanban';
import { ProjectKanban } from './components/ProjectKanban';
import { GlobalCalendar } from './components/GlobalCalendar';
import { ProjectList } from './components/ProjectList';
import { TeamManagement } from './components/TeamManagement';
import { Profile } from './components/Profile';
import { VendorManagement } from './components/VendorManagement';
import { Toaster } from './components/ui/sonner';
import { Sheet, SheetContent } from './components/ui/sheet';
import { ProjectDetails } from './components/ProjectDetails';
import { Project } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [projectDetailsTab, setProjectDetailsTab] = useState('activity');

  const handleProjectClick = (project: Project, tab?: string) => {
    setSelectedProject(project);
    setProjectDetailsTab(tab || 'activity');
    setIsDetailsOpen(true);
    setIsMaximized(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <ProjectList onProjectClick={handleProjectClick} />;
      case 'my-projects':
        return <ProjectList employeeView={true} onProjectClick={handleProjectClick} />;
      case 'project-kanban':
        return <ProjectKanban onProjectClick={handleProjectClick} />;
      case 'kanban':
        return <GlobalKanban onProjectClick={handleProjectClick} />;
      case 'calendar':
        return <GlobalCalendar onProjectClick={handleProjectClick} />;
      case 'team':
        return <TeamManagement />;
      case 'vendors':
        return <VendorManagement onProjectClick={handleProjectClick} />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <LanguageProvider>
      <UserProvider>
        <NotificationProvider>
          <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
            {renderContent()}
          </Layout>
          
          <Sheet open={isDetailsOpen} onOpenChange={(open) => {
            setIsDetailsOpen(open);
            if (!open) setIsMaximized(false);
          }}>
            <SheetContent 
              side="right"
              className={cn(
                "p-0 border-l-slate-200 shadow-2xl transition-all duration-500 ease-in-out !max-w-none",
                isMaximized ? "!w-full !inset-0 !h-full" : "w-full sm:max-w-[85vw]"
              )}
            >
              {selectedProject && (
                <ProjectDetails 
                  project={selectedProject} 
                  onClose={() => setIsDetailsOpen(false)} 
                  isMaximized={isMaximized}
                  onToggleMaximize={() => setIsMaximized(!isMaximized)}
                  initialTab={projectDetailsTab}
                  onUpdate={() => {
                    // Refresh data if needed
                  }}
                />
              )}
            </SheetContent>
          </Sheet>

          <Toaster position="top-right" />
        </NotificationProvider>
      </UserProvider>
    </LanguageProvider>
  );
}

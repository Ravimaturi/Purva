import { useState } from 'react';
import { UserProvider } from './contexts/UserContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { GlobalKanban } from './components/GlobalKanban';
import { GlobalCalendar } from './components/GlobalCalendar';
import { ProjectList } from './components/ProjectList';
import { TeamManagement } from './components/TeamManagement';
import { Profile } from './components/Profile';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <ProjectList />;
      case 'kanban':
        return <GlobalKanban />;
      case 'calendar':
        return <GlobalCalendar />;
      case 'team':
        return <TeamManagement />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <UserProvider>
      <NotificationProvider>
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
          {renderContent()}
        </Layout>
        <Toaster position="top-right" />
      </NotificationProvider>
    </UserProvider>
  );
}

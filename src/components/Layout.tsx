import React from 'react';
import { 
  LayoutDashboard, 
  Trello, 
  Calendar as CalendarIcon, 
  LogOut, 
  User,
  Settings,
  Bell,
  ListTodo,
  Users as UsersIcon,
  Menu,
  X as CloseIcon,
  MoreVertical,
  Building2
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { cn, getInitials } from '../lib/utils';
import { toast } from 'sonner';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import { format } from 'date-fns';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, setUser, allUsers } = useUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { language, setLanguage, t, translateData } = useLanguage();
  const [showHistory, setShowHistory] = React.useState(false);

  React.useEffect(() => {
    if (user?.role === 'employee' && activeTab === 'dashboard') {
      setActiveTab('my-projects');
    }
  }, [user?.role, activeTab, setActiveTab]);

  const navItems = user?.role === 'admin' ? [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'projects', label: t('projects'), icon: ListTodo },
    { id: 'project-kanban', label: t('project_status'), icon: Trello },
    { id: 'kanban', label: t('kanban'), icon: Trello },
    { id: 'calendar', label: t('calendar'), icon: CalendarIcon },
    { id: 'vendors', label: 'Vendors', icon: Building2 },
    { id: 'team', label: t('team'), icon: UsersIcon }
  ] : [
    { id: 'my-projects', label: 'My Projects', icon: ListTodo },
    { id: 'kanban', label: t('kanban'), icon: Trello },
    { id: 'calendar', label: t('calendar'), icon: CalendarIcon },
  ];

  const UserMenuContent = () => (
    <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg border-slate-200 p-2">
      <div className="px-2 py-2 mb-1">
        <p className="text-sm font-bold text-slate-900">{user?.full_name}</p>
        <div className="flex flex-col mt-1">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{translateData(user?.designation || 'N/A')}</p>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{user?.role.toUpperCase()}</p>
        </div>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setActiveTab('profile')}>
        <User className="mr-2 h-4 w-4" />
        <span>My Profile</span>
      </DropdownMenuItem>
      {user?.role === 'admin' && (
        <DropdownMenuItem onClick={() => setActiveTab('team')}>
          <UsersIcon className="mr-2 h-4 w-4" />
          <span>Team Management</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-red-600" onClick={async () => {
        await supabase.auth.signOut();
        setUser(null);
        window.location.reload();
      }}>
        <LogOut className="mr-2 h-4 w-4" />
        <span>Log out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            P
          </div>
          Purva Vedic
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">Project Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
              activeTab === item.id 
                ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-indigo-600" : "text-slate-400")} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <Sheet>
              <SheetTrigger 
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden rounded-xl">
                    <Menu className="h-5 w-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            <h2 className="text-lg font-semibold text-slate-800 capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
              <Button 
                variant={language === 'en' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setLanguage('en')}
                className={cn("h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider", language === 'en' && "bg-white shadow-sm")}
              >
                EN
              </Button>
              <Button 
                variant={language === 'te' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setLanguage('te')}
                className={cn("h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider", language === 'te' && "bg-white shadow-sm")}
              >
                తెలుగు
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger 
                render={
                  <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hidden sm:flex relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    )}
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-80 rounded-xl shadow-lg border-slate-200 p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowHistory(true)}
                      className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-700"
                    >
                      History
                    </button>
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => markAllAsRead()}
                        className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:text-indigo-700"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={cn(
                            "p-4 hover:bg-slate-50 transition-colors cursor-pointer relative",
                            !n.read && "bg-indigo-50/30"
                          )}
                          onClick={() => markAsRead(n.id)}
                        >
                          {!n.read && (
                            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-full" />
                          )}
                          <p className="text-sm font-bold text-slate-900">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-medium">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">No notifications</p>
                      <p className="text-xs text-slate-500 mt-1">We'll notify you when something happens.</p>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>



            {/* Profile Button in Header */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-100">
              <DropdownMenu>
                <DropdownMenuTrigger 
                  render={
                    <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-10 rounded-xl hover:bg-slate-50 transition-all">
                      <Avatar className="h-8 w-8 border border-slate-200">
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-[10px]">{getInitials(user?.full_name || '')}</AvatarFallback>
                      </Avatar>
                      <div className="hidden md:flex flex-col items-start text-left">
                        <p className="text-xs font-bold text-slate-900 leading-none">{user?.full_name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{user?.role}</p>
                      </div>
                    </Button>
                  }
                />
                <UserMenuContent />
              </DropdownMenu>
            </div>
            
            {/* Mobile User Avatar */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger 
                  render={
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8 border border-slate-200">
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-[10px]">{getInitials(user?.full_name || '')}</AvatarFallback>
                      </Avatar>
                    </Button>
                  }
                />
                <UserMenuContent />
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Notification History Dialog */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 overflow-hidden rounded-3xl">
            <DialogHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <DialogTitle className="text-xl font-bold text-slate-900">Notification History</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6">
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(new Date(n.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">No history</p>
                  <p className="text-sm text-slate-500 mt-1">You don't have any notifications yet.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Content Area */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

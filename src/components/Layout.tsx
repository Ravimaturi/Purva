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
  MoreVertical
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
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

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, setUser, allUsers } = useUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects List', icon: ListTodo },
    { id: 'kanban', label: 'Kanban Board', icon: Trello },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  ];

  // Only show Team tab to admins
  if (user?.role === 'admin') {
    navItems.push({ id: 'team', label: 'Team Management', icon: UsersIcon });
  }

  const UserMenuContent = () => (
    <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg border-slate-200 p-2">
      <div className="px-2 py-2 mb-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current User</p>
        <p className="text-sm font-bold text-slate-900 mt-1">{user?.full_name}</p>
        <p className="text-[10px] text-slate-500">{user?.email}</p>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setActiveTab('profile')}>
        <User className="mr-2 h-4 w-4" />
        <span>My Profile</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setActiveTab('team')}>
        <UsersIcon className="mr-2 h-4 w-4" />
        <span>Team Management</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Switch Account (Demo)</DropdownMenuLabel>
      <div className="max-h-60 overflow-y-auto px-1">
        {allUsers.map((u) => (
          <DropdownMenuItem 
            key={u.id} 
            onClick={() => {
              setUser(u as any);
              toast.success(`Switched to ${u.full_name}`);
            }}
            className={cn(
              "flex flex-col items-start gap-0.5 py-2 px-2 rounded-lg mb-1",
              user?.id === u.id ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50"
            )}
          >
            <span className="font-bold text-xs">{u.full_name}</span>
            <span className="text-[10px] opacity-70">{u.role}</span>
          </DropdownMenuItem>
        ))}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-red-600" onClick={() => {
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
        <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">Project Manager</p>
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

      <div className="p-4 border-t border-slate-100 flex items-center gap-2">
        <button 
          onClick={() => setActiveTab('profile')}
          className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 transition-all text-left outline-none border border-transparent hover:border-slate-200 group"
        >
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm group-hover:shadow-md transition-shadow">
            <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">{getInitials(user?.full_name || '')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-slate-900 truncate">{user?.full_name}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{user?.role}</p>
          </div>
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger 
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600">
                <MoreVertical className="w-4 h-4" />
              </Button>
            }
          />
          <UserMenuContent />
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
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
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead()}
                      className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:text-indigo-700"
                    >
                      Mark all as read
                    </button>
                  )}
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

            <DropdownMenu>
              <DropdownMenuTrigger 
                render={
                  <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hidden sm:flex">
                    <Settings className="h-5 w-5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg border-slate-200 p-2">
                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Account Settings</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Switch Account (Demo)</DropdownMenuLabel>
                <div className="max-h-60 overflow-y-auto px-1">
                  {allUsers.map((u) => (
                    <DropdownMenuItem 
                      key={u.id} 
                      onClick={() => {
                        setUser(u as any);
                        toast.success(`Switched to ${u.full_name}`);
                      }}
                      className={cn(
                        "flex flex-col items-start gap-0.5 py-2 px-2 rounded-lg mb-1",
                        user?.id === u.id ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50"
                      )}
                    >
                      <span className="font-bold text-xs">{u.full_name}</span>
                      <span className="text-[10px] opacity-70">{u.role}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => {
                  setUser(null);
                  window.location.reload();
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

import React from 'react';
import { useUser } from '../contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Mail, Shield, User as UserIcon, Calendar, LogOut } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <UserIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Please select a user to view profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500">Manage your personal information and account settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 border-none shadow-sm">
          <CardContent className="pt-8 flex flex-col items-center text-center">
            <Avatar className="h-32 w-32 border-4 border-white shadow-lg mb-4">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.full_name}`} />
              <AvatarFallback className="text-2xl">{user.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold text-slate-900">{user.full_name}</h2>
            <Badge className="mt-2 bg-indigo-50 text-indigo-700 border-indigo-100 uppercase tracking-wider text-[10px] font-bold">
              {user.role}
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Full Name
                </p>
                <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Address
                </p>
                <p className="text-sm font-medium text-slate-900">{user.email || 'Not provided'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Role
                </p>
                <p className="text-sm font-medium text-slate-900 capitalize">{user.role}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Member Since
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'April 2026'}
                </p>
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100">
              <button 
                className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
                onClick={() => window.location.reload()} // Demo logout
              >
                <LogOut className="w-4 h-4" />
                Log out of account
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

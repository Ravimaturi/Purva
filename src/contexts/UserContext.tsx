import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '../types';
import { USERS } from '../constants';
import { supabase } from '../lib/supabase';

interface UserContextType {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  allUsers: Profile[];
  refreshUsers: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(() => {
    const saved = localStorage.getItem('purva_vedic_user');
    return saved ? JSON.parse(saved) : USERS[0];
  });
  const [allUsers, setAllUsers] = useState<Profile[]>(USERS as any);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      if (data && data.length > 0) {
        setAllUsers(data);
        // Sync current user if they exist in the new data
        if (user) {
          const updatedUser = data.find(u => u.id === user.id);
          if (updatedUser) {
            // Check if any field has changed to avoid unnecessary re-renders
            const hasChanged = JSON.stringify(updatedUser) !== JSON.stringify(user);
            if (hasChanged) {
              setUser(updatedUser);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching profiles in context:', err);
    }
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('purva_vedic_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('purva_vedic_user');
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser, allUsers, refreshUsers: fetchProfiles }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

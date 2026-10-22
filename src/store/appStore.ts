import { create } from 'zustand';
import { User } from '../db/database';
import { authService } from '../services/authService';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  needsSetup: boolean;
  
  // UI
  darkMode: boolean;
  sidebarOpen: boolean;
  currentPage: string;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (val: boolean) => void;
  setNeedsSetup: (val: boolean) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  needsSetup: false,
  darkMode: localStorage.getItem('darkMode') === 'true',
  sidebarOpen: true,
  currentPage: 'dashboard',

  setUser: (user) => set({ user }),
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setNeedsSetup: (val) => set({ needsSetup: val }),
  
  toggleDarkMode: () => {
    const newMode = !get().darkMode;
    localStorage.setItem('darkMode', String(newMode));
    set({ darkMode: newMode });
    document.documentElement.classList.toggle('dark', newMode);
  },
  
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setCurrentPage: (page) => set({ currentPage: page }),
  
  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false, currentPage: 'dashboard' });
  },
}));

// Initialize dark mode on load
if (typeof window !== 'undefined') {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.documentElement.classList.add('dark');
  }
}

import { create } from 'zustand';

interface AuthState {
  token: string | null;
  address: string | null;
  setAuth: (token: string, address: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  address: null,
  setAuth: (token, address) => set({ token, address }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("auth_token");
    }
    set({ token: null, address: null });
  },
}));

'use client';

import { create } from 'zustand';
import type { AppUser, UserRole, Permission } from '@/types';
import { getDefaultPermissions, hasPermission as checkPermission, hasAnyPermission as checkAnyPermission } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/client';

function save(user: AppUser | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    sessionStorage.setItem('auth_authenticated', 'true');
  } else {
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_authenticated');
  }
}

function load(): { user: AppUser | null; isAuthenticated: boolean } {
  if (typeof window === 'undefined') return { user: null, isAuthenticated: false };
  try {
    const raw = sessionStorage.getItem('auth_user');
    const flag = sessionStorage.getItem('auth_authenticated');
    if (raw && flag === 'true') return { user: JSON.parse(raw), isAuthenticated: true };
  } catch {}
  return { user: null, isAuthenticated: false };
}

const supabase = createClient();

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  initFromSession: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (partial: Partial<AppUser>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  convertToRealAccount: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (perm: Permission) => boolean;
  hasAnyPermission: (perms: Permission[]) => boolean;
  isRole: (role: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  ...load(),

  initFromSession: () => {
    const s = load();
    set({ user: s.user, isAuthenticated: s.isAuthenticated });
  },

  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      let role: UserRole = 'customer';
      let name = email.split('@')[0];
      let nameAr = email.split('@')[0];
      try {
        const { data: userData } = await supabase.from('users').select('*').eq('email', email).single();
        if (userData) {
          role = (userData.role as UserRole) || 'customer';
          name = userData.full_name_en || name;
          nameAr = userData.full_name_ar || nameAr;
        }
      } catch {}
      const user: AppUser = {
        id: data.user?.id || email, email, name, nameAr, phone: '',
        role, branchIds: ['default'], defaultBranchId: 'default',
        permissions: getDefaultPermissions(role), authMethod: 'email', status: 'active',
        createdAt: Date.now(), updatedAt: Date.now(),
      };
      save(user);
      set({ user, isAuthenticated: true });
      return { success: true };
    } catch (err: any) {
      const m = err.message || '';
      if (m.includes('Email not confirmed') || m.includes('email_not_confirmed'))
        return { success: false, error: 'البريد الإلكتروني غير مؤكد' };
      if (m.includes('Invalid login credentials'))
        return { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
      return { success: false, error: 'فشل تسجيل الدخول: ' + m.substring(0, 80) };
    }
  },

  logout: () => {
    supabase.auth.signOut().catch(() => {});
    save(null);
    set({ user: null, isAuthenticated: false });
  },

  updateProfile: async (partial) => {
    try {
      const currentUser = get().user;
      if (!currentUser) return { success: false, error: 'غير مسجل الدخول' };

      // Update Supabase Auth if email changed
      if (partial.email && partial.email !== currentUser.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: partial.email });
        if (emailError) return { success: false, error: emailError.message };
      }

      // Update users table
      const updates: Record<string, any> = {};
      if (partial.name) updates.full_name_en = partial.name;
      if (partial.nameAr) updates.full_name_ar = partial.nameAr;
      if (partial.phone) updates.phone = partial.phone;
      if (partial.avatar) updates.avatar_url = partial.avatar;
      if (partial.address) updates.address = partial.address;

      if (Object.keys(updates).length > 0) {
        const { error: dbError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', currentUser.id);

        if (dbError) {
          // Fallback: try by email
          await supabase.from('users').update(updates).eq('email', currentUser.email);
        }
      }

      const updatedUser = { ...currentUser, ...partial, updatedAt: Date.now() };
      save(updatedUser);
      set({ user: updatedUser });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل تحديث الملف الشخصي' };
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const currentUser = get().user;
      if (!currentUser) return { success: false, error: 'غير مسجل الدخول' };

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل تغيير كلمة المرور' };
    }
  },

  convertToRealAccount: async (email, password) => {
    try {
      const currentUser = get().user;
      if (!currentUser) return { success: false, error: 'غير مسجل الدخول' };

      const res = await fetch('/api/auth/convert-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: currentUser.name,
          nameAr: currentUser.nameAr,
          phone: currentUser.phone,
          role: currentUser.role,
          currentEmail: currentUser.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'فشل تفعيل الحساب' };

      // Sign in with new credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) return { success: false, error: signInError.message };

      const newUser: AppUser = {
        ...currentUser,
        id: signInData.user?.id || data.userId,
        email,
        updatedAt: Date.now(),
      };

      save(newUser);
      set({ user: newUser });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل تفعيل الحساب' };
    }
  },

  hasPermission: (perm) => {
    const u = get().user;
    if (!u) return false;
    if (u.role === 'admin') return true;
    return checkPermission(u.permissions, perm);
  },
  hasAnyPermission: (perms) => {
    const u = get().user;
    if (!u) return false;
    if (u.role === 'admin') return true;
    return checkAnyPermission(u.permissions, perms);
  },
  isRole: (role) => {
    const u = get().user;
    if (!u) return false;
    return Array.isArray(role) ? role.includes(u.role) : u.role === role;
  },
}));

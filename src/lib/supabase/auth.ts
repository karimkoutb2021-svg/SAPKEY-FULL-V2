import { createClient } from '@/lib/supabase/client';
import type { ERPUser } from '@/types/erp';

const supabase = createClient();

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, fullNameAr: string, phone?: string, role?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name_ar: fullNameAr,
        phone: phone || null,
        role: role || 'customer'
      }
    }
  });
  
  if (error) throw error;
  
  if (data.user) {
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      full_name_ar: fullNameAr,
      phone: phone || null,
      role: role || 'customer',
      is_active: true,
      password_hash: 'managed_by_supabase_auth'
    });
  }
  
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function getCurrentUser(): Promise<ERPUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('users')
    .select('id, email, full_name_ar, full_name_en, phone, role, avatar_url, is_active, branch_id, created_at')
    .eq('email', user.email)
    .single();
  
  return data as ERPUser | null;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
}

export function onAuthStateChange(callback: (user: ERPUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name_ar, full_name_en, phone, role, avatar_url, is_active, branch_id, created_at')
        .eq('email', session.user.email)
        .single();
      
      callback(data as ERPUser | null);
    } else {
      callback(null);
    }
  });
}

export const logoutUser = async () => {
  await signOut();
};

export const registerUser = async (email: string, password: string, fullNameAr: string, phone?: string, role?: string) => {
  return signUp(email, password, fullNameAr, phone, role);
};

export const resetPasswordUser = async (email: string) => {
  return resetPassword(email);
};
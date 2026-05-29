import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface Employee {
  id: string;
  user_id?: string;
  employee_code: string;
  full_name_ar: string;
  full_name_en?: string;
  phone: string;
  role: string;
  department: string;
  salary: number;
  hire_date: string;
  is_active: boolean;
  created_at: string;
}

export const employeeService = {
  async getAll(activeOnly = false) {
    let query = supabase.from('employees').select('id, employee_code, full_name_ar, full_name_en, phone, role, department, salary, hire_date, is_active, created_at').order('full_name_ar');
    if (activeOnly) query = query.eq('is_active', true);
    return query;
  },

  async getById(id: string) {
    return supabase.from('employees').select('id, employee_code, full_name_ar, full_name_en, phone, role, department, salary, hire_date, is_active, created_at').eq('id', id).single();
  },

  async create(data: {
    employee_code: string;
    full_name_ar: string;
    full_name_en?: string;
    phone: string;
    role: string;
    department: string;
    salary: number;
    hire_date: string;
  }) {
    return supabase.from('employees').insert({ ...data, is_active: true }).select().single();
  },

  async update(id: string, data: Partial<Employee>) {
    return supabase.from('employees').update(data).eq('id', id).select().single();
  },

  async toggleActive(id: string, isActive: boolean) {
    return supabase.from('employees').update({ is_active: isActive }).eq('id', id).select().single();
  },
};

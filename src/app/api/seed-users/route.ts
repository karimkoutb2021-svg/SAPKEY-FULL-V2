import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient<any, any>;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _supabase;
}

const ADMIN_USER = {
  email: 'sapkeyglobal@gmail.com',
  password: '123456',
  name: 'Developer',
  nameAr: 'مطور النظام',
  role: 'admin',
};

let usersTableChecked = false;
let usersTableExists = false;

async function checkUsersTable(): Promise<boolean> {
  if (usersTableChecked) return usersTableExists;
  usersTableChecked = true;
  try {
    const { error } = await getSupabase().from('users').select('id', { count: 'exact', head: true }).limit(1);
    usersTableExists = !error;
  } catch { usersTableExists = false; }
  return usersTableExists;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const users = body.users || [body];
    const results: Record<string, string> = {};
    for (const u of users) {
      try {
        const { data: newUser } = await getSupabase().auth.admin.createUser({
          email: u.email, password: u.password, email_confirm: true,
          user_metadata: { full_name: u.name || u.email, full_name_ar: u.name || u.email, role: u.role || 'customer' },
        });
        const authId = newUser?.user?.id;
        if (authId) {
          await getSupabase().from('users').upsert({
            id: authId, email: u.email, password_hash: 'supabase_auth',
            full_name_ar: u.name || u.email, full_name_en: u.name || u.email,
            phone: u.phone || '', role: u.role || 'customer', is_active: true,
          }, { onConflict: 'email' }).maybeSingle();
        }
        results[u.email] = 'تم الإنشاء';
      } catch (err: any) {
        results[u.email] = `خطأ: ${err.message.substring(0, 60)}`;
      }
    }
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const exists = await checkUsersTable();
  if (!exists) {
    return NextResponse.json({
      success: false, note: 'users table not found',
      advice: 'اضغط على زر بدء التشغيل أو شغل SQL يدوياً'
    });
  }

  const results: Record<string, string> = {};

  // Only seed admin user
  const u = ADMIN_USER;
  try {
    const { data: existing } = await getSupabase().from('users').select('id').eq('email', u.email).maybeSingle();
    if (existing) {
      results[u.email] = 'موجود';
    } else {
      let authId = '';
      const { data: authUsers } = await getSupabase().auth.admin.listUsers();
      const authUser = authUsers?.users?.find((a) => a.email === u.email);
      if (authUser) {
        authId = authUser.id;
        if (!authUser.email_confirmed_at) {
          await getSupabase().auth.admin.updateUserById(authUser.id, { email_confirm: true });
        }
      } else {
        const { data: newUser } = await getSupabase().auth.admin.createUser({
          email: u.email, password: u.password, email_confirm: true,
          user_metadata: { full_name: u.name, full_name_ar: u.nameAr, role: u.role },
        });
        authId = newUser?.user?.id || '';
      }

      if (authId) {
        await getSupabase().from('users').upsert({
          id: authId, email: u.email, password_hash: 'supabase_auth',
          full_name_ar: u.nameAr, full_name_en: u.name,
          phone: '', role: u.role, is_active: true,
        }, { onConflict: 'email' }).maybeSingle();
      }
      results[u.email] = authUser ? 'مؤكد' : 'تم الإنشاء';
    }
  } catch (err: any) {
    results[u.email] = `خطأ: ${err.message.substring(0, 60)}`;
  }

  return NextResponse.json({ success: true, results });
}

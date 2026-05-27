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

export async function POST(req: Request) {
  try {
    const { action, email, password, newEmail, name, phone, role } = await req.json();

    if (action === 'create') {
      // Create new user in Auth + users table
      const { data, error } = await getSupabase().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, full_name_ar: name, role: role || 'customer' },
      });
      if (error) throw error;
      const authId = data?.user?.id;
      if (authId) {
        await getSupabase().from('users').upsert({
          id: authId, email, full_name: name, full_name_ar: name,
          phone: phone || '05xxxxxxxx', role: role || 'customer', is_active: true,
        }, { onConflict: 'email' });
      }
      return NextResponse.json({ success: true, message: `تم إنشاء الحساب ${email}` });
    }

    if (action === 'update_email') {
      // Find user by email
      const { data: users } = await getSupabase().auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email === email);
      if (!user) throw new Error('المستخدم غير موجود');
      await getSupabase().auth.admin.updateUserById(user.id, { email: newEmail });
      await getSupabase().from('users').update({ email: newEmail }).eq('email', email);
      return NextResponse.json({ success: true, message: `تم تغيير البريد إلى ${newEmail}` });
    }

    if (action === 'update_password') {
      const { data: users } = await getSupabase().auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email === email);
      if (!user) throw new Error('المستخدم غير موجود');
      await getSupabase().auth.admin.updateUserById(user.id, { password });
      return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور' });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

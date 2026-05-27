import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, nameAr, phone, role, currentEmail } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'البريد وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'هذا البريد مسجل بالفعل' }, { status: 400 });
    }

    // Create Supabase Auth account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name_en: name || email.split('@')[0],
        full_name_ar: nameAr || name || email.split('@')[0],
        phone: phone || null,
        role: role || 'customer',
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Update or create users table record
    if (currentEmail) {
      // Migrate from old account to new one
      const { data: oldUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', currentEmail)
        .single();

      if (oldUser) {
        await supabase.from('users').update({
          id: authData.user.id,
          email,
          full_name_en: name || oldUser.full_name_en,
          full_name_ar: nameAr || oldUser.full_name_ar,
          phone: phone || oldUser.phone,
          role: role || oldUser.role,
          password_hash: 'managed_by_supabase_auth',
          is_active: true,
        }).eq('email', currentEmail);
      }
    } else {
      await supabase.from('users').insert({
        id: authData.user.id,
        email,
        full_name_en: name || email.split('@')[0],
        full_name_ar: nameAr || name || email.split('@')[0],
        phone: phone || null,
        role: role || 'customer',
        password_hash: 'managed_by_supabase_auth',
        is_active: true,
      });
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: 'تم تفعيل الحساب بنجاح',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل تفعيل الحساب' }, { status: 500 });
  }
}

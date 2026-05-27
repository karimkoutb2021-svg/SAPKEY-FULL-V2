import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient<any, any>;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _supabase;
}

const ROLE_EMAILS: Record<string, string> = {
  manager: 'manager@sapkey.com',
  cashier: 'cashier@sapkey.com',
  customer: 'customer@sapkey.com',
};

const DEFAULT_PASSWORD = '12345678';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = body.role || 'customer';
    const name = body.name || role;
    const nameAr = body.nameAr || name;
    const phone = body.phone || '';

    // Use fixed email based on role, or allow custom email for customer
    let email = ROLE_EMAILS[role] || body.email;
    const password = DEFAULT_PASSWORD;

    if (!email) {
      return NextResponse.json({ error: 'البريد مطلوب' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existing } = await getSupabase().from('users').select('id').eq('email', email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'هذا البريد مسجل بالفعل', email }, { status: 400 });
    }

    // Create Supabase Auth account using service role key
    const { data: authData, error: authError } = await getSupabase().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        full_name_ar: nameAr,
        phone: phone || null,
        role,
      },
    });

    if (authError) {
      // Fallback: try public signup if service role key is invalid
      if (authError.message.includes('Invalid API key') || authError.message.includes('Unauthorized')) {
        const publicSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: publicData, error: publicError } = await publicSupabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              full_name_ar: nameAr,
              phone: phone || null,
              role,
            },
          },
        });

        if (publicError) {
          return NextResponse.json({ error: publicError.message }, { status: 400 });
        }

        if (publicData?.user) {
          try {
            await getSupabase().from('users').upsert({
              id: publicData.user.id,
              email,
              password_hash: 'supabase_auth',
              full_name_ar: nameAr,
              full_name_en: name,
              phone,
              role,
              is_active: true,
            }, { onConflict: 'id' });
          } catch {}
        }

        return NextResponse.json({
          success: true,
          userId: publicData.user?.id,
          email,
          message: 'تم إنشاء المستخدم بنجاح',
        });
      }

      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create users table record
    if (authData?.user) {
      try {
        await getSupabase().from('users').upsert({
          id: authData.user.id,
          email,
          password_hash: 'supabase_auth',
          full_name_ar: nameAr,
          full_name_en: name,
          phone,
          role,
          is_active: true,
        }, { onConflict: 'id' });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      userId: authData.user?.id,
      email,
      message: 'تم إنشاء المستخدم بنجاح',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل إنشاء المستخدم' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, email, full_name_ar, full_name_en, phone, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, users: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });

    await getSupabase().auth.admin.deleteUser(userId);
    await getSupabase().from('users').delete().eq('id', userId);

    return NextResponse.json({ success: true, message: 'تم حذف المستخدم' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });

    // Reset password
    if (body.action === 'reset-password') {
      const password = DEFAULT_PASSWORD;
      await getSupabase().auth.admin.updateUserById(userId, { password });
      return NextResponse.json({
        success: true,
        message: 'تم إعادة تعيين كلمة المرور إلى 123456',
      });
    }

    // Update email
    if (body.action === 'update-email' && body.newEmail) {
      const { data: existing } = await getSupabase().from('users').select('id').eq('email', body.newEmail).maybeSingle();
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: 'هذا البريد مسجل بالفعل' }, { status: 400 });
      }

      await getSupabase().auth.admin.updateUserById(userId, { email: body.newEmail });
      await getSupabase().from('users').update({ email: body.newEmail }).eq('id', userId);

      return NextResponse.json({
        success: true,
        newEmail: body.newEmail,
        message: 'تم تحديث البريد الإلكتروني',
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل العملية' }, { status: 500 });
  }
}

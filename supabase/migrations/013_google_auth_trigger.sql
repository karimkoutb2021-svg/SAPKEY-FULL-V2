-- Trigger to automatically create a public.users record for Google OAuth signups
-- ensuring they are restricted to the 'customer' role.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- If the user signed up via Google OAuth
  IF new.raw_app_meta_data->>'provider' = 'google' THEN
    INSERT INTO public.users (id, email, full_name_ar, full_name_en, role, is_active, password_hash)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      'customer',
      true,
      'google_oauth'
    )
    ON CONFLICT (id) DO UPDATE SET 
      role = 'customer'; -- ensure role remains customer if logged in via google
      
    -- Also sync to customers table safely
    INSERT INTO public.customers (id, name, email, phone, loyalty_points)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.email,
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      0
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

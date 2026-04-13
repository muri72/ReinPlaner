-- Verknüpfe profiles mit Supabase Auth

-- Add user_id to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
    ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add email to profiles if not exists  
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add user_id to employees if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'user_id') THEN
    ALTER TABLE employees ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

SELECT 'Added user_id columns' AS status;

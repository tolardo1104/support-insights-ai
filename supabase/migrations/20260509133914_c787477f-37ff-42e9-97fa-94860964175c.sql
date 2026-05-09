
UPDATE auth.users
SET encrypted_password = crypt('2906@Gja', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'tolardo1104@gmail.com';

-- Clean up duplicate storage policies
DROP POLICY IF EXISTS "Sheet PDFs are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;
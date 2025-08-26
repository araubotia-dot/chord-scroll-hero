-- Add support for PDF sheet music
-- Add new columns to songs table
ALTER TABLE public.songs 
ADD COLUMN kind TEXT NOT NULL DEFAULT 'chords' CHECK (kind IN ('chords', 'pdf')),
ADD COLUMN pdf_url TEXT;

-- Add constraint: pdf_url is required when kind='pdf'
ALTER TABLE public.songs 
ADD CONSTRAINT songs_pdf_url_check 
CHECK (
  (kind = 'chords' AND pdf_url IS NULL) OR
  (kind = 'pdf' AND pdf_url IS NOT NULL)
);

-- Create storage bucket for sheet PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sheet-pdfs', 'sheet-pdfs', true);

-- Create policies for sheet PDFs bucket
CREATE POLICY "Users can upload their own sheet PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sheet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own sheet PDFs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sheet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own sheet PDFs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'sheet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own sheet PDFs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'sheet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to sheet PDFs (since they need to be accessible in PDF viewer)
CREATE POLICY "Sheet PDFs are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sheet-pdfs');
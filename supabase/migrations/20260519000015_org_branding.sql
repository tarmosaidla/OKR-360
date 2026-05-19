-- Org branding: logo + primary colour
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS logo_url     text,
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#5D5BE6';

-- Storage bucket for org logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: public read
CREATE POLICY "org_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

-- RLS: org members can upload / update their own logo
-- File path convention: {org_id}/logo.{ext}
CREATE POLICY "org_logos_org_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1] = (
      SELECT org_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_logos_org_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1] = (
      SELECT org_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

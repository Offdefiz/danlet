-- Store a public social thumbnail URL as a hotlink, not a copyrighted
-- re-upload. Native Instagram/Pinterest embeds remain the fallback.
ALTER TABLE public.references_catalog
  ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.references_catalog
  ADD CONSTRAINT references_catalog_image_url_length CHECK (
    image_url IS NULL OR char_length(image_url) <= 2048
  );
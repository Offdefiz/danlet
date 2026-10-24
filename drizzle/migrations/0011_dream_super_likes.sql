-- Super Likes belong to the individual vote: a favorite is not a match
-- unless both partners have liked the same reference.
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS super_liked boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='votes_super_like_requires_like') THEN
    ALTER TABLE public.votes ADD CONSTRAINT votes_super_like_requires_like
      CHECK (NOT super_liked OR liked);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS votes_super_liked_reference_idx
  ON public.votes(reference_id) WHERE super_liked = true;

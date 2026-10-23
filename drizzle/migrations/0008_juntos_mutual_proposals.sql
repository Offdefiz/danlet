-- Juntos: proposals remain outside the calendar until both named members agree.
-- Migration must be applied to the Supabase database before deploying the UI.
CREATE TABLE IF NOT EXISTS public.couple_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text UNIQUE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 150),
  date date NOT NULL,
  time text NOT NULL CHECK (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_by uuid REFERENCES public.couple_members(user_id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','declined','agreed')),
  record_id uuid UNIQUE REFERENCES public.records(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.couple_proposal_votes (
  proposal_id uuid NOT NULL REFERENCES public.couple_proposals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.couple_members(user_id),
  accepted boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(proposal_id, user_id)
);
CREATE INDEX IF NOT EXISTS couple_proposals_recent ON public.couple_proposals(created_at DESC);
GRANT SELECT, INSERT ON public.couple_proposals TO authenticated;
GRANT SELECT ON public.couple_proposal_votes TO authenticated;
GRANT ALL ON public.couple_proposals, public.couple_proposal_votes TO service_role;
ALTER TABLE public.couple_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_proposal_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY couple_proposals_read ON public.couple_proposals FOR SELECT TO authenticated
  USING (public.is_duet_member());
CREATE POLICY couple_proposals_create ON public.couple_proposals FOR INSERT TO authenticated
  WITH CHECK (public.is_duet_member() AND created_by = auth.uid()
    AND dedupe_key IS NULL AND status = 'pending' AND record_id IS NULL);
CREATE POLICY couple_votes_read ON public.couple_proposal_votes FOR SELECT TO authenticated
  USING (public.is_duet_member());

CREATE OR REPLACE FUNCTION public.vote_duet_proposal(p_proposal_id uuid, p_accept boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  proposal public.couple_proposals%ROWTYPE;
  member_count integer;
  yes_count integer;
  no_count integer;
  agenda_id uuid;
BEGIN
  IF actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.couple_members WHERE user_id = actor) THEN
    RAISE EXCEPTION 'Acesso reservado ao casal.';
  END IF;
  SELECT * INTO proposal FROM public.couple_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada.'; END IF;
  IF proposal.status = 'agreed' THEN RETURN 'agreed'; END IF;
  INSERT INTO public.couple_proposal_votes(proposal_id,user_id,accepted)
    VALUES(p_proposal_id,actor,p_accept)
    ON CONFLICT(proposal_id,user_id) DO UPDATE SET accepted = excluded.accepted, updated_at = now();
  SELECT count(*) INTO member_count FROM public.couple_members;
  SELECT count(*) FILTER (WHERE accepted), count(*) FILTER (WHERE NOT accepted)
    INTO yes_count, no_count FROM public.couple_proposal_votes WHERE proposal_id = p_proposal_id;
  IF member_count = 2 AND yes_count = 2 THEN
    INSERT INTO public.records(kind,title,body,period,created_by,updated_by)
      VALUES ('setting',
        'Agenda: ' || left(proposal.title, 80) || ' (' || to_char(proposal.date,'DD/MM') || ') #' || left(proposal.id::text,8),
        jsonb_build_object('origin','juntos-agreed','proposalId',proposal.id,
          'date',proposal.date,'time',proposal.time,'notes',proposal.title,'location','')::text,
        'Curto Prazo',actor,actor)
      RETURNING id INTO agenda_id;
    UPDATE public.couple_proposals SET status = 'agreed', record_id = agenda_id, updated_at=now()
      WHERE id = p_proposal_id;
    PERFORM public.enqueue_duet_push(actor,'proposal','proposal:' || proposal.id::text);
    RETURN 'agreed';
  ELSIF no_count > 0 THEN
    UPDATE public.couple_proposals SET status='declined',updated_at=now() WHERE id=p_proposal_id;
    PERFORM public.enqueue_duet_push(actor,'proposal','proposal:' || proposal.id::text);
    RETURN 'declined';
  ELSE
    UPDATE public.couple_proposals SET status='pending',updated_at=now() WHERE id=p_proposal_id;
    PERFORM public.enqueue_duet_push(actor,'proposal','proposal:' || proposal.id::text);
    RETURN 'pending';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.vote_duet_proposal(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vote_duet_proposal(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.queue_new_duet_proposal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND NEW.created_by = auth.uid() THEN
    PERFORM public.enqueue_duet_push(NEW.created_by,'proposal','proposal:' || NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER duet_proposal_new_push AFTER INSERT ON public.couple_proposals
FOR EACH ROW EXECUTE FUNCTION public.queue_new_duet_proposal();

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_proposals, public.couple_proposal_votes;

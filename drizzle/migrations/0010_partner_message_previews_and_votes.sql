-- October 2026: messages carry only message UUID in event queue, never text.
-- Only authenticated partner recipient sees the actual message via server lookup.
-- Partner proposal votes create explicit yes/no/agreement push notifications.
CREATE OR REPLACE FUNCTION public.queue_duet_addition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE actor uuid; msg text; event_kind text := 'addition';
BEGIN
  actor := auth.uid();
  IF TG_TABLE_NAME = 'records' THEN
    IF NEW.kind = 'setting' AND NEW.title LIKE 'Agenda: %' AND NEW.body LIKE '%juntos-agreed%' THEN RETURN NEW; END IF;
    msg := CASE NEW.kind
      WHEN 'music' THEN 'adicionou uma música'
      WHEN 'goal' THEN 'adicionou uma meta'
      WHEN 'task' THEN 'adicionou um próximo passo'
      WHEN 'setting' THEN 'definiu a data do casamento'
      ELSE 'adicionou uma anotação' END || ': ' || NEW.title;
  ELSIF TG_TABLE_NAME = 'references_catalog' THEN
    msg := 'adicionou uma referência: ' || NEW.title;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    msg := 'message:' || NEW.id::text;
    event_kind := 'message';
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.avatar_path IS NOT DISTINCT FROM OLD.avatar_path THEN RETURN NEW; END IF;
    msg := 'adicionou uma nova foto de perfil';
  ELSE
    RETURN NEW;
  END IF;
  PERFORM public.enqueue_duet_push(actor,event_kind,msg);
  RETURN NEW;
END $$;


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
    PERFORM public.enqueue_duet_push(actor,'proposal_vote','agreed:' || proposal.id::text);
    RETURN 'agreed';
  ELSIF no_count > 0 THEN
    UPDATE public.couple_proposals SET status='declined',updated_at=now() WHERE id=p_proposal_id;
    PERFORM public.enqueue_duet_push(actor,'proposal_vote','declined:' || proposal.id::text);
    RETURN 'declined';
  ELSE
    UPDATE public.couple_proposals SET status='pending',updated_at=now() WHERE id=p_proposal_id;
    -- A manually created proposal already pushes on INSERT; do not double-send.
    IF proposal.created_by IS DISTINCT FROM actor THEN
      PERFORM public.enqueue_duet_push(actor,'proposal_vote','accepted:' || proposal.id::text);
    END IF;
    RETURN 'pending';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.vote_duet_proposal(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vote_duet_proposal(uuid,boolean) TO authenticated;

-- Separate actual chat messages from optional activity announcements.
-- On/off remains a per-recipient choice; online alerts have no artificial
-- cooldown. A real online transition is still required by heartbeat_duet_push.
CREATE OR REPLACE FUNCTION public.queue_duet_addition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE actor uuid; msg text; event_kind text := 'addition';
BEGIN
  actor := auth.uid();
  IF TG_TABLE_NAME = 'records' THEN
    msg := CASE NEW.kind
      WHEN 'music' THEN 'adicionou uma música'
      WHEN 'goal' THEN 'adicionou uma meta'
      WHEN 'task' THEN 'adicionou um próximo passo'
      WHEN 'setting' THEN 'definiu a data do casamento'
      ELSE 'adicionou uma anotação' END || ': ' || NEW.title;
  ELSIF TG_TABLE_NAME = 'references_catalog' THEN
    msg := 'adicionou uma referência: ' || NEW.title;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    msg := 'enviou uma mensagem no chat';
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

-- Messages are never hidden by the unrelated "new additions" switch and
-- survive outages longer than ordinary activity events. An online notification
-- fires on each actual presence transition, without preference cooldown.
CREATE OR REPLACE FUNCTION public.claim_duet_push_events()
RETURNS SETOF public.push_event_queue
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE e public.push_event_queue; p public.notification_preferences;
BEGIN
  FOR e IN
    SELECT * FROM public.push_event_queue
    WHERE processed_at IS NULL
    ORDER BY CASE kind WHEN 'message' THEN 0 WHEN 'online' THEN 1 ELSE 2 END,
             created_at
    LIMIT 100 FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.push_event_queue SET processed_at = now() WHERE id = e.id;
    INSERT INTO public.notification_preferences(user_id) VALUES(e.recipient_id)
      ON CONFLICT DO NOTHING;
    SELECT * INTO p FROM public.notification_preferences
      WHERE user_id = e.recipient_id FOR UPDATE;
    IF NOT p.enabled
      OR (e.kind = 'addition' AND NOT p.additions)
      OR (e.kind = 'online' AND NOT p.online)
      OR (e.kind = 'message' AND e.created_at < now() - interval '7 days')
      OR (e.kind <> 'message' AND e.created_at < now() - interval '10 minutes')
    THEN CONTINUE; END IF;
    RETURN NEXT e;
  END LOOP;
END $$;

-- Existing privileges continue to apply to the replaced functions.
REVOKE ALL ON FUNCTION public.queue_duet_addition() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_duet_push_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_duet_push_events() TO service_role;

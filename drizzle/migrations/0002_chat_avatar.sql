ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;
CREATE POLICY couple_profiles_read ON public.profiles FOR SELECT TO authenticated USING (public.is_duet_member());
CREATE TABLE public.messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_read ON public.messages FOR SELECT TO authenticated USING (public.is_duet_member());
CREATE POLICY messages_add ON public.messages FOR INSERT TO authenticated WITH CHECK (public.is_duet_member() AND user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
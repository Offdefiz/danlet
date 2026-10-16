ALTER TABLE public.records DROP CONSTRAINT records_kind_check;
ALTER TABLE public.records ADD CONSTRAINT records_kind_check CHECK (kind IN ('goal','task','note','setting','music'));
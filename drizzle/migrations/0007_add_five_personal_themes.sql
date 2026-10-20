-- Extend the existing per-user theme options without modifying saved choices.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_color_theme_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_color_theme_check
CHECK (color_theme IN ('romance', 'sage', 'rose', 'ocean', 'clean-modern', 'dark-elegant', 'earthy', 'pastel-romantic', 'clean-luxe'));

-- Knowledge Base
-- Replaces the Support workflow's "coming soon" placeholder with real,
-- searchable self-help articles. Seeded with platform-accurate content.
-- Date: 2026-10-20

CREATE TABLE IF NOT EXISTS public.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT TRUE,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can read published articles
CREATE POLICY "Read published articles"
  ON public.kb_articles FOR SELECT
  USING (is_published = TRUE);

-- Support/admin staff manage articles
CREATE POLICY "Staff manage articles"
  ON public.kb_articles FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.increment_kb_views(p_slug TEXT)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.kb_articles SET view_count = view_count + 1 WHERE slug = p_slug;
$$;

-- Tabela de setores/categorias de e-commerce
CREATE TABLE IF NOT EXISTS public.sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    icon text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- RLS: leitura pública (necessário para onboarding de qualquer lojista)
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sectors are viewable by everyone"
  ON public.sectors FOR SELECT
  USING (true);

-- Seed com os 12 setores padrão (mesmos do legado Vidlytics)
INSERT INTO public.sectors (id, name, slug, icon, display_order, created_at) VALUES
('a1b1c1d1-0001-4000-8000-000000000001', 'Moda e Acessórios', 'moda_acessorios', 'ShoppingBag', 1, now()),
('a1b1c1d1-0002-4000-8000-000000000002', 'Beleza e Cosméticos', 'beleza_cosmeticos', 'Sparkles', 2, now()),
('a1b1c1d1-0003-4000-8000-000000000003', 'Eletrônicos e Gadgets', 'eletronicos', 'Cpu', 3, now()),
('a1b1c1d1-0004-4000-8000-000000000004', 'Casa e Decoração', 'casa_decoracao', 'Home', 4, now()),
('a1b1c1d1-0005-4000-8000-000000000005', 'Saúde e Suplementos', 'saude_suplementos', 'Activity', 5, now()),
('a1b1c1d1-0006-4000-8000-000000000006', 'Esporte e Lazer', 'esporte_lazer', 'Trophy', 6, now()),
('a1b1c1d1-0007-4000-8000-000000000007', 'Infantil e Brinquedos', 'infantil_brinquedos', 'Baby', 7, now()),
('a1b1c1d1-0008-4000-8000-000000000008', 'Pet Shop', 'pet_shop', 'PawPrint', 8, now()),
('a1b1c1d1-0009-4000-8000-000000000009', 'Alimentos e Bebidas', 'alimentos_bebidas', 'Coffee', 9, now()),
('a1b1c1d1-0010-4000-8000-000000000010', 'Joias e Semijoias', 'joias_semijoias', 'Gem', 10, now()),
('a1b1c1d1-0011-4000-8000-000000000011', 'Artesanato', 'artesanato', 'Palette', 11, now()),
('a1b1c1d1-0012-4000-8000-000000000012', 'Outros / Serviços', 'outros', 'Globe', 12, now())
ON CONFLICT (id) DO NOTHING;

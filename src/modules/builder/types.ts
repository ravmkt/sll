export type BlockType = 'hero' | 'text' | 'image' | 'button' | 'video' | 'testimonials' | 'faq' | 'timer' | 'form' | 'product';

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, string>;
}

export interface PageContent {
  blocks: Block[];
}

export interface BuilderPage {
  id: string;
  store_id: string;
  type: 'landing' | 'product';
  title: string;
  slug: string;
  status: 'draft' | 'published';
  content: PageContent;
  updated_at: string;
  published_version?: number | null;
  published_html_path?: string | null;
}



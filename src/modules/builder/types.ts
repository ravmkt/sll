export type BlockType = 'columns' | 'hero' | 'text' | 'image' | 'button' | 'video' | 'testimonials' | 'faq' | 'timer' | 'form' | 'product' | 'announcement';

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, string>;
  children?: Block[][];
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
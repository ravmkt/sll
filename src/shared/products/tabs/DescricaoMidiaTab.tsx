import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProductRow } from '../types';

interface Props {
  product: ProductRow;
  onChange: (patch: Partial<ProductRow>) => void;
}

function embedUrl(url?: string | null): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function DescricaoMidiaTab({ product, onChange }: Props) {
  const embed = embedUrl(product.video_url);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="p-video">Vídeo do produto (YouTube ou Vimeo)</Label>
        <Input
          id="p-video" type="url" placeholder="https://www.youtube.com/watch?v=..."
          value={product.video_url ?? ''}
          onChange={(e) => onChange({ video_url: e.target.value || null })}
        />
        {product.video_url && !embed && (
          <p className="text-xs text-muted-foreground">Link salvo, mas sem pré-visualização (só YouTube e Vimeo).</p>
        )}
      </div>

      {embed && (
        <div className="aspect-video w-full max-w-md overflow-hidden rounded-md border">
          <iframe
            src={embed} title="Pré-visualização do vídeo"
            className="h-full w-full" allowFullScreen
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="p-notes">Observações internas</Label>
        <Textarea
          id="p-notes" rows={5}
          placeholder="Visível apenas para a equipe, não aparece na loja."
          value={product.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value || null })}
        />
      </div>
    </div>
  );
}

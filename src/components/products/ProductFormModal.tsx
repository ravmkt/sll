import { useState } from 'react';
import { Image as ImageIcon, Loader2, Save } from 'lucide-react';
import { CatalogProduct, saveProduct } from '@/services/productsService';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { Modal, errMsg, fileCls, ghostBtn, inputCls, labelCls, primaryBtn } from './Modal';

type Props = {
  storeId: string;
  product: CatalogProduct | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductFormModal({ storeId, product, categories, onClose, onSaved }: Props) {
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : '');
  const [url, setUrl] = useState(product?.product_url ?? '');
  const [active, setActive] = useState(product?.active ?? true);
  const [image, setImage] = useState(product?.image_url ?? '');
  const [imgError, setImgError] = useState('');
  const [saving, setSaving] = useState(false);

  const options = category && !categories.includes(category) ? [category, ...categories] : categories;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setImgError('Formato inválido. Use JPG, PNG ou WEBP.');
    if (f.size > 350 * 1024) return setImgError('A imagem deve ter no máximo 350 KB.');
    const r = new FileReader();
    r.onload = () => { setImage(String(r.result)); setImgError(''); };
    r.readAsDataURL(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(price);
    if (!name.trim()) return showError('Nome do produto é obrigatório.');
    if (!category) return showError('Categoria é obrigatória.');
    if (!price || !Number.isFinite(value) || value <= 0) return showError('Informe um preço válido.');
    if (imgError) return showError(imgError);
    setSaving(true);
    try {
      await saveProduct(storeId, { name, category, price: value, product_url: url, image_url: image, active }, product?.id);
      showSuccess(product ? 'Produto atualizado!' : 'Produto criado!');
      onSaved();
      onClose();
    } catch (err) {
      showError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={product ? 'Editar produto' : 'Novo produto'} onClose={onClose}>
      <form onSubmit={submit} className="p-6 space-y-5">
        <div>
          <label className={labelCls}>Imagem do produto</label>
          <div className="mt-2 flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#111524] flex items-center justify-center">
              {image ? <img src={image} alt="Prévia" className="h-full w-full object-cover" /> : <ImageIcon size={24} className="text-slate-400" />}
            </div>
            <div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className={fileCls} />
              <p className="mt-1 text-[11px] text-slate-400">JPG, PNG ou WEBP. Máx. 350 KB.</p>
              {imgError && <p className="mt-1 text-xs font-semibold text-red-500">{imgError}</p>}
            </div>
          </div>
        </div>
        <div>
          <label className={labelCls}>Nome do produto *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vestido Floral" className={cn(inputCls, 'mt-2')} />
        </div>
        <div>
          <label className={labelCls}>Categoria *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(inputCls, 'mt-2 cursor-pointer')}>
            <option value="">Selecione uma categoria</option>
            {options.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Preço (R$) *</label>
          <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" className={cn(inputCls, 'mt-2')} />
        </div>
        <div>
          <label className={labelCls}>Link do produto</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sualoja.com/produto" className={cn(inputCls, 'mt-2')} />
        </div>
        <div className="flex items-center gap-3">
          <span className={labelCls}>Produto ativo?</span>
          <button type="button" onClick={() => setActive(!active)} className={cn('relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer', active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')}>
            <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', active ? 'translate-x-6' : 'translate-x-1')} />
          </button>
          <span className="text-xs font-semibold text-slate-500">{active ? 'Ativo' : 'Desativado'}</span>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button type="button" onClick={onClose} className={ghostBtn}>Cancelar</button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Salvando...' : product ? 'Atualizar' : 'Criar produto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
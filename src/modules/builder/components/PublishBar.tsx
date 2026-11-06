import { useState } from 'react';
import { useBuilder } from '../store';
import { buildPreviewHtml, publishPage } from '../services/publish';

export default function PublishBar({ id, title }: { id: string; title: string }) {
  const blocks = useBuilder((s) => s.blocks);
  const [msg, setMsg] = useState('');
  const [url, setUrl] = useState('');

  async function preview() {
    try {
      const html = await buildPreviewHtml(id, title, { blocks });
      window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function publish() {
    setMsg('Publicando...');
    try {
      const r = await publishPage(id, title, { blocks });
      setUrl(r.url);
      setMsg(`v${r.version} publicada`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-sm text-gray-500">{msg}</span>}
      {url && <a href={url} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 underline">Abrir</a>}
      <button onClick={preview} className="rounded-md border px-4 py-2">Visualizar</button>
      <button onClick={publish} className="rounded-md bg-gray-900 px-4 py-2 text-white">Publicar</button>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useBuilder } from '../store';
import { buildPreviewHtml, getPublishedUrl, publishPage } from '../services/publish';
import SuccessModal from './SuccessModal';

export default function PublishBar({ id, title }: { id: string; title: string }) {
  const blocks = useBuilder((s) => s.blocks);
  const [msg, setMsg] = useState('');
  const [url, setUrl] = useState('');
  const [version, setVersion] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    getPublishedUrl(id).then((u) => { if (alive && u) setUrl(u); }).catch(() => {});
    return () => { alive = false; };
  }, [id]);

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
      setVersion(r.version);
      setMsg(`v${r.version} publicada`);
      setDone(true);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-sm text-gray-500">{msg}</span>}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          <ExternalLink className="h-4 w-4" /> Abrir
        </a>
      )}
      <button onClick={preview} className="rounded-md border px-4 py-2">Visualizar</button>
      <button onClick={publish} className="rounded-md bg-gray-900 px-4 py-2 text-white">Publicar</button>
      <SuccessModal
        open={done}
        onClose={() => setDone(false)}
        href={url}
        title={'P\u00e1gina publicada!'}
        message={`Vers\u00e3o ${version} no ar.`}
      />
    </div>
  );
}
import { createClient } from 'npm:@supabase/supabase-js@2';

const out = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b, null, 2), { status: s, headers: { 'Content-Type': 'application/json' } });

const LEGACY = '%supabase.co/storage%';

Deno.serve(async (req) => {
  const cron = Deno.env.get('MIGRATE_KEY') || Deno.env.get('CRON_KEY');
  if (!cron || req.headers.get('x-cron-key') !== cron) return out({ error: 'unauthorized' }, 401);

  const apiKey = Deno.env.get('BUNNY_API_KEY')!;
  const lib = Deno.env.get('BUNNY_LIBRARY_ID')!;
  const host = (Deno.env.get('BUNNY_CDN_HOST') || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const api = `https://video.bunnycdn.com/library/${lib}`;
  const bunny = { AccessKey: apiKey, accept: 'application/json', 'content-type': 'application/json' };

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    db: { schema: 'vidlytics' },
    auth: { persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const action = body.action || 'status';
  const limit = Math.min(Number(body.limit) || 30, 50);

  if (action === 'status') {
    const total = await sb.from('vid_videos').select('id', { count: 'exact', head: true }).like('video_url', LEGACY);
    const started = await sb.from('vid_videos').select('id', { count: 'exact', head: true })
      .like('video_url', LEGACY).not('bunny_video_id', 'is', null);
    const migrated = await sb.from('vid_videos').select('id', { count: 'exact', head: true }).like('video_url', '%.m3u8%');
    return out({
      ainda_no_supabase: total.count,
      enviados_ao_bunny_aguardando_sync: started.count,
      ja_em_hls: migrated.count,
    });
  }

  if (action === 'start') {
    const { data, error } = await sb.from('vid_videos')
      .select('id, title, video_url')
      .like('video_url', LEGACY)
      .is('bunny_video_id', null)
      .order('created_at')
      .limit(limit);
    if (error) return out({ error: error.message }, 500);
    if (body.dry_run) return out({ dry_run: true, qtd: data!.length, videos: data });

    const results: unknown[] = [];
    for (const v of data!) {
      try {
        const r = await fetch(`${api}/videos/fetch`, {
          method: 'POST',
          headers: bunny,
          body: JSON.stringify({ url: v.video_url, title: v.title || v.id }),
        });
        const j = await r.json().catch(() => ({}));
        const guid = j.id || j.guid || j.videoId;
        if (!r.ok || !guid) { results.push({ id: v.id, ok: false, http: r.status, resposta: j }); continue; }
        const up = await sb.from('vid_videos').update({ bunny_video_id: guid }).eq('id', v.id);
        results.push({ id: v.id, ok: !up.error, bunny_video_id: guid, erro: up.error?.message });
      } catch (e) {
        results.push({ id: v.id, ok: false, erro: String(e) });
      }
    }
    return out({ enviados: results.filter((x: any) => x.ok).length, results });
  }

  if (action === 'sync') {
    const { data, error } = await sb.from('vid_videos')
      .select('id, bunny_video_id')
      .like('video_url', LEGACY)
      .not('bunny_video_id', 'is', null)
      .limit(100);
    if (error) return out({ error: error.message }, 500);

    const results: unknown[] = [];
    for (const v of data!) {
      try {
        const r = await fetch(`${api}/videos/${v.bunny_video_id}`, { headers: bunny });
        const j = await r.json();
        if (!r.ok) { results.push({ id: v.id, ok: false, http: r.status }); continue; }
        // 4 = finished | 5 = error | 6 = upload failed
        if (j.status === 5 || j.status === 6) { results.push({ id: v.id, ok: false, bunny_status: j.status }); continue; }
        if (j.status !== 4) { results.push({ id: v.id, ok: false, aguardando: true, bunny_status: j.status, encodeProgress: j.encodeProgress }); continue; }

        const base = `https://${host}/${v.bunny_video_id}`;
        const secs = Math.round(Number(j.length) || 0);
        const up = await sb.from('vid_videos').update({
          video_url: `${base}/playlist.m3u8`,
          hls_url: `${base}/playlist.m3u8`,
          thumbnail_url: `${base}/thumbnail.jpg`,
          thumb_url: `${base}/thumbnail.jpg`,
          duration: secs,
          duration_seconds: secs,
          updated_at: new Date().toISOString(),
        }).eq('id', v.id);
        results.push({ id: v.id, ok: !up.error, erro: up.error?.message });
      } catch (e) {
        results.push({ id: v.id, ok: false, erro: String(e) });
      }
    }
    return out({ migrados: results.filter((x: any) => x.ok).length, results });
  }

  if (action === 'reset') {
    const { data, error } = await sb.from('vid_videos')
      .select('id, bunny_video_id')
      .like('video_url', LEGACY)
      .not('bunny_video_id', 'is', null);
    if (error) return out({ error: error.message }, 500);
    const results: unknown[] = [];
    for (const v of data!) {
      const r = await fetch(`${api}/videos/${v.bunny_video_id}`, { headers: bunny });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.status === 4) continue;
      if (r.ok) await fetch(`${api}/videos/${v.bunny_video_id}`, { method: 'DELETE', headers: bunny });
      const up = await sb.from('vid_videos').update({ bunny_video_id: null }).eq('id', v.id);
      results.push({ id: v.id, bunny_status: j.status, resetado: !up.error });
    }
    return out({ resetados: results.length, results });
  }

  return out({ error: 'action inválida (status | start | sync | reset)' }, 400);
});
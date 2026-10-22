const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const videoId = String(body?.videoId || '').trim();
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return json({ error: 'videoId invalido' }, 400);

    let title = '';
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let scheduledStartTime: string | null = null;

    // 1) API oficial (opcional): defina o secret YOUTUBE_API_KEY
    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (apiKey) {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${apiKey}`,
        { signal: AbortSignal.timeout(6000) },
      ).catch(() => null);
      if (r?.ok) {
        const item = (await r.json())?.items?.[0];
        if (item) {
          title = item.snippet?.title || '';
          const th = item.snippet?.thumbnails;
          thumbnailUrl = th?.maxres?.url || th?.high?.url || thumbnailUrl;
          scheduledStartTime =
            item.liveStreamingDetails?.scheduledStartTime ||
            item.liveStreamingDetails?.actualStartTime ||
            null;
        }
      }
    }

    // 2) Titulo via oEmbed
    if (!title) {
      const r = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
        { signal: AbortSignal.timeout(6000) },
      ).catch(() => null);
      if (r?.ok) title = (await r.json())?.title || '';
    }

    // 3) Data programada lida da pagina publica (sem chave de API)
    if (!scheduledStartTime) {
      const r = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR,pt;q=0.9' },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      if (r?.ok) {
        const html = await r.text();
        const epoch = /"scheduledStartTime":"(\d{9,11})"/.exec(html)?.[1];
        const iso = /"startTimestamp":"([^"]+)"/.exec(html)?.[1];
        if (epoch) scheduledStartTime = new Date(Number(epoch) * 1000).toISOString();
        else if (iso) scheduledStartTime = new Date(iso).toISOString();
      }
    }

    return json({ title, thumbnailUrl, scheduledStartTime });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.playlist_id || '').trim();
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(id)) return json({ error: 'playlist_id invalido' }, 400);

    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${id}`);
    if (!res.ok) return json({ error: `YouTube respondeu HTTP ${res.status}` }, 502);
    const xml = await res.text();

    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
      .map((m) => {
        const e = m[1];
        const videoId = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(e)?.[1];
        const title = /<title>([^<]*)<\/title>/.exec(e)?.[1];
        const published = /<published>([^<]+)<\/published>/.exec(e)?.[1] || '';
        if (!videoId || !title) return null;
        return {
          id: videoId,
          title: decode(title),
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          published,
        };
      })
      .filter(Boolean);

    return json({ videos });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
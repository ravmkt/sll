const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

type Video = { id: string; title: string; thumbnail: string; published: string };

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

async function viaApi(id: string, key: string): Promise<Video[] | null> {
  const out: Video[] = [];
  let pageToken = '';
  for (let i = 0; i < 4; i++) {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails,status&maxResults=50` +
      `&playlistId=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    for (const it of data.items || []) {
      const vid = it?.contentDetails?.videoId || it?.snippet?.resourceId?.videoId;
      const title = it?.snippet?.title;
      const privacy = it?.status?.privacyStatus;
      if (!vid || !title) continue;
      if (privacy && privacy !== 'public' && privacy !== 'unlisted') continue;
      if (title === 'Private video' || title === 'Deleted video') continue;
      out.push({
        id: vid,
        title,
        thumbnail: thumb(vid),
        published: it?.contentDetails?.videoPublishedAt || it?.snippet?.publishedAt || '',
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return out;
}

async function viaRss(id: string): Promise<Video[] | null> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${id}`);
  if (!res.ok) return null;
  const xml = await res.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => {
      const e = m[1];
      const videoId = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(e)?.[1];
      const title = /<title>([^<]*)<\/title>/.exec(e)?.[1];
      const published = /<published>([^<]+)<\/published>/.exec(e)?.[1] || '';
      if (!videoId || !title) return null;
      return { id: videoId, title: decode(title), thumbnail: thumb(videoId), published };
    })
    .filter(Boolean) as Video[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.playlist_id || '').trim();
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(id)) return json({ error: 'playlist_id invalido' }, 400);

    const key = Deno.env.get('YOUTUBE_API_KEY') || '';
    let videos: Video[] | null = null;
    let source = 'rss';

    if (key) {
      videos = await viaApi(id, key);
      if (videos) source = 'api';
    }
    if (!videos) videos = await viaRss(id);
    if (!videos) return json({ error: 'YouTube indisponivel' }, 502);

    return json({ videos, source });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
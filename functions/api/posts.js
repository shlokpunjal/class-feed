import { isAdmin, json } from '../../lib/auth.js';

const TTL = 15 * 24 * 3600;          // KV deletes every key after 15 days
const MAX_FILE = 5 * 1024 * 1024;    // 5 MB
const YT = /(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/i;
const clean = s => String(s || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export async function onRequestGet({ env }) {
  const { keys } = await env.POSTS.list({ prefix: 'post:' });
  const posts = (await Promise.all(keys.map(k => env.POSTS.get(k.name, 'json')))).filter(Boolean);
  posts.sort((a, b) => b.createdAt - a.createdAt);
  return json(posts.filter(p => p.expiresAt > Date.now()));
}

async function pageInfo(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { 'user-agent': 'Mozilla/5.0 ClassFeedBot' } });
    const html = (await r.text()).slice(0, 60000);
    const meta = p => (html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + p + '["\'][^>]*content=["\']([^"\']*)', 'i')) || [])[1];
    const title = meta('og:title') || (html.match(/<title[^>]*>([^<]*)/i) || [])[1];
    return { title: clean(title), desc: clean(meta('og:description') || meta('description')).slice(0, 180) };
  } catch { return {}; }
}

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Not signed in' }, 401);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = Date.now();
  const post = { id, createdAt: now, expiresAt: now + TTL * 1000 };
  const ct = request.headers.get('content-type') || '';

  if (ct.includes('multipart/form-data')) {
    const form = await request.formData();
    const f = form.get('file');
    if (!f || typeof f === 'string') return json({ error: 'No file' }, 400);
    if (f.size > MAX_FILE) return json({ error: 'File is over 5 MB' }, 400);
    const isPdf = f.type === 'application/pdf';
    if (!isPdf && !f.type.startsWith('image/')) return json({ error: 'Only images and PDFs are supported' }, 400);
    await env.POSTS.put('file:' + id, await f.arrayBuffer(), { expirationTtl: TTL, metadata: { type: f.type } });
    Object.assign(post, {
      type: isPdf ? 'pdf' : 'comp', size: f.size,
      title: clean(form.get('title')) || (isPdf ? f.name.replace(/\.pdf$/i, '') : ''),
    });
  } else {
    const b = await request.json().catch(() => ({}));
    let u;
    try { u = new URL(b.url); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { return json({ error: 'That is not a valid link' }, 400); }
    const yt = u.href.match(YT);
    if (yt) {
      let title = clean(b.title);
      if (!title) {
        try {
          const o = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(u.href), { signal: AbortSignal.timeout(4000) }).then(r => r.json());
          title = clean(o.title);
        } catch {}
      }
      Object.assign(post, { type: 'short', url: u.href, videoId: yt[1], title });
    } else {
      const info = b.title ? {} : await pageInfo(u.href);
      Object.assign(post, {
        type: 'link', url: u.href, host: u.hostname.replace(/^www\./, ''),
        title: clean(b.title) || info.title || u.hostname, desc: clean(b.desc) || info.desc || '',
      });
    }
  }
  await env.POSTS.put('post:' + id, JSON.stringify(post), { expirationTtl: TTL });
  return json(post, 201);
}

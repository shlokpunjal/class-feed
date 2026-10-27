import { makeToken, safeEq, json } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch {}
  const ok = safeEq(b.user || '', env.ADMIN_USER) & safeEq(b.pass || '', env.ADMIN_PASS);
  if (!ok) { await new Promise(r => setTimeout(r, 800)); return json({ error: 'Wrong username or password' }, 401); }
  return json({ token: await makeToken(env) });
}

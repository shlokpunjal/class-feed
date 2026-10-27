import { makeToken, safeEq, json } from '../../lib/auth.js';

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch {}
  const userMatch = safeEq(b.user || '', env.ADMIN_USER);
  const passMatch = safeEq(b.pass || '', env.ADMIN_PASS);
  if (!(userMatch && passMatch)) {
    await new Promise(r => setTimeout(r, 800));
    return json({
      error: 'Wrong username or password',
      dbg: {
        hasUser: !!env.ADMIN_USER,
        hasPass: !!env.ADMIN_PASS,
        hasSecret: !!env.SESSION_SECRET,
        userMatch,
        passMatch
      }
    }, 401);
  }
  return json({ token: await makeToken(env) });
}
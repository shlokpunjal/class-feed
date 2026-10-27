import { isAdmin, json } from '../../../lib/auth.js';

export async function onRequestDelete({ request, env, params }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Not signed in' }, 401);
  await env.POSTS.delete('post:' + params.id);
  await env.POSTS.delete('file:' + params.id);
  return json({ ok: true });
}

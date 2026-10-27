export async function onRequestGet({ request, env, params }) {
  const { value, metadata } = await env.POSTS.getWithMetadata('file:' + params.id, 'arrayBuffer');
  if (!value) return new Response('Not found', { status: 404 });
  const h = { 'content-type': metadata?.type || 'application/octet-stream', 'cache-control': 'public, max-age=86400' };
  if (new URL(request.url).searchParams.has('dl')) {
    const post = await env.POSTS.get('post:' + params.id, 'json');
    const ext = metadata?.type === 'application/pdf' ? 'pdf' : (metadata?.type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg');
    const name = ((post?.title || 'file').replace(/[^\w\- ]+/g, '').trim() || 'file') + '.' + ext;
    h['content-disposition'] = `attachment; filename="${name}"`;
  }
  return new Response(value, { headers: h });
}

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, redirect }) => {
  const provider = url.searchParams.get('provider');

  if (!provider || !['google', 'github'].includes(provider)) {
    return new Response('Invalid provider', { status: 400 });
  }

  const projectId = import.meta.env.PUBLIC_STACK_PROJECT_ID;
  const callbackUrl = `${url.origin}/auth/callback`;

  // Stack Auth OAuth URL
  const oauthUrl = `https://api.stack-auth.com/api/v1/auth/oauth/authorize?` +
    `project_id=${projectId}&` +
    `provider=${provider}&` +
    `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
    `response_type=token`;

  return redirect(oauthUrl, 302);
};

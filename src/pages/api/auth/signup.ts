import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    // Call Stack Auth API to create account
    const response = await fetch('https://api.stack-auth.com/api/v1/auth/password/sign-up', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stack-access-type': 'client',
        'x-stack-project-id': import.meta.env.PUBLIC_STACK_PROJECT_ID,
        'x-stack-publishable-client-key': import.meta.env.PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error || 'Sign up failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the access token
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

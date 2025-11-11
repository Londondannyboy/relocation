import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { company_name, company_url } = body;

    if (!company_name || !company_url) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: company_name and company_url'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Trigger the Temporal workflow via the worker
    const workerUrl = import.meta.env.WORKER_URL || 'https://quest-worker-production.up.railway.app';

    const response = await fetch(`${workerUrl}/workflows/placement-company`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_name,
        company_url,
      }),
    });

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      workflow_id: result.workflow_id,
      message: 'Company profile workflow started',
      ...result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating company profile:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create company profile',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

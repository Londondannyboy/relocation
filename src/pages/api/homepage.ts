import type { APIRoute } from 'astro';
import { sql } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const homepage = await sql`
      SELECT
        id,
        site,
        section_type,
        section_order,
        title,
        subtitle,
        content,
        metadata
      FROM homepage_content
      WHERE site = 'placement'
        AND is_active = true
      ORDER BY section_order ASC
    `;

    return new Response(JSON.stringify(homepage), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching homepage content:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch homepage content' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

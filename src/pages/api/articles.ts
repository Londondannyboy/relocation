import type { APIRoute } from 'astro';
import { sql } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const articles = await sql`
      SELECT
        id,
        title,
        excerpt,
        slug,
        published_at,
        created_at,
        article_angle,
        word_count
      FROM articles
      WHERE app = 'placement'
        AND status = 'published'
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT 10
    `;

    return new Response(JSON.stringify(articles), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch articles' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

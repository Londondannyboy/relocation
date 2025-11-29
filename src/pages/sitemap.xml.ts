// Dynamic sitemap for relocation.quest
import type { APIRoute } from 'astro';
import { sql } from '../lib/db';

// Force static generation at build time
export const prerender = true;

const BASE_URL = 'https://relocation.quest';

// Static pages
const staticPages = [
  '',  // homepage
  '/articles',
  '/guides',
  '/companies',
];

async function generateSitemapXML(): Promise<string> {
  const currentDate = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  // Add static pages
  staticPages.forEach((page) => {
    const priority = page === '' ? '1.0' : '0.8';
    const changefreq = page === '' ? 'daily' : 'weekly';

    xml += `
  <url>
    <loc>${BASE_URL}${page}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  // Add all published articles from database
  try {
    const articles = await sql`
      SELECT
        slug,
        title,
        updated_at,
        published_at,
        created_at,
        featured_asset_url,
        video_playback_id,
        article_mode
      FROM articles
      WHERE app = 'relocation'
        AND status = 'published'
      ORDER BY published_at DESC NULLS LAST
    `;

    // Thumbnail time offsets by mode (so they look different in collections)
    const thumbnailTimeByMode: Record<string, number> = {
      story: 1,
      guide: 2,
      yolo: 3,
      voices: 4
    };

    articles.forEach((article: any) => {
      const lastModDate = article.updated_at || article.published_at || article.created_at;
      const formattedDate = lastModDate
        ? new Date(lastModDate).toISOString().split('T')[0]
        : currentDate;

      xml += `
  <url>
    <loc>${BASE_URL}/${article.slug}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>`;

      // Add image tags with mode-specific time offset
      const thumbTime = thumbnailTimeByMode[article.article_mode] || 1;
      const imageUrl = article.video_playback_id
        ? `https://image.mux.com/${article.video_playback_id}/thumbnail.jpg?time=${thumbTime}`
        : article.featured_asset_url;

      if (imageUrl) {
        xml += `
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${(article.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
    </image:image>`;
      }

      xml += `
  </url>`;
    });
  } catch (error) {
    console.error('Error fetching articles for sitemap:', error);
  }

  // Add country guides
  try {
    const countries = await sql`
      SELECT slug, name, updated_at, created_at
      FROM countries
      WHERE status = 'published'
      ORDER BY name ASC
    `;

    countries.forEach((country: any) => {
      const lastModDate = country.updated_at || country.created_at;
      const formattedDate = lastModDate
        ? new Date(lastModDate).toISOString().split('T')[0]
        : currentDate;

      xml += `
  <url>
    <loc>${BASE_URL}/guides/${country.slug}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
  } catch (error) {
    console.error('Error fetching countries for sitemap:', error);
  }

  xml += `
</urlset>`;

  return xml;
}

export const GET: APIRoute = async () => {
  const sitemap = await generateSitemapXML();

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
};

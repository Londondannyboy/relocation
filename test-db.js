import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function testQuery() {
  try {
    const result = await sql`
      SELECT
        id,
        title,
        slug,
        hero_image_url,
        hero_image_alt,
        featured_image_url,
        featured_image_alt
      FROM articles
      WHERE id = 1
    `;
    console.log('Article data:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testQuery();

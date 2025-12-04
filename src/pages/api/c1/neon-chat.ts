import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { sql } from '../../../lib/db';

const THESYS_API_KEY = import.meta.env.THESYS_API_KEY;

// Initialize C1 client
const c1Client = new OpenAI({
  apiKey: THESYS_API_KEY,
  baseURL: 'https://api.thesys.dev/v1/embed',
});

// Extract country names from query
function extractCountries(query: string): string[] {
  const countryPatterns = [
    'portugal', 'spain', 'france', 'germany', 'italy', 'uk', 'united kingdom',
    'usa', 'united states', 'dubai', 'uae', 'thailand', 'singapore', 'malta',
    'cyprus', 'greece', 'netherlands', 'ireland', 'switzerland', 'austria',
    'belgium', 'sweden', 'norway', 'denmark', 'finland', 'poland', 'czech',
    'hungary', 'croatia', 'slovenia', 'estonia', 'latvia', 'lithuania',
    'romania', 'bulgaria', 'slovakia', 'japan', 'australia', 'new zealand',
    'canada', 'mexico', 'brazil', 'argentina', 'chile', 'colombia',
    'indonesia', 'vietnam', 'philippines', 'malaysia', 'india', 'china',
    'south korea', 'taiwan', 'hong kong', 'morocco', 'south africa', 'kenya',
    'egypt', 'turkey', 'israel', 'qatar', 'bahrain', 'oman', 'saudi arabia'
  ];

  const lowerQuery = query.toLowerCase();
  return countryPatterns.filter(c => lowerQuery.includes(c));
}

// Fetch articles from Neon
async function fetchArticles(query: string, countries: string[], limit = 6) {
  try {
    // Build search pattern from query words
    const searchTerms = query.toLowerCase().split(' ').filter(w => w.length > 3);

    // First try to find articles matching countries or query
    let articles = await sql`
      SELECT
        id, slug, title, excerpt, meta_description,
        featured_asset_url, hero_asset_url,
        country_code, country,
        target_keyword, word_count
      FROM articles
      WHERE status = 'published'
        AND app = 'relocation'
      ORDER BY
        CASE
          WHEN ${countries.length > 0} AND (
            LOWER(title) LIKE ANY(${countries.map(c => `%${c}%`)})
            OR LOWER(slug) LIKE ANY(${countries.map(c => `%${c}%`)})
          ) THEN 0
          ELSE 1
        END,
        published_at DESC
      LIMIT ${limit}
    `;

    return articles;
  } catch (err) {
    console.error('[Neon Chat] Error fetching articles:', err);
    // Fallback: just get recent articles
    try {
      const fallback = await sql`
        SELECT id, slug, title, excerpt, meta_description,
          featured_asset_url, hero_asset_url, country_code
        FROM articles
        WHERE status = 'published' AND app = 'relocation'
        ORDER BY published_at DESC
        LIMIT 5
      `;
      return fallback;
    } catch {
      return [];
    }
  }
}

// Fetch countries from Neon
async function fetchCountries(countries: string[]) {
  try {
    if (countries.length === 0) return [];

    const result = await sql`
      SELECT
        id, name, code, slug, flag_emoji,
        visa_types, work_permit_requirements, tax_overview,
        language, processing_time, capital, currency_code,
        region, continent, relocation_motivations, relocation_tags,
        facts
      FROM countries
      WHERE LOWER(name) LIKE ANY(${countries.map(c => `%${c.toLowerCase()}%`)})
         OR LOWER(slug) LIKE ANY(${countries.map(c => `%${c.toLowerCase()}%`)})
      LIMIT 5
    `;

    console.log('[Neon Chat] Found countries:', result.length);
    return result;
  } catch (err) {
    console.error('[Neon Chat] Error fetching countries:', err);
    return [];
  }
}

// Fetch country hubs (detailed pages)
async function fetchCountryHubs(countries: string[]) {
  try {
    if (countries.length === 0) return [];

    const result = await sql`
      SELECT
        id, country_code, location_name, slug, title,
        meta_description, payload, primary_keyword
      FROM country_hubs
      WHERE status = 'published'
        AND (
          LOWER(location_name) = ANY(${countries.map(c => c.toLowerCase())})
          OR LOWER(country_code) = ANY(${countries.map(c => c.toLowerCase().substring(0, 2))})
        )
      LIMIT 3
    `;

    return result;
  } catch (err) {
    console.error('[Neon Chat] Error fetching hubs:', err);
    return [];
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the latest user message
    const latestUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    const userQuery = latestUserMessage?.content || '';

    // Extract countries mentioned
    const mentionedCountries = extractCountries(userQuery);

    // Fetch data from Neon in parallel - get MORE articles
    const [articles, countries, hubs] = await Promise.all([
      fetchArticles(userQuery, mentionedCountries, 12),
      fetchCountries(mentionedCountries),
      fetchCountryHubs(mentionedCountries),
    ]);

    console.log('[Neon Chat] Query:', userQuery);
    console.log('[Neon Chat] Countries mentioned:', mentionedCountries);
    console.log('[Neon Chat] Articles found:', articles.length);
    console.log('[Neon Chat] Countries found:', countries.length);

    // Build rich context for Thesys
    let dataContext = '';

    // Country data - COMPREHENSIVE
    if (countries.length > 0) {
      dataContext += '\n\n## COUNTRY DATA (Create info cards with ALL these stats):\n';
      countries.forEach((c: any) => {
        const facts = c.facts || {};
        dataContext += `
### ${c.flag_emoji || '🌍'} ${c.name}
**Basic Info:**
- Capital: ${c.capital || 'N/A'}
- Currency: ${c.currency_code || 'N/A'}
- Language: ${c.language || 'N/A'}
- Region: ${c.region || c.continent || 'N/A'}
- Timezone: ${facts.timezone || 'N/A'}
- Climate: ${facts.climate || 'N/A'}

**Cost of Living (Monthly):**
- Single Person: ${facts.cost_of_living_single || 'N/A'}
- Family: ${facts.cost_of_living_family || 'N/A'}

**Digital Nomad/Remote Worker:**
- Internet Speed: ${facts.internet_speed || 'N/A'}
- English Proficiency: ${facts.english_proficiency || 'N/A'}
- DN Visa Cost: ${facts.dn_visa_cost || 'N/A'}
- DN Visa Duration: ${facts.dn_visa_duration || 'N/A'}
- DN Income Requirement: ${facts.dn_visa_income_requirement || 'N/A'}

**Taxes:**
- Income Tax: ${facts.income_tax_rate || 'N/A'}
- Corporate Tax: ${facts.corporate_tax_rate || 'N/A'}

**Investment/Golden Visa:**
- Golden Visa Investment: ${facts.golden_visa_investment || 'N/A'}
- Property Purchase for Foreigners: ${facts.property_purchase_foreigners || 'N/A'}

**Retirement:**
- Retirement Visa Income Requirement: ${facts.retirement_visa_income || 'N/A'}

**Healthcare:** ${facts.healthcare_quality || 'N/A'}

**Relocation Types:** ${c.relocation_motivations?.join(', ') || 'Various'}
`;
      });
    }

    // Articles - with FULL links
    if (articles.length > 0) {
      dataContext += '\n\n## ARTICLES & GUIDES (Create clickable card links to ALL of these):\n';
      dataContext += 'IMPORTANT: Display these as a grid of clickable cards with titles and descriptions.\n';
      dataContext += 'All links are internal to relocation.quest\n\n';
      articles.forEach((a: any, i: number) => {
        const imageUrl = a.hero_asset_url || a.featured_asset_url || '';
        dataContext += `${i + 1}. **${a.title}**
   - Link: /${a.slug}
   - Description: ${a.excerpt || a.meta_description || 'Comprehensive guide'}
   ${imageUrl ? `- Image: ${imageUrl}` : ''}
`;
      });
    }

    // Hub content - comprehensive guide
    if (hubs.length > 0) {
      dataContext += '\n\n## COMPREHENSIVE RELOCATION GUIDES (Feature these prominently):\n';
      hubs.forEach((h: any) => {
        dataContext += `
### ${h.title}
- Link: /${h.slug}
- Description: ${h.meta_description || 'Complete relocation guide'}
- Focus: ${h.primary_keyword || 'Relocation'}
`;
        if (h.payload?.highlights) {
          dataContext += `- Key Highlights: ${JSON.stringify(h.payload.highlights)}\n`;
        }
      });
    }

    // Check if we have any data at all
    const hasData = articles.length > 0 || countries.length > 0 || hubs.length > 0;
    const hasCountryData = countries.length > 0;
    const hasArticleData = articles.length > 0;

    // Build the system prompt for rich UI generation
    const systemPrompt = `You are the Relocation.Quest AI assistant powered by Thesys C1 Generative UI.

CRITICAL RULE: You can ONLY use information from the DATABASE CONTENT below.
DO NOT use any external knowledge, training data, or make up information.
If the database has no information about something, you MUST say "We don't have information about [topic] in our database yet."

${hasData ? `## DATABASE CONTENT (USE ONLY THIS):
${dataContext}` : `## NO DATA FOUND
We searched our database but found no information matching the user's query.`}

## UI GENERATION RULES:

${hasCountryData ? `**COUNTRY DATA DISPLAY:**
Create a comprehensive country card showing:
- Large flag emoji and country name as header
- Organized sections with icons:
  📍 Basic Info (capital, timezone, climate, language)
  💰 Cost of Living (show both single and family costs clearly)
  💻 Digital Nomad Info (internet speed, visa cost, income requirements)
  📊 Tax Rates (create a simple comparison showing income vs corporate tax)
  🏠 Investment/Golden Visa (investment amounts, property rules)
  🏥 Healthcare quality
  ✈️ Relocation Types suited for this country` : ''}

${hasArticleData ? `**ARTICLES & GUIDES DISPLAY:**
Create a grid of clickable article cards:
- Each card should have the article title as a heading
- Show the description/excerpt
- Include a clear "Read Guide →" link button
- Group related articles together (visa guides, cost guides, etc.)
- SHOW ALL ${articles.length} ARTICLES - don't skip any!` : ''}

${hubs.length > 0 ? `**FEATURED GUIDE:**
Prominently display the comprehensive relocation guide at the top with a special "Featured" badge.` : ''}

**CHARTS & COMPARISONS:**
When showing costs or comparing data, create:
- Bar charts for cost of living comparisons
- Tables for visa requirements
- Progress bars for processing times
- Side-by-side comparisons when multiple countries are mentioned

${hasData ? `**STRUCTURE YOUR RESPONSE:**
1. Brief friendly intro (1-2 sentences)
2. Featured comprehensive guide (if available)
3. Country stats card with ALL the data provided
4. Grid of ALL article links
5. Call-to-action to explore more

IMPORTANT: Include EVERY article link provided - these are valuable internal resources.
DO NOT just list as bullet points - CREATE VISUAL, INTERACTIVE UI COMPONENTS.` : `**NO DATA RESPONSE:**
1. Create a friendly "No Data Found" card with a search icon
2. Clearly state: "We don't have information about [topic] in our database yet."
3. Suggest: "Try asking about Portugal, Spain, France, Thailand, or other popular destinations."
4. DO NOT make up any facts, statistics, or information`}`;

    // Prepare messages
    const enrichedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    console.log('[Neon Chat] Calling Thesys API...');

    // Call C1 API with streaming
    const stream = await c1Client.chat.completions.create({
      model: 'c1-exp/anthropic/claude-3.5-haiku/v-20250709',
      messages: enrichedMessages,
      stream: true,
    });

    console.log('[Neon Chat] Got stream, starting to read...');

    // Stream response
    const encoder = new TextEncoder();
    let chunkCount = 0;
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            chunkCount++;
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          console.log('[Neon Chat] Stream finished, chunks received:', chunkCount);
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[Neon Chat] Stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Neon Chat] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';

// Use Quest Gateway voice endpoint
const GATEWAY_URL = import.meta.env.GATEWAY_URL;

// UI Component types for our Generative UI
interface UIComponent {
  type: 'text' | 'country_card' | 'article_grid' | 'fact_list' | 'cost_chart' | 'timeline' | 'services' | 'sources' | 'cta_button';
  data: any;
}

interface SmartChatResponse {
  message: string;
  components: UIComponent[];
  sources: Array<{ title: string; url: string; id: string }>;
}

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
// Helper to get image URL - prefer hero_asset_url, fallback to MUX thumbnail
function getArticleImage(article: any): string | null {
  if (article.hero_asset_url) return article.hero_asset_url;
  if (article.featured_asset_url) return article.featured_asset_url;
  if (article.video_playback_id) {
    return `https://image.mux.com/${article.video_playback_id}/thumbnail.jpg?width=400&height=225&fit_mode=smartcrop`;
  }
  return null;
}

async function fetchArticles(countries: string[], limit = 8) {
  try {
    if (countries.length === 0) {
      const result = await sql`
        SELECT id, slug, title, excerpt, meta_description,
          featured_asset_url, hero_asset_url, country_code, country,
          video_playback_id
        FROM articles
        WHERE status = 'published' AND app = 'relocation'
        ORDER BY published_at DESC
        LIMIT ${limit}
      `;
      return result;
    }

    const searchPatterns = countries.map(c => `%${c.toLowerCase()}%`);
    const result = await sql`
      SELECT id, slug, title, excerpt, meta_description,
        featured_asset_url, hero_asset_url, country_code, country,
        video_playback_id
      FROM articles
      WHERE status = 'published' AND app = 'relocation'
        AND (
          LOWER(title) LIKE ANY(${searchPatterns})
          OR LOWER(slug) LIKE ANY(${searchPatterns})
          OR LOWER(country) LIKE ANY(${searchPatterns})
        )
      ORDER BY published_at DESC
      LIMIT ${limit}
    `;
    return result;
  } catch (err) {
    console.error('[SmartChat] Error fetching articles:', err);
    return [];
  }
}

// Fetch countries from Neon with MUX images
async function fetchCountries(countries: string[]) {
  try {
    if (countries.length === 0) return [];

    const searchPatterns = countries.map(c => `%${c.toLowerCase()}%`);
    // Fetch countries with their hub video for thumbnail
    const result = await sql`
      SELECT
        c.id, c.name, c.code, c.slug, c.flag_emoji, c.capital, c.currency_code,
        c.language, c.visa_types, c.tax_overview, c.facts, c.relocation_motivations,
        h.video_playback_id as hub_video_id
      FROM countries c
      LEFT JOIN country_hubs h ON h.country_code = c.code AND h.status = 'published'
      WHERE LOWER(c.name) LIKE ANY(${searchPatterns})
         OR LOWER(c.slug) LIKE ANY(${searchPatterns})
      LIMIT 3
    `;
    return result;
  } catch (err) {
    console.error('[SmartChat] Error fetching countries:', err);
    return [];
  }
}

// Get country image from MUX - try hub video, then article video
async function getCountryImage(countryCode: string): Promise<string | null> {
  try {
    // First try to get from an article with video
    const articleResult = await sql`
      SELECT video_playback_id
      FROM articles
      WHERE country_code = ${countryCode}
        AND status = 'published'
        AND app = 'relocation'
        AND video_playback_id IS NOT NULL
      ORDER BY published_at DESC
      LIMIT 1
    `;

    if (articleResult.length > 0 && articleResult[0].video_playback_id) {
      return `https://image.mux.com/${articleResult[0].video_playback_id}/thumbnail.jpg?width=800&height=450&fit_mode=smartcrop&time=5`;
    }

    return null;
  } catch (err) {
    console.error('[SmartChat] Error fetching country image:', err);
    return null;
  }
}

// Fetch user profile and facts
async function fetchUserData(stackUserId: string) {
  try {
    if (!stackUserId) return { profile: null, facts: [] };

    const [profileResult, factsResult] = await Promise.all([
      sql`
        SELECT id, first_name, last_name, email, current_country,
          destination_countries, budget_monthly, timeline, relocation_motivation
        FROM users WHERE neon_auth_id = ${stackUserId} LIMIT 1
      `,
      sql`
        SELECT fact_type, fact_value, confidence
        FROM user_profile_facts
        WHERE user_id = ${stackUserId} AND is_active = true
        ORDER BY confidence DESC
      `
    ]);

    return {
      profile: profileResult.length > 0 ? profileResult[0] : null,
      facts: factsResult
    };
  } catch (err) {
    console.error('[SmartChat] Error fetching user data:', err);
    return { profile: null, facts: [] };
  }
}

// Build structured data for LLM
function buildDataContext(countries: any[], articles: any[], userData: any) {
  const ctx: any = { countries: [], articles: [], user: null };

  countries.forEach(c => {
    const facts = c.facts || {};
    ctx.countries.push({
      name: c.name,
      flag: c.flag_emoji,
      capital: c.capital,
      currency: c.currency_code,
      language: c.language,
      slug: c.slug,
      facts: {
        costSingle: facts.cost_of_living_single,
        costFamily: facts.cost_of_living_family,
        dnVisaCost: facts.dn_visa_cost,
        dnVisaDuration: facts.dn_visa_duration,
        incomeTax: facts.income_tax_rate,
        internetSpeed: facts.internet_speed,
        healthcareQuality: facts.healthcare_quality,
        goldenVisaInvestment: facts.golden_visa_investment,
      },
      visaTypes: c.visa_types,
      motivations: c.relocation_motivations,
    });
  });

  articles.forEach(a => {
    ctx.articles.push({
      id: a.id,
      title: a.title,
      slug: a.slug,
      url: `https://relocation.quest/${a.slug}`,
      excerpt: a.excerpt || a.meta_description,
      image: a.hero_asset_url || a.featured_asset_url,
      country: a.country,
    });
  });

  if (userData.profile || userData.facts.length > 0) {
    const factsMap: Record<string, any> = {};
    userData.facts.forEach((f: any) => {
      factsMap[f.fact_type] = f.fact_value;
    });

    ctx.user = {
      name: userData.profile?.first_name || factsMap.name?.value || 'Guest',
      currentLocation: factsMap.current_location?.value || userData.profile?.current_country,
      destination: factsMap.destination?.value || userData.profile?.destination_countries?.[0],
      budget: factsMap.budget?.value || userData.profile?.budget_monthly,
      timeline: factsMap.timeline?.value || userData.profile?.timeline,
      workType: factsMap.work_type?.value,
    };
  }

  return ctx;
}

// System prompt for structured JSON responses
const SYSTEM_PROMPT = `You are the Relocation.Quest AI assistant. Your job is to help users with relocation questions using ONLY data from the provided database context.

CRITICAL: You MUST respond with a valid JSON object following this exact structure:
{
  "greeting": "A warm, personalized greeting if user data available, otherwise a friendly generic greeting",
  "mainText": "Your main response text - helpful, informative, conversational. Reference the data provided.",
  "components": [
    // Country info card - include ALL the data provided
    { "type": "country_card", "data": { "name": "France", "flag": "🇫🇷", "capital": "Paris", "currency": "EUR", "language": "French", "slug": "france", "facts": { "costSingle": "€2,500/mo", "dnVisaCost": "€99" } } },

    // Grid of article links - include up to 4 relevant articles
    { "type": "article_grid", "data": { "articles": [{ "title": "...", "url": "https://relocation.quest/...", "image": "...", "excerpt": "..." }] } },

    // Key facts list with sources
    { "type": "fact_list", "data": { "title": "Key Facts", "facts": [{ "label": "Cost of Living", "value": "€2,500/mo", "icon": "💰" }] } },

    // Timeline/steps
    { "type": "timeline", "data": { "title": "Relocation Steps", "steps": [{ "title": "Research", "description": "..." }] } },

    // Services/recommendations
    { "type": "services", "data": { "services": [{ "name": "SafetyWing", "type": "Insurance", "url": "https://safetywing.com", "icon": "🏥" }] } },

    // Call-to-action button
    { "type": "cta_button", "data": { "text": "Explore France Guide", "url": "https://relocation.quest/france" } }
  ],
  "sources": [
    { "title": "Article Title", "url": "https://relocation.quest/slug", "id": "article-123" }
  ],
  "followUp": "A suggested follow-up question the user might want to ask"
}

RULES:
1. ONLY use data from the provided context. Do not make up facts or URLs.
2. Include at least one article_grid component with 2-4 articles if articles are provided.
3. Include country_card for each country in the context with ALL their data.
4. Always include sources for articles/guides referenced.
5. Be conversational but concise in mainText.
6. If user profile is provided, personalize the greeting and advice.
7. All URLs must be complete (https://relocation.quest/...).

Respond ONLY with valid JSON. No markdown, no explanation, no code blocks, just the raw JSON object.`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages, userId } = body;

    const stackUserId = request.headers.get('x-stack-user-id') || userId;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get latest user message
    const latestUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    const userQuery = latestUserMessage?.content || '';

    console.log('[SmartChat] Query:', userQuery);

    // Extract countries mentioned
    const mentionedCountries = extractCountries(userQuery);
    console.log('[SmartChat] Countries:', mentionedCountries);

    // Fetch all data in parallel
    const [articles, countries, userData] = await Promise.all([
      fetchArticles(mentionedCountries, 8),
      fetchCountries(mentionedCountries),
      stackUserId ? fetchUserData(stackUserId) : Promise.resolve({ profile: null, facts: [] }),
    ]);

    // Add user's destination countries if no specific country mentioned
    if (mentionedCountries.length === 0 && userData.profile?.destination_countries?.length > 0) {
      const destCountries = await fetchCountries(userData.profile.destination_countries);
      countries.push(...destCountries);
    }

    console.log('[SmartChat] Articles:', articles.length, 'Countries:', countries.length);

    // Build structured context
    const dataContext = buildDataContext(countries, articles, userData);

    // Call Quest Gateway for conversational response
    console.log('[SmartChat] Calling Quest Gateway...');
    let conversationalResponse = '';

    try {
      const response = await fetch(`${GATEWAY_URL}/voice/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userQuery }],
          stream: false,
        }),
      });

      if (response.ok) {
        const responseText = await response.text();
        // Handle SSE format or direct JSON
        if (responseText.startsWith('data:')) {
          const lines = responseText.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.slice(5).trim());
                conversationalResponse += data.choices?.[0]?.delta?.content || '';
              } catch {}
            }
          }
        } else {
          try {
            const data = JSON.parse(responseText);
            conversationalResponse = data.response || data.choices?.[0]?.message?.content || '';
          } catch {
            conversationalResponse = responseText;
          }
        }
      }

      // Clean up the response - remove debug metadata
      if (conversationalResponse) {
        // Remove "---MEMORY---" and everything after it
        const memoryIndex = conversationalResponse.indexOf('---MEMORY---');
        if (memoryIndex !== -1) {
          conversationalResponse = conversationalResponse.substring(0, memoryIndex).trim();
        }
        // Remove "One moment while I check..." prefix if present
        conversationalResponse = conversationalResponse.replace(/^One moment while I check\.\.\.\s*/i, '').trim();
      }
    } catch (err) {
      console.error('[SmartChat] Gateway error:', err);
    }

    console.log('[SmartChat] Building UI components from Neon data...');

    // Build UI components directly from Neon data
    const components: UIComponent[] = [];
    const sources: Array<{ title: string; url: string; id: string }> = [];

    // Add country cards with MUX images
    for (const c of countries as any[]) {
      // Get image from hub video or article video
      let imageUrl: string | null = null;
      if (c.hub_video_id) {
        imageUrl = `https://image.mux.com/${c.hub_video_id}/thumbnail.jpg?width=800&height=450&fit_mode=smartcrop&time=5`;
      } else if (c.code) {
        imageUrl = await getCountryImage(c.code);
      }

      components.push({
        type: 'country_card',
        data: {
          name: c.name,
          flag: c.flag_emoji,
          capital: c.capital,
          currency: c.currency_code,
          language: c.language,
          slug: c.slug,
          facts: c.facts || {},
          image: imageUrl, // MUX thumbnail
        }
      });
    }

    // Add article grid if we have articles - deduplicate by title
    if (articles.length > 0) {
      const seenTitles = new Set<string>();
      const uniqueArticles = (articles as any[]).filter((a: any) => {
        const normalizedTitle = a.title.toLowerCase().trim();
        if (seenTitles.has(normalizedTitle)) return false;
        seenTitles.add(normalizedTitle);
        return true;
      });

      components.push({
        type: 'article_grid',
        data: {
          articles: uniqueArticles.slice(0, 4).map((a: any) => ({
            title: a.title,
            url: `https://relocation.quest/${a.slug}`,
            image: getArticleImage(a), // Uses MUX thumbnail as fallback
            excerpt: a.excerpt || a.meta_description,
            country: a.country,
          }))
        }
      });

      // Add to sources
      uniqueArticles.slice(0, 4).forEach((a: any) => {
        sources.push({
          title: a.title,
          url: `https://relocation.quest/${a.slug}`,
          id: `article-${a.id}`,
        });
      });
    }

    // Build response
    const userName = userData.profile?.first_name || 'there';
    const greeting = userData.profile ? `Hi ${userName}!` : 'Hello!';

    const result = {
      greeting,
      mainText: conversationalResponse || `Here's what I found about ${mentionedCountries.join(', ') || 'your query'}. Check out the resources below for more details.`,
      components,
      sources,
      followUp: countries.length > 0
        ? `What visa options are available in ${countries[0].name}?`
        : 'Which country are you considering for relocation?',
    };

    console.log('[SmartChat] Success, components:', components.length);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SmartChat] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
      message: "Sorry, I encountered an error. Please try again.",
      components: [],
      sources: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

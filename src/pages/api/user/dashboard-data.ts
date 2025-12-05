import type { APIRoute } from 'astro';
import { sql } from '../../../lib/db';

// Fetch user profile
async function fetchUserProfile(stackUserId: string) {
  try {
    const result = await sql`
      SELECT id, first_name, last_name, email,
        current_country, destination_countries,
        budget_monthly, timeline, relocation_motivation
      FROM users WHERE neon_auth_id = ${stackUserId} LIMIT 1
    `;
    return result.length > 0 ? result[0] : null;
  } catch (err) {
    console.error('[Dashboard] Error fetching user:', err);
    return null;
  }
}

// Fetch user profile facts
async function fetchUserFacts(stackUserId: string) {
  try {
    const result = await sql`
      SELECT fact_type, fact_value, confidence, is_user_verified, source
      FROM user_profile_facts
      WHERE user_id = ${stackUserId} AND is_active = true
      ORDER BY confidence DESC
    `;
    return result;
  } catch (err) {
    console.error('[Dashboard] Error fetching facts:', err);
    return [];
  }
}

// Fetch articles matching user's destinations
async function fetchRelevantArticles(destinations: string[], limit = 10) {
  try {
    if (!destinations || destinations.length === 0) {
      // Get recent articles if no destinations
      const result = await sql`
        SELECT id, slug, title, excerpt, meta_description,
          hero_asset_url, featured_asset_url, country_code, country,
          published_at
        FROM articles
        WHERE status = 'published' AND app = 'relocation'
        ORDER BY published_at DESC
        LIMIT ${limit}
      `;
      return result;
    }

    const searchPatterns = destinations.map(d => `%${d.toLowerCase()}%`);
    const result = await sql`
      SELECT id, slug, title, excerpt, meta_description,
        hero_asset_url, featured_asset_url, country_code, country,
        published_at
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
    console.error('[Dashboard] Error fetching articles:', err);
    return [];
  }
}

// Fetch country data for destinations
async function fetchCountryData(destinations: string[]) {
  try {
    if (!destinations || destinations.length === 0) return [];

    const searchPatterns = destinations.map(d => `%${d.toLowerCase()}%`);
    const result = await sql`
      SELECT id, name, slug, code, flag_emoji, capital, currency_code,
        language, visa_types, tax_overview, facts, relocation_motivations
      FROM countries
      WHERE LOWER(name) LIKE ANY(${searchPatterns})
         OR LOWER(slug) LIKE ANY(${searchPatterns})
    `;
    return result;
  } catch (err) {
    console.error('[Dashboard] Error fetching countries:', err);
    return [];
  }
}

// Fetch country hubs (detailed guides)
async function fetchCountryHubs(destinations: string[], limit = 5) {
  try {
    if (!destinations || destinations.length === 0) return [];

    const searchPatterns = destinations.map(d => `%${d.toLowerCase()}%`);
    const result = await sql`
      SELECT id, slug, title, meta_description, location_name,
        country_code, primary_keyword
      FROM country_hubs
      WHERE status = 'published'
        AND (
          LOWER(location_name) LIKE ANY(${searchPatterns})
          OR LOWER(title) LIKE ANY(${searchPatterns})
        )
      LIMIT ${limit}
    `;
    return result;
  } catch (err) {
    console.error('[Dashboard] Error fetching hubs:', err);
    return [];
  }
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const stackUserId = request.headers.get('x-stack-user-id');

    if (!stackUserId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile and facts first
    const [userProfile, userFacts] = await Promise.all([
      fetchUserProfile(stackUserId),
      fetchUserFacts(stackUserId),
    ]);

    // Parse facts into a map for easy access
    const factsMap: Record<string, any> = {};
    userFacts.forEach((f: any) => {
      factsMap[f.fact_type] = f.fact_value;
    });

    // Determine destinations from profile and facts
    const destinations: string[] = [];
    if (factsMap.destination?.value) {
      destinations.push(factsMap.destination.value);
    }
    if (factsMap.destination?.regions) {
      destinations.push(...factsMap.destination.regions);
    }
    if (userProfile?.destination_countries) {
      destinations.push(...userProfile.destination_countries);
    }
    // Remove duplicates
    const uniqueDestinations = [...new Set(destinations.map(d => d.toLowerCase()))];

    // Fetch content based on destinations
    const [articles, countries, hubs] = await Promise.all([
      fetchRelevantArticles(uniqueDestinations, 12),
      fetchCountryData(uniqueDestinations),
      fetchCountryHubs(uniqueDestinations, 5),
    ]);

    // Build personalized summary
    const summary = {
      userName: userProfile?.first_name || factsMap.name?.value || 'Guest',
      currentLocation: {
        country: factsMap.current_location?.value || userProfile?.current_country || null,
        city: factsMap.current_location?.city || null,
      },
      destination: {
        primary: factsMap.destination?.value || userProfile?.destination_countries?.[0] || null,
        regions: factsMap.destination?.regions || [],
        all: uniqueDestinations,
      },
      budget: {
        amount: factsMap.budget?.value || userProfile?.budget_monthly || null,
        currency: factsMap.budget?.currency || 'EUR',
      },
      timeline: factsMap.timeline?.value || userProfile?.timeline || null,
      workType: factsMap.work_type?.value || null,
      industry: factsMap.work_type?.industry || null,
      family: {
        status: factsMap.family?.value || null,
        hasChildren: factsMap.family?.children || false,
      },
      motivation: userProfile?.relocation_motivation || null,
    };

    // Format articles with full URLs
    const formattedArticles = articles.map((a: any) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      url: `https://relocation.quest/${a.slug}`,
      excerpt: a.excerpt || a.meta_description,
      image: a.hero_asset_url || a.featured_asset_url || null,
      country: a.country,
      publishedAt: a.published_at,
    }));

    // Format hubs with full URLs
    const formattedHubs = hubs.map((h: any) => ({
      id: h.id,
      title: h.title,
      slug: h.slug,
      url: `https://relocation.quest/${h.slug}`,
      description: h.meta_description,
      location: h.location_name,
    }));

    // Format countries
    const formattedCountries = countries.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      flag: c.flag_emoji,
      capital: c.capital,
      currency: c.currency_code,
      language: c.language,
      facts: c.facts || {},
      visaTypes: c.visa_types,
    }));

    return new Response(JSON.stringify({
      summary,
      articles: formattedArticles,
      countries: formattedCountries,
      hubs: formattedHubs,
      factsCount: userFacts.length,
      hasProfile: !!userProfile,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

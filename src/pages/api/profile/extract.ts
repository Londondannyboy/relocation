import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = import.meta.env.DATABASE_URL;
const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;

const sql = neon(DATABASE_URL);

// Initialize OpenAI for extraction
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Profile schema - Pydantic-style validation
interface UserProfile {
  current_country?: string;
  current_city?: string;
  nationality?: string;
  destination_countries?: string[];
  relocation_priority?: number;
  age_range?: string;
  relationship_status?: string;
  has_children?: boolean;
  number_of_children?: number;
  children_ages?: string[];
  employment_status?: string;
  remote_work?: boolean;
  industry?: string;
  job_title?: string;
  income_range?: string;
  budget_monthly?: number;
  relocation_motivation?: string[];
  timeline?: string;
  current_visa_status?: string;
  passport_countries?: string[];
  language_requirements?: string[];
  climate_preference?: string;
  healthcare_priority?: number;
  safety_priority?: number;
  cost_priority?: number;
  needs_health_insurance?: boolean;
  needs_pet_relocation?: boolean;
  has_pets?: boolean;
  pet_types?: string[];
}

// Standardize country names
async function standardizeCountry(input: string): Promise<{ name: string; flag: string } | null> {
  if (!input) return null;

  const result = await sql`
    SELECT standard_name, flag_emoji
    FROM country_standards
    WHERE LOWER(variant) = LOWER(${input.trim()})
    LIMIT 1
  `;

  if (result.length > 0) {
    return { name: result[0].standard_name, flag: result[0].flag_emoji };
  }

  // If not found in lookup, capitalize properly
  return {
    name: input.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
    flag: '🌍'
  };
}

// Extract profile from conversation using AI
async function extractProfileFromConversation(
  messages: Array<{ role: string; content: string }>,
  existingProfile?: UserProfile
): Promise<Partial<UserProfile>> {
  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are a profile extraction assistant. Extract structured user profile data from the conversation.

ONLY extract information that is EXPLICITLY stated or clearly implied. Do NOT make assumptions.

Return a JSON object with ONLY the fields that have data. Use these exact field names:

{
  "current_country": "string - where they currently live",
  "current_city": "string - specific city",
  "nationality": "string - their citizenship/passport country",
  "destination_countries": ["array of countries they want to move to"],
  "relocation_priority": "1-5 how urgent/important",
  "age_range": "25-34, 35-44, 45-54, 55-64, 65+",
  "relationship_status": "single, married, partnered, divorced, widowed",
  "has_children": "boolean",
  "number_of_children": "integer",
  "children_ages": ["array of ages as strings"],
  "employment_status": "employed, self-employed, freelance, unemployed, retired, student",
  "remote_work": "boolean - can they work remotely",
  "industry": "string - tech, finance, healthcare, education, etc.",
  "job_title": "string",
  "income_range": "under-50k, 50k-100k, 100k-200k, 200k+",
  "budget_monthly": "integer - monthly budget in USD",
  "relocation_motivation": ["array: cost, weather, lifestyle, tax, safety, adventure, family, work, healthcare, retirement"],
  "timeline": "asap, 3-6months, 6-12months, 1-2years, exploring",
  "current_visa_status": "citizen, resident, work-visa, tourist, none",
  "passport_countries": ["array of passport/citizenship countries"],
  "language_requirements": ["array of languages they speak or need"],
  "climate_preference": "tropical, mediterranean, temperate, cold, any",
  "healthcare_priority": "1-5",
  "safety_priority": "1-5",
  "cost_priority": "1-5",
  "needs_health_insurance": "boolean",
  "needs_pet_relocation": "boolean",
  "has_pets": "boolean",
  "pet_types": ["array: dog, cat, etc."]
}

${existingProfile ? `\nExisting profile data (only update fields with NEW information):\n${JSON.stringify(existingProfile, null, 2)}` : ''}

Return ONLY valid JSON. No markdown, no explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract profile data from this conversation:\n\n${conversationText}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[Profile Extract] AI extraction error:', err);
  }

  return {};
}

// Upsert profile to database
async function upsertProfile(userId: string, appId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
  // Standardize country fields
  if (profile.current_country) {
    const std = await standardizeCountry(profile.current_country);
    if (std) profile.current_country = std.name;
  }

  if (profile.destination_countries) {
    const standardized = await Promise.all(
      profile.destination_countries.map(async (c) => {
        const std = await standardizeCountry(c);
        return std?.name || c;
      })
    );
    profile.destination_countries = standardized;
  }

  if (profile.nationality) {
    const std = await standardizeCountry(profile.nationality);
    if (std) profile.nationality = std.name;
  }

  // Build update fields dynamically
  const updateFields: string[] = [];
  const values: any[] = [userId, appId];
  let paramIndex = 3;

  const fieldMappings: Record<string, string> = {
    current_country: 'current_country',
    current_city: 'current_city',
    nationality: 'nationality',
    destination_countries: 'destination_countries',
    relocation_priority: 'relocation_priority',
    age_range: 'age_range',
    relationship_status: 'relationship_status',
    has_children: 'has_children',
    number_of_children: 'number_of_children',
    children_ages: 'children_ages',
    employment_status: 'employment_status',
    remote_work: 'remote_work',
    industry: 'industry',
    job_title: 'job_title',
    income_range: 'income_range',
    budget_monthly: 'budget_monthly',
    relocation_motivation: 'relocation_motivation',
    timeline: 'timeline',
    current_visa_status: 'current_visa_status',
    passport_countries: 'passport_countries',
    language_requirements: 'language_requirements',
    climate_preference: 'climate_preference',
    healthcare_priority: 'healthcare_priority',
    safety_priority: 'safety_priority',
    cost_priority: 'cost_priority',
    needs_health_insurance: 'needs_health_insurance',
    needs_pet_relocation: 'needs_pet_relocation',
    has_pets: 'has_pets',
    pet_types: 'pet_types',
  };

  for (const [key, dbField] of Object.entries(fieldMappings)) {
    if (profile[key as keyof UserProfile] !== undefined) {
      updateFields.push(`${dbField} = $${paramIndex}`);
      values.push(profile[key as keyof UserProfile]);
      paramIndex++;
    }
  }

  // Always update timestamp
  updateFields.push(`updated_at = NOW()`);

  if (updateFields.length === 1) {
    // No fields to update, just return existing
    const existing = await sql`
      SELECT * FROM user_profiles WHERE user_id = ${userId}
    `;
    return existing[0] as UserProfile || {};
  }

  // Upsert query
  const insertFields = Object.keys(fieldMappings).filter(k => profile[k as keyof UserProfile] !== undefined);

  const result = await sql`
    INSERT INTO user_profiles (user_id, app_id, ${sql.unsafe(insertFields.join(', '))}, created_at, updated_at)
    VALUES (${userId}, ${appId}, ${sql.unsafe(insertFields.map((_, i) => `$${i + 3}`).join(', '))}, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
    ${sql.unsafe(updateFields.join(', '))}
    RETURNING *
  `.catch(async () => {
    // Fallback: try simple update
    await sql`
      UPDATE user_profiles
      SET ${sql.unsafe(updateFields.join(', '))}
      WHERE user_id = ${userId}
    `;
    const updated = await sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`;
    return updated;
  });

  return (result[0] as UserProfile) || {};
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { user_id, app_id = 'relocation', messages, session_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get existing profile
    const existingResult = await sql`
      SELECT * FROM user_profiles WHERE user_id = ${user_id}
    `;
    const existingProfile = existingResult[0] as UserProfile | undefined;

    // Extract new profile data from conversation
    let extractedProfile: Partial<UserProfile> = {};
    if (messages && messages.length > 0) {
      extractedProfile = await extractProfileFromConversation(messages, existingProfile);
    }

    // Merge and upsert
    const mergedProfile = { ...existingProfile, ...extractedProfile };
    const savedProfile = await upsertProfile(user_id, app_id, mergedProfile);

    return new Response(JSON.stringify({
      success: true,
      profile: savedProfile,
      extracted: extractedProfile,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Profile Extract] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// GET endpoint to fetch profile
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await sql`
      SELECT * FROM user_profiles WHERE user_id = ${userId}
    `;

    // Get country flags for display
    const profile = result[0] as UserProfile | undefined;

    if (profile?.current_country) {
      const std = await standardizeCountry(profile.current_country);
      if (std) {
        (profile as any).current_country_flag = std.flag;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      profile: profile || null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Profile Get] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

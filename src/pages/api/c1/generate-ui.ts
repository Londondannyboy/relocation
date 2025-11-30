import type { APIRoute } from 'astro';
import OpenAI from 'openai';

const THESYS_API_KEY = import.meta.env.THESYS_API_KEY;
const GATEWAY_URL = import.meta.env.GATEWAY_URL || 'https://quest-gateway-production.up.railway.app';
const APP_ID = import.meta.env.APP_ID || 'relocation';

// Initialize OpenAI client for C1 API (OpenAI-compatible)
const c1Client = new OpenAI({
  apiKey: THESYS_API_KEY,
  baseURL: 'https://api.thesys.dev/v1/embed',
});

// Fetch ZEP memory/context for the user
async function fetchZepContext(userId: string, sessionId: string): Promise<string> {
  try {
    const response = await fetch(`${GATEWAY_URL}/memory/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        app_id: APP_ID,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.context || '';
    }
  } catch (err) {
    console.error('[C1 Generate UI] Failed to fetch ZEP context:', err);
  }
  return '';
}

// Fetch rich data from Neon DB for UI generation
async function fetchRelatedData(query: string, userId: string): Promise<any> {
  try {
    const response = await fetch(`${GATEWAY_URL}/voice/related-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        user_id: userId,
        app_id: APP_ID,
      }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.error('[C1 Generate UI] Failed to fetch related data:', err);
  }
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { query, conversationContext, userId, sessionId } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch ZEP memory (conversation history and user facts)
    const zepContext = userId ? await fetchZepContext(userId, sessionId || 'default') : '';

    // Fetch rich data from database
    const relatedData = await fetchRelatedData(query, userId || 'anonymous');

    // Build rich context for UI generation
    let dataContext = '';

    if (relatedData) {
      // Articles with images
      if (relatedData.articles?.length > 0) {
        dataContext += '\n## Available Articles (use these to create article cards with images):\n';
        relatedData.articles.forEach((a: any, i: number) => {
          dataContext += `${i + 1}. "${a.title}" - ${a.url}`;
          if (a.image_url) dataContext += ` [image: ${a.image_url}]`;
          if (a.excerpt) dataContext += `\n   Summary: ${a.excerpt}`;
          dataContext += '\n';
        });
      }

      // Cost of living data
      if (relatedData.cost_of_living) {
        dataContext += '\n## Cost of Living Data (use for charts/comparisons):\n';
        dataContext += JSON.stringify(relatedData.cost_of_living, null, 2);
      }

      // Country facts
      if (relatedData.categorized_facts) {
        dataContext += '\n## Country Facts (use for fact cards/lists):\n';
        for (const [category, info] of Object.entries(relatedData.categorized_facts)) {
          const catInfo = info as { label: string; facts: string[] };
          dataContext += `### ${catInfo.label}\n`;
          catInfo.facts.forEach((fact: string) => {
            dataContext += `- ${fact}\n`;
          });
        }
      }

      // Countries mentioned
      if (relatedData.countries?.length > 0) {
        dataContext += '\n## Related Countries:\n';
        relatedData.countries.forEach((c: any) => {
          dataContext += `- ${c.flag || '🌍'} ${c.name}`;
          if (c.visa_types) dataContext += ` (Visa types: ${c.visa_types.join(', ')})`;
          dataContext += '\n';
        });
      }

      // Visa information
      if (relatedData.visa_info) {
        dataContext += '\n## Visa Information:\n';
        dataContext += JSON.stringify(relatedData.visa_info, null, 2);
      }
    }

    // Build the system prompt for generating beautiful UI
    const systemPrompt = `You are a UI generator for Relocation.Quest, a platform helping people move abroad.
Your job is to create beautiful, interactive UI components based on the user's voice query.

${zepContext ? `## User Context from Memory:\n${zepContext}\n` : ''}

${dataContext}

## UI Generation Guidelines:

1. **Article Cards**: When showing articles, use attractive cards with:
   - Title with link
   - Featured image if available
   - Short excerpt
   - Read time or category badge

2. **Cost Comparison Charts**: When discussing costs, create:
   - Bar charts comparing cities/countries
   - Monthly budget breakdowns
   - Visual comparisons with current location

3. **Country Info Cards**: For country queries, show:
   - Country flag and name
   - Key facts in a grid
   - Visa requirements summary
   - Quality of life indicators

4. **Fact Panels**: Display facts in:
   - Organized sections by category
   - Bullet points with icons
   - Highlighted key statistics

5. **Action Items**: Include:
   - Next steps the user can take
   - Links to relevant guides
   - Save/bookmark buttons

## Important:
- Generate rich, interactive UI - not just text
- Use the data provided to populate real information
- Make it visually appealing for someone planning relocation
- Include images when URLs are available
- Create charts for numerical comparisons
- Always include actionable next steps`;

    // Build messages for C1
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation context if provided
    if (conversationContext?.length > 0) {
      conversationContext.forEach((msg: { role: string; content: string }) => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });
    }

    // Add the current query
    messages.push({
      role: 'user',
      content: `Generate a beautiful, informative UI panel for this voice query: "${query}"\n\nUse the data provided to create visually rich components with real information. Include article cards, charts, facts, and actionable next steps.`,
    });

    // Call C1 API with streaming (using Haiku for cost efficiency)
    const stream = await c1Client.chat.completions.create({
      model: 'c1-exp/anthropic/claude-3.5-haiku/v-20250709',
      messages,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[C1 Generate UI] Stream error:', err);
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
    console.error('[C1 Generate UI] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

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
      // Articles with images - provide default images based on content
      if (relatedData.articles?.length > 0) {
        dataContext += '\n## ARTICLES - Display these as cards WITH IMAGES:\n';
        relatedData.articles.forEach((a: any, i: number) => {
          // Find a relevant image based on article content
          let imageUrl = a.image_url;
          if (!imageUrl) {
            const titleLower = (a.title || '').toLowerCase();
            if (titleLower.includes('portugal') || titleLower.includes('lisbon')) {
              imageUrl = 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400';
            } else if (titleLower.includes('spain') || titleLower.includes('barcelona') || titleLower.includes('madrid')) {
              imageUrl = 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400';
            } else if (titleLower.includes('thailand') || titleLower.includes('bangkok')) {
              imageUrl = 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400';
            } else if (titleLower.includes('dubai') || titleLower.includes('uae')) {
              imageUrl = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400';
            } else if (titleLower.includes('digital nomad') || titleLower.includes('remote')) {
              imageUrl = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400';
            } else if (titleLower.includes('visa') || titleLower.includes('passport')) {
              imageUrl = 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=400';
            } else {
              imageUrl = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';
            }
          }
          dataContext += `\nARTICLE ${i + 1}:\n`;
          dataContext += `  Title: "${a.title}"\n`;
          dataContext += `  URL: ${a.url}\n`;
          dataContext += `  Image: ${imageUrl}\n`;
          if (a.excerpt) dataContext += `  Summary: ${a.excerpt}\n`;
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
    const systemPrompt = `You are a generative UI assistant for Relocation.Quest. Generate RICH, VISUAL UI components - NOT plain text responses.

${zepContext ? `## User Memory:\n${zepContext}\n` : ''}

${dataContext}

## YOU MUST generate these visual components:

### 1. ARTICLE CARDS (when articles available):
\`\`\`
<article-card>
  <image src="[article_image_url]" alt="[title]" />
  <title>[Article Title]</title>
  <excerpt>[2-3 sentence summary]</excerpt>
  <link href="[url]">Read Guide →</link>
</article-card>
\`\`\`

### 2. COUNTRY INFO CARD:
\`\`\`
<country-card>
  <flag>[emoji flag]</flag>
  <name>[Country Name]</name>
  <stats>
    <stat label="Cost of Living">$X,XXX/month</stat>
    <stat label="Visa Options">X types</stat>
    <stat label="Language">English</stat>
  </stats>
</country-card>
\`\`\`

### 3. COMPARISON CHART (for costs/data):
\`\`\`
<bar-chart title="Monthly Cost Comparison">
  <bar label="London" value="3500" color="blue" />
  <bar label="Lisbon" value="2100" color="green" />
  <bar label="Bangkok" value="1200" color="orange" />
</bar-chart>
\`\`\`

### 4. FACT LIST:
\`\`\`
<fact-list title="Key Facts">
  <fact icon="📍">Location fact</fact>
  <fact icon="💰">Cost fact</fact>
  <fact icon="🛂">Visa fact</fact>
</fact-list>
\`\`\`

### 5. ACTION BUTTONS:
\`\`\`
<actions>
  <button href="/guides/portugal">View Full Guide</button>
  <button variant="secondary">Save to Profile</button>
</actions>
\`\`\`

## CRITICAL RULES:
- ALWAYS use image URLs when available in the data
- Create VISUAL layouts, not paragraphs of text
- Use real data from the context provided
- Include multiple component types for rich UX
- End with actionable next steps

Generate the UI now based on: "${query}"`;

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

    // Add the current query - keep it simple, system prompt has all instructions
    messages.push({
      role: 'user',
      content: query,
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

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
    console.error('[C1 Chat] Failed to fetch ZEP context:', err);
  }
  return '';
}

// Fetch relevant data from Neon DB based on user query
async function fetchRelatedData(query: string, userId: string): Promise<string> {
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
      const data = await response.json();
      // Format the data for context injection
      let context = '';

      if (data.categorized_facts) {
        for (const [category, info] of Object.entries(data.categorized_facts)) {
          const catInfo = info as { label: string; facts: string[] };
          context += `\n## ${catInfo.label}\n`;
          catInfo.facts.forEach((fact: string) => {
            context += `- ${fact}\n`;
          });
        }
      }

      if (data.articles?.length > 0) {
        context += '\n## Related Articles\n';
        data.articles.slice(0, 3).forEach((a: { title: string; url: string }) => {
          context += `- [${a.title}](${a.url})\n`;
        });
      }

      if (data.countries?.length > 0) {
        context += '\n## Related Countries\n';
        data.countries.forEach((c: { name: string; flag?: string }) => {
          context += `- ${c.flag || '🌍'} ${c.name}\n`;
        });
      }

      return context;
    }
  } catch (err) {
    console.error('[C1 Chat] Failed to fetch related data:', err);
  }
  return '';
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages, user, sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the latest user message for context enrichment
    const latestUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    const userQuery = latestUserMessage?.content || '';

    // Build user context string
    let userContext = '';
    if (user) {
      userContext = `
## Current User
- Name: ${user.displayName || 'Anonymous'}
- Email: ${user.primaryEmail || 'Not provided'}
- App: ${APP_ID}
- Session: ${sessionId || 'anonymous'}
`;
    }

    // Fetch ZEP memory (conversation history and user facts)
    const zepContext = user?.id ? await fetchZepContext(user.id, sessionId || 'default') : '';

    // Fetch related data from our database
    const relatedData = userQuery ? await fetchRelatedData(userQuery, user?.id || 'anonymous') : '';

    // Build the system prompt with all context
    const systemPrompt = `You are a helpful AI assistant for Relocation.Quest, specializing in international relocation, visas, immigration, and living abroad.

${userContext}

${zepContext ? `## Conversation Memory\n${zepContext}\n` : ''}

${relatedData ? `## Relevant Information\n${relatedData}\n` : ''}

## Instructions
- Generate interactive, helpful UI when appropriate (charts for cost comparisons, forms for user input, cards for country info)
- Be conversational but informative
- Use the related information to provide accurate, specific answers
- Remember previous context from the conversation
- When discussing countries, show relevant visa requirements, cost of living, and practical tips
- Always cite sources when providing specific data
- Create actionable next steps when possible`;

    // Prepare messages with system prompt
    const enrichedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Call C1 API with streaming (using Haiku for cost efficiency)
    const stream = await c1Client.chat.completions.create({
      model: 'c1-exp/anthropic/claude-3.5-haiku/v-20250709',
      messages: enrichedMessages,
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
              // Format as SSE
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[C1 Chat] Stream error:', err);
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
    console.error('[C1 Chat] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

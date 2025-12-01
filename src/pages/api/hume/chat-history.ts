import type { APIRoute } from 'astro';

const HUME_API_KEY = process.env.HUME_API_KEY || import.meta.env.HUME_API_KEY;

interface ChatEvent {
  type: string;
  role?: string;
  messageText?: string;
  timestamp: number;
  emotionFeatures?: Record<string, number>;
}

interface TranscriptLine {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  emotions?: Record<string, number>;
}

// Fetch chat events from Hume API
async function fetchChatEvents(chatId: string): Promise<ChatEvent[]> {
  const allEvents: ChatEvent[] = [];
  let pageNumber = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://api.hume.ai/v0/evi/chats/${chatId}/events?page_number=${pageNumber}&page_size=100`,
      {
        headers: {
          'X-Hume-Api-Key': HUME_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('[Hume Chat History] API error:', response.status, await response.text());
      break;
    }

    const data = await response.json();
    const events = data.events_page || [];

    if (events.length === 0) {
      hasMore = false;
    } else {
      allEvents.push(...events);
      pageNumber++;
      // Safety limit
      if (pageNumber > 10) hasMore = false;
    }
  }

  return allEvents;
}

// List recent chats for a custom session ID
async function listChatsForSession(customSessionId: string): Promise<any[]> {
  const response = await fetch(
    `https://api.hume.ai/v0/evi/chats?page_number=0&page_size=50&ascending_order=false`,
    {
      headers: {
        'X-Hume-Api-Key': HUME_API_KEY,
      },
    }
  );

  if (!response.ok) {
    console.error('[Hume Chat History] List chats error:', response.status);
    return [];
  }

  const data = await response.json();
  const chats = data.chats_page || [];

  // Filter by custom session ID if provided
  if (customSessionId) {
    return chats.filter((chat: any) =>
      chat.metadata?.custom_session_id === customSessionId
    );
  }

  return chats;
}

// Convert events to readable transcript
function generateTranscript(events: ChatEvent[]): TranscriptLine[] {
  const relevantEvents = events.filter(
    (event) => event.type === 'USER_MESSAGE' || event.type === 'AGENT_MESSAGE'
  );

  return relevantEvents.map((event) => ({
    role: event.role === 'USER' ? 'user' : 'assistant',
    text: event.messageText || '',
    timestamp: new Date(event.timestamp).toLocaleString(),
    emotions: event.emotionFeatures,
  }));
}

// GET endpoint - fetch chat history
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chat_id');
    const sessionId = url.searchParams.get('session_id');

    if (!HUME_API_KEY) {
      return new Response(JSON.stringify({ error: 'Hume API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If chat_id provided, get events for that specific chat
    if (chatId) {
      const events = await fetchChatEvents(chatId);
      const transcript = generateTranscript(events);

      return new Response(JSON.stringify({
        success: true,
        chat_id: chatId,
        transcript,
        event_count: events.length,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If session_id provided, list chats for that session
    if (sessionId) {
      const chats = await listChatsForSession(sessionId);

      return new Response(JSON.stringify({
        success: true,
        session_id: sessionId,
        chats,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Otherwise list recent chats
    const chats = await listChatsForSession('');

    return new Response(JSON.stringify({
      success: true,
      chats: chats.slice(0, 10),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Hume Chat History] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

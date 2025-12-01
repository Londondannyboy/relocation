import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

interface GraphNode {
  id: string;
  label: string;
  group: string;
  title?: string;
  size?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
  title?: string;
}

// Convert user profile facts to graph format for vis-network
function profileToGraph(userId: string, profile: any, facts: any[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Central user node
  const userNodeId = `user_${userId}`;
  nodes.push({
    id: userNodeId,
    label: 'You',
    group: 'user',
    size: 40,
  });

  // Add profile-based nodes
  if (profile?.current_city || profile?.current_country) {
    const locationId = `origin_${userId}`;
    const locationLabel = [profile.current_city, profile.current_country].filter(Boolean).join(', ');
    nodes.push({
      id: locationId,
      label: locationLabel,
      group: 'location',
      title: `Current location: ${locationLabel}`,
    });
    edges.push({
      from: userNodeId,
      to: locationId,
      label: 'FROM',
      title: 'Currently based in',
    });
  }

  // Destination countries
  if (profile?.destination_countries && Array.isArray(profile.destination_countries)) {
    profile.destination_countries.forEach((country: string, i: number) => {
      const destId = `dest_${i}_${userId}`;
      nodes.push({
        id: destId,
        label: country,
        group: 'destination',
        title: `Interested in relocating to ${country}`,
      });
      edges.push({
        from: userNodeId,
        to: destId,
        label: 'INTERESTED_IN',
        title: 'Considering relocation to',
      });
    });
  }

  // Employment
  if (profile?.job_title || profile?.industry) {
    const workId = `work_${userId}`;
    const workLabel = profile.job_title || profile.industry;
    nodes.push({
      id: workId,
      label: workLabel,
      group: 'work',
      title: `Works as ${workLabel}`,
    });
    edges.push({
      from: userNodeId,
      to: workId,
      label: 'WORKS_AS',
      title: 'Profession',
    });
  }

  // Remote work capability
  if (profile?.remote_work) {
    const remoteId = `remote_${userId}`;
    nodes.push({
      id: remoteId,
      label: 'Remote Work',
      group: 'work',
      title: 'Can work remotely',
    });
    edges.push({
      from: userNodeId,
      to: remoteId,
      label: 'CAN_DO',
      title: 'Work flexibility',
    });
  }

  // Budget
  if (profile?.budget_monthly) {
    const budgetId = `budget_${userId}`;
    nodes.push({
      id: budgetId,
      label: `$${profile.budget_monthly}/mo`,
      group: 'budget',
      title: `Monthly budget: $${profile.budget_monthly}`,
    });
    edges.push({
      from: userNodeId,
      to: budgetId,
      label: 'HAS_BUDGET',
      title: 'Financial capacity',
    });
  }

  // Timeline
  if (profile?.timeline) {
    const timelineId = `timeline_${userId}`;
    const timelineLabels: Record<string, string> = {
      'asap': 'ASAP',
      '3-6months': '3-6 months',
      '6-12months': '6-12 months',
      '1-2years': '1-2 years',
      'exploring': 'Exploring',
    };
    nodes.push({
      id: timelineId,
      label: timelineLabels[profile.timeline] || profile.timeline,
      group: 'timeline',
      title: `Moving timeline: ${timelineLabels[profile.timeline] || profile.timeline}`,
    });
    edges.push({
      from: userNodeId,
      to: timelineId,
      label: 'TIMELINE',
      title: 'When planning to move',
    });
  }

  // Motivations
  if (profile?.relocation_motivation && Array.isArray(profile.relocation_motivation)) {
    profile.relocation_motivation.forEach((motive: string, i: number) => {
      const motiveId = `motive_${i}_${userId}`;
      nodes.push({
        id: motiveId,
        label: motive.charAt(0).toUpperCase() + motive.slice(1),
        group: 'motivation',
        title: `Motivation: ${motive}`,
      });
      edges.push({
        from: userNodeId,
        to: motiveId,
        label: 'MOTIVATED_BY',
        title: 'Reason for relocation',
      });
    });
  }

  // Add fact-based nodes (from user_profile_facts table)
  facts.forEach((fact, i) => {
    const factId = `fact_${fact.id || i}_${userId}`;
    const value = fact.fact_value?.value || fact.fact_value?.country || JSON.stringify(fact.fact_value);

    // Skip if already covered by profile
    if (fact.fact_type === 'destination' && profile?.destination_countries?.includes(value)) {
      return;
    }

    nodes.push({
      id: factId,
      label: value,
      group: fact.fact_type,
      title: `${fact.fact_type}: ${value} (${Math.round(fact.confidence * 100)}% confident)`,
    });
    edges.push({
      from: userNodeId,
      to: factId,
      label: fact.fact_type.toUpperCase(),
      title: fact.extracted_from_message || fact.fact_type,
    });
  });

  return { nodes, edges };
}

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

    // Fetch profile
    let profile = null;
    try {
      const profileResult = await sql`
        SELECT * FROM user_profiles WHERE user_id = ${userId}
      `;
      profile = profileResult[0] || null;
    } catch (err) {
      console.error('[User Graph] Failed to fetch profile:', err);
    }

    // Fetch facts (if table exists)
    let facts: any[] = [];
    try {
      const factsResult = await sql`
        SELECT * FROM user_profile_facts
        WHERE user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = ${userId})
        AND is_active = true
        ORDER BY created_at DESC
      `;
      facts = factsResult;
    } catch (err) {
      // Table might not exist or user has no facts
      console.log('[User Graph] No facts found or table does not exist');
    }

    // Convert to graph format
    const graph = profileToGraph(userId, profile, facts);

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      nodes: graph.nodes,
      edges: graph.edges,
      node_count: graph.nodes.length,
      edge_count: graph.edges.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[User Graph] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

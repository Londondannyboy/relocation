import { useState, useEffect, useRef, useCallback } from "react";
import { StackProvider, StackTheme, useUser, UserButton } from "@stackframe/react";
import { stackClientApp } from "../stack/client";
import ForceGraph2D from "react-force-graph-2d";

const GATEWAY_URL = import.meta.env.PUBLIC_GATEWAY_URL || "https://quest-gateway-production.up.railway.app";

interface Fact {
  id: number;
  fact_type: string;
  fact_value: { value: string };
  confidence: number;
  source: string;
  is_active: boolean;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  color: string;
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

function ProfileContent() {
  const user = useUser();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [zepContext, setZepContext] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const graphRef = useRef<any>();

  // Fetch facts when user is available
  useEffect(() => {
    if (user?.id) {
      fetchFacts();
    }
  }, [user?.id]);

  // Build graph from facts
  useEffect(() => {
    if (facts.length > 0 && user?.id) {
      buildGraphFromFacts();
    }
  }, [facts, user?.id]);

  const buildGraphFromFacts = () => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Color mapping for entity types
    const colors: Record<string, string> = {
      user: "#6366f1",
      destination: "#10b981",
      origin: "#f59e0b",
      work_type: "#3b82f6",
      family: "#ec4899",
      motivation: "#8b5cf6",
      budget: "#14b8a6",
      timeline: "#f97316"
    };

    // Add user node
    const userId = `user_${user?.id}`;
    nodes.push({
      id: userId,
      name: user?.displayName || "You",
      type: "user",
      color: colors.user,
      val: 20
    });

    // Add fact nodes and links
    facts.forEach((fact) => {
      const factId = `${fact.fact_type}_${fact.id}`;
      const value = fact.fact_value?.value || JSON.stringify(fact.fact_value);

      nodes.push({
        id: factId,
        name: value,
        type: fact.fact_type,
        color: colors[fact.fact_type] || "#94a3b8",
        val: 10
      });

      // Edge labels based on fact type
      const edgeLabels: Record<string, string> = {
        destination: "interested in",
        origin: "located in",
        work_type: "works as",
        family: "has family",
        motivation: "motivated by",
        budget: "budget",
        timeline: "timeline"
      };

      links.push({
        source: userId,
        target: factId,
        label: edgeLabels[fact.fact_type] || fact.fact_type
      });
    });

    setGraphData({ nodes, links });
  };

  const fetchFacts = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${GATEWAY_URL}/user/profile/facts`, {
        headers: {
          "x-stack-user-id": user.id,
          "x-app-id": "relocation"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFacts(data.facts || []);
      } else if (response.status === 404) {
        setFacts([]);
      } else {
        setError("Failed to load facts");
      }
    } catch (e) {
      console.error("Error fetching facts:", e);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const syncToZep = async () => {
    if (!user?.id) return;
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch(`${GATEWAY_URL}/user/profile/sync-to-zep`, {
        method: "POST",
        headers: {
          "x-stack-user-id": user.id,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ app_id: "relocation" })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Sync result:", data);
        // Fetch ZEP context after sync
        await fetchZepContext();
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "Failed to sync to ZEP");
      }
    } catch (e) {
      console.error("Error syncing to ZEP:", e);
      setError("Failed to sync");
    } finally {
      setSyncing(false);
    }
  };

  const fetchZepContext = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/user/profile/zep-context?app_id=relocation`, {
        headers: {
          "x-stack-user-id": user.id
        }
      });

      if (response.ok) {
        const data = await response.json();
        setZepContext(data.context || "");
      }
    } catch (e) {
      console.error("Error fetching ZEP context:", e);
    }
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(2, 1000);
    }
  }, []);

  if (!user) {
    return (
      <div className="container">
        <h1>Not Signed In</h1>
        <p>You need to sign in to view this page.</p>
        <a href="/handler/sign-in" className="btn">Sign In</a>
        <br /><br />
        <a href="/">Back to Home</a>
      </div>
    );
  }

  const factTypeLabels: Record<string, string> = {
    destination: "Interested Destinations",
    origin: "Current Location",
    work_type: "Work Style",
    family: "Family Status",
    motivation: "Motivations",
    budget: "Budget",
    timeline: "Timeline",
    visa: "Visa Interest"
  };

  return (
    <div className="container">
      <h1>Your Profile</h1>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <UserButton />
        <a
          href="/voice"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '24px',
            textDecoration: 'none',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
          }}
        >
          <span style={{ fontSize: '20px' }}>🎤</span>
          Talk to AI
        </a>
      </div>

      <div className="user-info">
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Email:</strong> {user.primaryEmail || 'No email'}</p>
        <p><strong>Display Name:</strong> {user.displayName || 'No name set'}</p>
      </div>

      {error && (
        <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '4px', margin: '1rem 0' }}>
          {error}
        </div>
      )}

      {/* Facts Section */}
      <div style={{ marginTop: '2rem' }}>
        <h2>What We Know About You</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Facts extracted from your voice conversations
        </p>

        {loading ? (
          <p>Loading facts...</p>
        ) : facts.length === 0 ? (
          <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
            <p>No facts yet. Start a voice conversation to tell us about your relocation plans!</p>
            <a href="/voice" className="btn" style={{ marginTop: '10px', display: 'inline-block' }}>
              Start Voice Chat
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {facts.map((fact) => (
              <div
                key={fact.id}
                style={{
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '6px',
                  borderLeft: '3px solid #0070f3'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                  {factTypeLabels[fact.fact_type] || fact.fact_type}
                </div>
                <div style={{ fontSize: '16px' }}>
                  {fact.fact_value?.value || JSON.stringify(fact.fact_value)}
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  Confidence: {Math.round((fact.confidence || 0) * 100)}% | Source: {fact.source}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={fetchFacts}
          disabled={loading}
          style={{ marginTop: '1rem', background: '#0070f3' }}
        >
          {loading ? 'Loading...' : 'Refresh Facts'}
        </button>
      </div>

      {/* Knowledge Graph Section */}
      <div style={{ marginTop: '2rem' }}>
        <h2>Your Knowledge Graph</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Visual representation of what we know about you
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
          <button
            onClick={() => setShowGraph(!showGraph)}
            style={{ background: showGraph ? '#ef4444' : '#10b981' }}
          >
            {showGraph ? 'Hide Graph' : 'Show Graph'}
          </button>
          <button
            onClick={syncToZep}
            disabled={syncing}
            style={{ background: '#6366f1' }}
          >
            {syncing ? 'Syncing...' : 'Sync to AI Memory'}
          </button>
          <button
            onClick={fetchZepContext}
            style={{ background: '#8b5cf6' }}
          >
            Show AI Context
          </button>
        </div>

        {showGraph && graphData.nodes.length > 0 && (
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#1a1a2e'
          }}>
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={750}
              height={400}
              nodeLabel={(node: any) => `${node.name} (${node.type})`}
              nodeColor={(node: any) => node.color}
              nodeVal={(node: any) => node.val}
              linkLabel={(link: any) => link.label}
              linkColor={() => '#ffffff40'}
              linkWidth={2}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowRelPos={1}
              onNodeClick={handleNodeClick}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.name;
                const fontSize = node.type === 'user' ? 14 : 12;
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.fillStyle = node.color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI);
                ctx.fill();

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                if (node.type === 'user') {
                  ctx.fillText(label, node.x, node.y);
                } else {
                  const truncated = label.length > 15 ? label.substring(0, 15) + '...' : label;
                  ctx.fillText(truncated, node.x, node.y + node.val / 2 + 10);
                }
              }}
            />
            <div style={{ padding: '10px', background: '#16162a', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <span style={{ color: '#6366f1' }}>● You</span>
              <span style={{ color: '#10b981' }}>● Destinations</span>
              <span style={{ color: '#f59e0b' }}>● Location</span>
              <span style={{ color: '#3b82f6' }}>● Work</span>
              <span style={{ color: '#ec4899' }}>● Family</span>
              <span style={{ color: '#8b5cf6' }}>● Motivation</span>
            </div>
          </div>
        )}

        {showGraph && graphData.nodes.length === 0 && (
          <p style={{ color: '#666' }}>No data to visualize yet. Add some facts first!</p>
        )}

        {zepContext && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f0f9ff',
            borderRadius: '6px',
            fontSize: '14px',
            whiteSpace: 'pre-wrap'
          }}>
            <strong>AI Memory Context:</strong>
            <div style={{ marginTop: '8px' }}>{zepContext}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button onClick={() => user.signOut()} style={{ background: '#dc2626' }}>
          Sign Out
        </button>
        <br /><br />
        <a href="/">Back to Home</a> | <a href="/voice">Voice Chat</a>
      </div>
    </div>
  );
}

export default function UserProfile() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <ProfileContent />
      </StackTheme>
    </StackProvider>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@stackframe/react";
import ForceGraph2D from "react-force-graph-2d";

const GATEWAY_URL = import.meta.env.PUBLIC_GATEWAY_URL || "https://quest-gateway-production.up.railway.app";
const POLL_INTERVAL = 5000; // Poll every 5 seconds

interface Fact {
  id: number;
  fact_type: string;
  fact_value: { value: string };
  confidence: number;
  source: string;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  color: string;
  val: number;
  isNew?: boolean;
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

interface LiveKnowledgeGraphProps {
  isActive?: boolean;
  compact?: boolean;
}

export default function LiveKnowledgeGraph({ isActive = true, compact = false }: LiveKnowledgeGraphProps) {
  const user = useUser();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [factCount, setFactCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const graphRef = useRef<any>();
  const previousFactIds = useRef<Set<number>>(new Set());

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

  const edgeLabels: Record<string, string> = {
    destination: "interested in",
    origin: "located in",
    work_type: "works as",
    family: "has family",
    motivation: "motivated by",
    budget: "budget",
    timeline: "timeline"
  };

  const buildGraphFromFacts = useCallback((facts: Fact[]) => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const newFactIds = new Set(facts.map(f => f.id));

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
      const isNew = !previousFactIds.current.has(fact.id);

      nodes.push({
        id: factId,
        name: value,
        type: fact.fact_type,
        color: colors[fact.fact_type] || "#94a3b8",
        val: isNew ? 15 : 10, // New nodes are bigger temporarily
        isNew
      });

      links.push({
        source: userId,
        target: factId,
        label: edgeLabels[fact.fact_type] || fact.fact_type
      });
    });

    previousFactIds.current = newFactIds;
    return { nodes, links };
  }, [user?.id, user?.displayName]);

  const fetchFacts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/user/profile/facts`, {
        headers: {
          "x-stack-user-id": user.id,
          "x-app-id": "relocation"
        }
      });

      if (response.ok) {
        const data = await response.json();
        const facts = data.facts || [];

        // Only update if facts changed
        if (facts.length !== factCount || facts.length === 0) {
          const newGraphData = buildGraphFromFacts(facts);
          setGraphData(newGraphData);
          setFactCount(facts.length);
          setLastUpdate(new Date());
        }
      }
    } catch (e) {
      console.error("Error fetching facts:", e);
    }
  }, [user?.id, factCount, buildGraphFromFacts]);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchFacts();
    }
  }, [user?.id]);

  // Polling
  useEffect(() => {
    if (!isActive || !user?.id) return;

    const interval = setInterval(fetchFacts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isActive, user?.id, fetchFacts]);

  // Shrink new nodes after animation
  useEffect(() => {
    const timeout = setTimeout(() => {
      setGraphData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => ({ ...n, val: n.type === 'user' ? 20 : 10, isNew: false }))
      }));
    }, 2000);
    return () => clearTimeout(timeout);
  }, [factCount]);

  if (!user) {
    return (
      <div style={{
        padding: '20px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '12px',
        textAlign: 'center',
        color: 'white'
      }}>
        <p>Sign in to see your knowledge graph</p>
        <a href="/handler/sign-in" style={{ color: '#a5b4fc' }}>Sign In</a>
      </div>
    );
  }

  if (compact && !isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        style={{
          padding: '12px 20px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'white',
          transition: 'all 0.3s'
        }}
      >
        <span style={{ fontSize: '24px' }}>🧠</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Knowledge Graph</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {factCount} facts learned • Click to expand
          </div>
        </div>
        {factCount > 0 && (
          <div style={{
            background: '#10b981',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            LIVE
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(26, 26, 46, 0.95)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🧠</span>
          <div>
            <div style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>
              Live Knowledge Graph
            </div>
            <div style={{ fontSize: '12px', color: '#a5b4fc' }}>
              {factCount} facts • Updates every 5s
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isActive && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.2)',
              padding: '4px 10px',
              borderRadius: '12px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#10b981',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>LIVE</span>
            </div>
          )}
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Minimize
            </button>
          )}
        </div>
      </div>

      {/* Graph */}
      {graphData.nodes.length > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={compact ? 350 : 500}
          height={compact ? 250 : 300}
          nodeLabel={(node: any) => `${node.name} (${node.type})`}
          nodeColor={(node: any) => node.color}
          nodeVal={(node: any) => node.val}
          linkColor={() => '#ffffff30'}
          linkWidth={1.5}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          cooldownTicks={50}
          nodeCanvasObject={(node: any, ctx) => {
            const label = node.name;
            ctx.fillStyle = node.color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI);
            ctx.fill();

            // Glow effect for new nodes
            if (node.isNew) {
              ctx.strokeStyle = node.color;
              ctx.lineWidth = 3;
              ctx.stroke();
            }

            ctx.font = `${node.type === 'user' ? 11 : 9}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';

            if (node.type === 'user') {
              ctx.fillText(label, node.x, node.y);
            } else {
              const truncated = label.length > 12 ? label.substring(0, 12) + '...' : label;
              ctx.fillText(truncated, node.x, node.y + node.val / 2 + 8);
            }
          }}
        />
      ) : (
        <div style={{
          height: compact ? 150 : 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a5b4fc',
          fontSize: '14px'
        }}>
          Start talking to build your knowledge graph...
        </div>
      )}

      {/* Legend */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        fontSize: '11px'
      }}>
        <span style={{ color: '#6366f1' }}>● You</span>
        <span style={{ color: '#10b981' }}>● Destinations</span>
        <span style={{ color: '#f59e0b' }}>● Location</span>
        <span style={{ color: '#3b82f6' }}>● Work</span>
        <span style={{ color: '#ec4899' }}>● Family</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

import { useEffect, useState, useRef, useCallback } from 'react';

// Node group colors
const GROUP_COLORS: Record<string, string> = {
  user: '#667eea',       // Purple - central user node
  location: '#10b981',   // Green - current location
  destination: '#f59e0b', // Amber - destinations
  work: '#3b82f6',       // Blue - work/profession
  budget: '#22c55e',     // Green - budget
  timeline: '#ec4899',   // Pink - timeline
  motivation: '#8b5cf6', // Violet - motivations
  entity: '#6b7280',     // Gray - generic entities
};

interface GraphNode {
  id: string;
  label: string;
  group: string;
  title?: string;
  size?: number;
  // For 3D
  x?: number;
  y?: number;
  z?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  title?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

// Get user ID from localStorage
function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('relocation_quest_user_id');
}

export default function UserGraph() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  const fetchGraphData = useCallback(async () => {
    const userId = getUserId();
    if (!userId) {
      setError('No user ID found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/user/graph?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch graph data');

      const data = await response.json();

      // Convert API format to ForceGraph format
      const nodes = data.nodes.map((n: any) => ({
        id: n.id,
        label: n.label,
        group: n.group,
        title: n.title,
        val: n.size || (n.group === 'user' ? 40 : 20),
      }));

      const links = data.edges.map((e: any) => ({
        source: e.from,
        target: e.to,
        label: e.label,
        title: e.title,
      }));

      setGraphData({ nodes, links });
    } catch (err) {
      console.error('[UserGraph] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Initialize 3D force graph
  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0) return;

    // Dynamic import for client-side only
    import('react-force-graph-3d').then(({ default: ForceGraph3D }) => {
      import('three').then((THREE) => {
        import('three-spritetext').then(({ default: SpriteText }) => {
          if (!containerRef.current) return;

          // Clear any existing graph
          containerRef.current.innerHTML = '';

          const width = containerRef.current.clientWidth;
          const height = 500;

          const graph = ForceGraph3D()(containerRef.current)
            .width(width)
            .height(height)
            .backgroundColor('#1a1a2e')
            .graphData(graphData)
            .nodeLabel((node: any) => node.title || node.label)
            .nodeAutoColorBy('group')
            .nodeVal((node: any) => node.val || 20)
            .nodeThreeObject((node: any) => {
              // Create sprite text label
              const sprite = new SpriteText(node.label);
              sprite.color = GROUP_COLORS[node.group] || '#ffffff';
              sprite.textHeight = node.group === 'user' ? 8 : 5;
              sprite.backgroundColor = 'rgba(0,0,0,0.5)';
              sprite.padding = 2;
              return sprite;
            })
            .linkLabel((link: any) => link.label)
            .linkColor(() => 'rgba(255,255,255,0.2)')
            .linkWidth(1)
            .linkDirectionalParticles(2)
            .linkDirectionalParticleWidth(2)
            .linkDirectionalParticleColor(() => '#667eea')
            .d3Force('charge', null)
            .d3Force('link', null);

          // Add forces
          graph.d3Force('charge',
            (window as any).d3?.forceManyBody?.()?.strength?.(-200) || null
          );

          // Camera rotation
          let angle = 0;
          const distance = 300;
          const rotationSpeed = 0.001;

          const animate = () => {
            if (!containerRef.current) return;
            angle += rotationSpeed;
            graph.cameraPosition({
              x: distance * Math.sin(angle),
              z: distance * Math.cos(angle),
            });
            requestAnimationFrame(animate);
          };
          animate();

          graphRef.current = graph;
        });
      });
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [graphData]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '500px',
        background: '#1a1a2e',
        borderRadius: '16px',
      }}>
        <div style={{
          textAlign: 'center',
          color: '#667eea',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(102, 126, 234, 0.3)',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p>Loading your knowledge graph...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || graphData.nodes.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '500px',
        background: '#1a1a2e',
        borderRadius: '16px',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <span style={{ fontSize: '48px' }}>{ error ? '!' : '?' }</span>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
          {error || 'No data yet. Start a conversation to build your graph.'}
        </p>
        <a
          href="/voice"
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '8px',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Start Voice Chat
        </a>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Graph container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '500px',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#1a1a2e',
        }}
      />

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'center',
        marginTop: '16px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
      }}>
        {Object.entries(GROUP_COLORS).map(([group, color]) => (
          <div
            key={group}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: color,
              }}
            />
            <span style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.7)',
              textTransform: 'capitalize',
            }}>
              {group}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: '24px',
        justifyContent: 'center',
        marginTop: '12px',
      }}>
        <div style={{
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.5)',
        }}>
          {graphData.nodes.length} nodes
        </div>
        <div style={{
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.5)',
        }}>
          {graphData.links.length} connections
        </div>
      </div>
    </div>
  );
}

'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface KGNode {
  id: string
  title: string
  content: string | null
  category: string | null
  level: number
  parent_id: string | null
}

interface KGEdge {
  id: string
  source_node_id: string
  target_node_id: string
  relationship_type: string | null
}

const CATEGORY_BG: Record<string, string> = {
  'история': '#1e3a5f',
  'природа': '#1a3d2e',
  'метеорология': '#1a3d4d',
  'навигация': '#3d3a1a',
  'психология': '#2d1a3d',
  'безопасность': '#3d1a1a',
  'медицина': '#3d1a2d',
  'снаряжение': '#3d2d1a',
  'техника': '#1a2d3d',
  'узлы': '#3d3d1a',
  'спасработы': '#3d1a2a',
  'root': '#2d2d1a',
}

export function GraphView({
  nodes: kgNodes,
  edges: kgEdges,
  progress,
  onNodeClick,
}: {
  nodes: KGNode[]
  edges: KGEdge[]
  progress: Record<string, boolean>
  onNodeClick: (node: KGNode) => void
}) {
  const { flowNodes, flowEdges } = useMemo(() => {
    const chapters = kgNodes.filter(n => n.level === 1)
    const root = kgNodes.find(n => n.level === 0)
    const fNodes: Node[] = []
    const fEdges: Edge[] = []

    // Layout: chapters in a circle around root
    const cx = 600, cy = 400, radius = 350

    if (root) {
      fNodes.push({
        id: root.id,
        position: { x: cx - 75, y: cy - 25 },
        data: { label: 'Школа альпинизма' },
        style: {
          background: '#1A2735',
          color: '#F1F5F9',
          border: '2px solid #F59E0B',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 'bold',
          width: 150,
          textAlign: 'center' as const,
        },
      })
    }

    chapters.forEach((ch, i) => {
      const angle = (2 * Math.PI * i) / chapters.length - Math.PI / 2
      const x = cx + radius * Math.cos(angle) - 80
      const y = cy + radius * Math.sin(angle) - 20
      const bg = CATEGORY_BG[ch.category || ''] || '#1A2735'
      const isStudied = progress[ch.id]

      fNodes.push({
        id: ch.id,
        position: { x, y },
        data: { label: ch.title.replace(/^Глава \d+\.\s*/, '') },
        style: {
          background: bg,
          color: '#F1F5F9',
          border: isStudied ? '2px solid #10B981' : '1px solid #334155',
          borderRadius: '10px',
          padding: '8px 12px',
          fontSize: '11px',
          fontWeight: '600',
          width: 160,
          textAlign: 'center' as const,
          cursor: 'pointer',
        },
      })

      // Edge from root to chapter
      if (root) {
        fEdges.push({
          id: `e-${root.id}-${ch.id}`,
          source: root.id,
          target: ch.id,
          style: { stroke: '#334155', strokeWidth: 1 },
          type: 'smoothstep',
        })
      }

      // Sections around chapter
      const sections = kgNodes.filter(n => n.parent_id === ch.id)
      const sRadius = 120
      sections.forEach((sec, j) => {
        const sAngle = (2 * Math.PI * j) / sections.length - Math.PI / 2
        const sx = x + 80 + sRadius * Math.cos(sAngle) - 60
        const sy = y + 20 + sRadius * Math.sin(sAngle) - 10
        const secStudied = progress[sec.id]

        fNodes.push({
          id: sec.id,
          position: { x: sx, y: sy },
          data: { label: sec.title.replace(/^\d+\.\d+\.\s*/, '') },
          style: {
            background: '#0F1923',
            color: secStudied ? '#10B981' : '#94A3B8',
            border: secStudied ? '1px solid #10B981' : '1px solid #1A2735',
            borderRadius: '8px',
            padding: '4px 8px',
            fontSize: '9px',
            width: 120,
            textAlign: 'center' as const,
            cursor: 'pointer',
          },
        })

        fEdges.push({
          id: `e-${ch.id}-${sec.id}`,
          source: ch.id,
          target: sec.id,
          style: { stroke: '#1A2735', strokeWidth: 1 },
        })
      })
    })

    // Cross-reference edges
    kgEdges.forEach(e => {
      fEdges.push({
        id: `cross-${e.id}`,
        source: e.source_node_id,
        target: e.target_node_id,
        style: { stroke: '#3B82F6', strokeWidth: 1.5, strokeDasharray: '5,5' },
        animated: true,
        label: e.relationship_type || '',
        labelStyle: { fontSize: 8, fill: '#94A3B8' },
      })
    })

    return { flowNodes: fNodes, flowEdges: fEdges }
  }, [kgNodes, kgEdges, progress])

  const [rfNodes, , onNodesChange] = useNodesState(flowNodes)
  const [rfEdges, , onEdgesChange] = useEdgesState(flowEdges)

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const kgNode = kgNodes.find(n => n.id === node.id)
    if (kgNode) onNodeClick(kgNode)
  }, [kgNodes, onNodeClick])

  return (
    <div className="h-[70vh] rounded-xl overflow-hidden border border-mountain-border">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1A2735" gap={20} />
        <Controls
          style={{ background: '#1A2735', border: '1px solid #334155', borderRadius: '8px' }}
        />
        <MiniMap
          style={{ background: '#0F1923', border: '1px solid #334155', borderRadius: '8px' }}
          nodeColor="#3B82F6"
          maskColor="rgba(15, 25, 35, 0.8)"
        />
      </ReactFlow>
    </div>
  )
}

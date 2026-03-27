'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronRight,
  ChevronDown,
  Check,
  BookOpen,
  Link2,
  List,
  GitBranch,
  Heart,
} from 'lucide-react'

const GraphView = dynamic(
  () => import('./graph-view').then(m => ({ default: m.GraphView })),
  { ssr: false }
)

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

const CATEGORY_COLORS: Record<string, string> = {
  'история': 'bg-blue-500/20 text-blue-400',
  'природа': 'bg-green-500/20 text-green-400',
  'метеорология': 'bg-cyan-500/20 text-cyan-400',
  'навигация': 'bg-amber-500/20 text-amber-400',
  'психология': 'bg-purple-500/20 text-purple-400',
  'безопасность': 'bg-red-500/20 text-red-400',
  'медицина': 'bg-pink-500/20 text-pink-400',
  'снаряжение': 'bg-orange-500/20 text-orange-400',
  'техника': 'bg-mountain-primary/20 text-mountain-primary',
  'узлы': 'bg-yellow-500/20 text-yellow-400',
  'спасработы': 'bg-rose-500/20 text-rose-400',
  'root': 'bg-mountain-accent/20 text-mountain-accent',
}

export function KnowledgeGraph({ nodes, edges }: { nodes: KGNode[]; edges: KGEdge[] }) {
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('tree')
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        supabase
          .from('kg_progress')
          .select('node_id, studied, favorite, notes')
          .eq('user_id', data.user.id)
          .then(({ data: progressData }) => {
            if (progressData) {
              const progressMap: Record<string, boolean> = {}
              const favMap: Record<string, boolean> = {}
              const notesMap: Record<string, string> = {}
              progressData.forEach(
                (p: { node_id: string; studied: boolean; favorite: boolean | null; notes: string | null }) => {
                  progressMap[p.node_id] = p.studied
                  if (p.favorite) favMap[p.node_id] = true
                  if (p.notes) notesMap[p.node_id] = p.notes
                }
              )
              setProgress(progressMap)
              setFavorites(favMap)
              setNotes(notesMap)
            }
          })
      }
    })

    // Auto-expand root
    const root = nodes.find(n => n.level === 0)
    if (root) setExpandedNodes(new Set([root.id]))
  }, [nodes])

  async function toggleStudied(nodeId: string) {
    if (!userId) return
    const supabase = createClient()
    const current = progress[nodeId] || false

    const { error } = await supabase
      .from('kg_progress')
      .upsert(
        { user_id: userId, node_id: nodeId, studied: !current },
        { onConflict: 'user_id,node_id' }
      )

    if (!error) {
      setProgress(prev => ({ ...prev, [nodeId]: !current }))
    }
  }

  async function toggleFavorite(nodeId: string) {
    if (!userId) return
    const supabase = createClient()
    const current = favorites[nodeId] || false

    const { error } = await supabase
      .from('kg_progress')
      .upsert(
        { user_id: userId, node_id: nodeId, favorite: !current },
        { onConflict: 'user_id,node_id' }
      )

    if (!error) {
      setFavorites(prev => ({ ...prev, [nodeId]: !current }))
    }
  }

  async function saveNote(nodeId: string, text: string) {
    if (!userId) return
    const supabase = createClient()

    const { error } = await supabase
      .from('kg_progress')
      .upsert(
        { user_id: userId, node_id: nodeId, notes: text.trim() || null },
        { onConflict: 'user_id,node_id' }
      )

    if (!error) {
      setNotes(prev => {
        const next = { ...prev }
        if (text.trim()) {
          next[nodeId] = text.trim()
        } else {
          delete next[nodeId]
        }
        return next
      })
    }
    setEditingNote(false)
  }

  function toggleExpand(nodeId: string) {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  function getChildren(parentId: string): KGNode[] {
    return nodes.filter(n => n.parent_id === parentId)
  }

  function getRelatedNodes(nodeId: string): { node: KGNode; type: string }[] {
    const related: { node: KGNode; type: string }[] = []
    edges.forEach(e => {
      if (e.source_node_id === nodeId) {
        const target = nodes.find(n => n.id === e.target_node_id)
        if (target) related.push({ node: target, type: e.relationship_type || 'связано' })
      }
      if (e.target_node_id === nodeId) {
        const source = nodes.find(n => n.id === e.source_node_id)
        if (source) related.push({ node: source, type: e.relationship_type || 'связано' })
      }
    })
    return related
  }

  // Stats
  const totalSections = nodes.filter(n => n.level === 2).length
  const studiedSections = nodes.filter(n => n.level === 2 && progress[n.id]).length

  function renderTreeNode(node: KGNode, depth: number = 0) {
    const children = getChildren(node.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id
    const isStudied = progress[node.id]

    return (
      <div key={node.id}>
        <button
          onClick={() => {
            setSelectedNode(node)
            setEditingNote(false)
            setNoteText(notes[node.id] || '')
            if (hasChildren) toggleExpand(node.id)
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
            isSelected
              ? 'bg-mountain-primary/20 text-mountain-primary'
              : 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} className="shrink-0" />
            ) : (
              <ChevronRight size={14} className="shrink-0" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          {isStudied && <Check size={14} className="text-mountain-success shrink-0" />}
          {favorites[node.id] && <Heart size={12} className="text-red-400 fill-red-400 shrink-0" />}
          <span className="truncate">
            {node.level === 1 ? node.title.replace(/^Глава \d+\.\s*/, '') : node.title}
          </span>
        </button>
        {hasChildren && isExpanded && (
          <div>{children.map(child => renderTreeNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  function handleGraphNodeClick(node: KGNode) {
    setSelectedNode(node)
    setEditingNote(false)
    setNoteText(notes[node.id] || '')
  }

  const rootNodes = nodes.filter(n => n.level === 0)

  function renderContentPanel() {
    if (!selectedNode) {
      return (
        <Card className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-3">
            <BookOpen size={48} className="mx-auto text-mountain-muted" />
            <p className="text-mountain-muted">
              {viewMode === 'tree'
                ? 'Выбери тему в дереве слева'
                : 'Нажми на узел графа для просмотра'}
            </p>
          </div>
        </Card>
      )
    }

    return (
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{selectedNode.title}</h2>
            {selectedNode.category && (
              <span
                className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                  CATEGORY_COLORS[selectedNode.category] ||
                  'bg-mountain-surface text-mountain-muted'
                }`}
              >
                {selectedNode.category}
              </span>
            )}
          </div>
          {userId && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleFavorite(selectedNode.id)}
                className="p-2 rounded-lg hover:bg-mountain-surface transition-colors"
                title={favorites[selectedNode.id] ? 'Убрать из избранного' : 'Добавить в избранное'}
              >
                <Heart
                  size={18}
                  className={
                    favorites[selectedNode.id]
                      ? 'text-red-400 fill-red-400'
                      : 'text-mountain-muted'
                  }
                />
              </button>
              {selectedNode.level === 2 && (
                <Button
                  variant={progress[selectedNode.id] ? 'primary' : 'outline'}
                  onClick={() => toggleStudied(selectedNode.id)}
                >
                  <Check size={16} className="mr-2" />
                  {progress[selectedNode.id] ? 'Изучено' : 'Отметить изученным'}
                </Button>
              )}
            </div>
          )}
        </div>

        {selectedNode.content && (
          <p className="text-mountain-muted leading-relaxed">{selectedNode.content}</p>
        )}

        {/* User notes */}
        {userId && (
          <div className="border-t border-mountain-border pt-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <BookOpen size={16} className="text-mountain-primary" />
              Мои заметки
            </h3>
            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Напишите заметку..."
                  className="w-full min-h-[100px] p-3 rounded-lg bg-mountain-bg border border-mountain-border text-mountain-text text-sm resize-y focus:outline-none focus:border-mountain-primary"
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => saveNote(selectedNode.id, noteText)}
                  >
                    Сохранить
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingNote(false)
                      setNoteText(notes[selectedNode.id] || '')
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {notes[selectedNode.id] ? (
                  <div className="space-y-2">
                    <p className="text-sm text-mountain-muted whitespace-pre-wrap bg-mountain-bg rounded-lg p-3">
                      {notes[selectedNode.id]}
                    </p>
                    <button
                      onClick={() => {
                        setNoteText(notes[selectedNode.id] || '')
                        setEditingNote(true)
                      }}
                      className="text-xs text-mountain-primary hover:underline"
                    >
                      Редактировать
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNoteText('')
                      setEditingNote(true)
                    }}
                    className="text-sm text-mountain-muted hover:text-mountain-text transition-colors"
                  >
                    + Добавить заметку
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Related topics */}
        {(() => {
          const related = getRelatedNodes(selectedNode.id)
          if (related.length === 0) return null
          return (
            <div className="border-t border-mountain-border pt-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Link2 size={16} className="text-mountain-primary" />
                Связанные темы
              </h3>
              <div className="flex flex-wrap gap-2">
                {related.map(({ node, type }) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      setSelectedNode(node)
                      setEditingNote(false)
                      setNoteText(notes[node.id] || '')
                      // Expand parent
                      if (node.parent_id) {
                        setExpandedNodes(prev => {
                          const next = new Set(prev)
                          next.add(node.parent_id!)
                          // Also expand grandparent
                          const parent = nodes.find(n => n.id === node.parent_id)
                          if (parent?.parent_id) next.add(parent.parent_id)
                          return next
                        })
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-mountain-surface hover:bg-mountain-surface/80 text-mountain-text transition-colors"
                  >
                    <span className="text-xs text-mountain-muted">{type}:</span>
                    {node.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Children sections */}
        {(() => {
          const children = getChildren(selectedNode.id)
          if (children.length === 0) return null
          return (
            <div className="border-t border-mountain-border pt-4">
              <h3 className="text-sm font-medium mb-3">Разделы</h3>
              <div className="space-y-2">
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => {
                      setSelectedNode(child)
                      setEditingNote(false)
                      setNoteText(notes[child.id] || '')
                      setExpandedNodes(prev => new Set([...prev, selectedNode.id]))
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-mountain-bg hover:bg-mountain-surface/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {progress[child.id] && (
                        <Check size={14} className="text-mountain-success" />
                      )}
                      <span className="text-sm">{child.title}</span>
                    </div>
                    {child.category && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          CATEGORY_COLORS[child.category] || ''
                        }`}
                      >
                        {child.category}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
      </Card>
    )
  }

  return (
    <div>
      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setViewMode('tree')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'tree'
              ? 'bg-mountain-primary text-white'
              : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text'
          }`}
        >
          <List size={18} />
          Дерево
        </button>
        <button
          onClick={() => setViewMode('graph')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'graph'
              ? 'bg-mountain-primary text-white'
              : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text'
          }`}
        >
          <GitBranch size={18} />
          Граф
        </button>
      </div>

      {viewMode === 'tree' ? (
        <div className="flex gap-6 min-h-[70vh]">
          {/* Tree navigation */}
          <div className="w-80 shrink-0 overflow-y-auto">
            <Card className="p-3 space-y-1 sticky top-24">
              {/* Progress bar */}
              {userId && totalSections > 0 && (
                <div className="px-3 pb-3 border-b border-mountain-border mb-2">
                  <div className="flex justify-between text-xs text-mountain-muted mb-1">
                    <span>Прогресс</span>
                    <span>
                      {studiedSections}/{totalSections}
                    </span>
                  </div>
                  <div className="h-2 bg-mountain-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-mountain-primary rounded-full transition-all"
                      style={{ width: `${(studiedSections / totalSections) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {rootNodes.map(root => renderTreeNode(root))}
            </Card>
          </div>

          {/* Content panel */}
          <div className="flex-1 min-w-0">{renderContentPanel()}</div>
        </div>
      ) : (
        <div className="flex gap-6 min-h-[70vh]">
          {/* Graph view */}
          <div className="flex-1 min-w-0">
            <GraphView
              nodes={nodes}
              edges={edges}
              progress={progress}
              onNodeClick={handleGraphNodeClick}
            />
          </div>

          {/* Side panel for graph mode */}
          <div className="w-96 shrink-0 overflow-y-auto">{renderContentPanel()}</div>
        </div>
      )}
    </div>
  )
}

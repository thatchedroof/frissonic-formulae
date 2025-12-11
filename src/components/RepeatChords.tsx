// TODO: Shadows
// Merge top level elements without repeats
// Make badge larger

import React from 'react'
import { RepeatNode, RepeatChild, isRepeatNode } from 'src/lib/repeatTree'

export interface RepeatTreeViewProps<T> {
  nodes: RepeatNode<T>[]
  // value = element from the original sequence
  // indices = all original indices this leaf covers
  renderLeaf: (value: T, indices: number[]) => React.ReactNode
}

export function RepeatTreeView<T>({ nodes, renderLeaf }: RepeatTreeViewProps<T>) {
  return (
    <div className="flex flex-wrap gap-4">
      {nodes.map((node, idx) => (
        <RepeatNodeView key={idx} node={node} renderLeaf={renderLeaf} parentIndices={node.indices ?? []} />
      ))}
    </div>
  )
}

/**
 * Renders a single repeat node (possibly nested).
 */
function RepeatNodeView<T>({
  node,
  renderLeaf,
  parentIndices = [],
}: {
  node: RepeatNode<T>
  renderLeaf: (value: T, indices: number[]) => React.ReactNode
  parentIndices?: number[]
}) {
  const isRepeated = node.count > 1
  const effectiveIndices = node.indices ?? parentIndices

  return (
    <div className="relative inline-flex">
      {isRepeated && (
        <div className="absolute -top-2 -right-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-secondary px-2 text-xs font-semibold text-secondary-foreground shadow">
          ×{node.count}
        </div>
      )}

      <div
        className={`flex flex-wrap items-center gap-2 ${isRepeated ? 'rounded-xl border px-3 py-2 shadow-sm bg-card border-ring' : ''}`}
      >
        {node.children.map((child, idx) => (
          <ChildView key={idx} child={child} renderLeaf={renderLeaf} indices={effectiveIndices} />
        ))}
      </div>
    </div>
  )
}

/**
 * Renders either:
 *   - a *leaf node* (RepeatNode whose single child is a raw value) -> calls renderLeaf(value, indices)
 *   - a nested RepeatNode -> recurses
 *   - a raw leaf value (fallback, if it ever appears)
 */
function ChildView<T>({
  child,
  renderLeaf,
  indices,
}: {
  child: RepeatChild<T>
  renderLeaf: (value: T, indices: number[]) => React.ReactNode
  indices: number[]
}) {
  if (isRepeatNode(child)) {
    const childIndices = child.indices ?? indices
    const isLeafNode = child.children.length === 1 && !isRepeatNode(child.children[0])

    if (isLeafNode) {
      const value = child.children[0] as T
      return <div className="rounded-lg bg-card px-2 py-1">{renderLeaf(value, childIndices)}</div>
    }

    // Nested non-leaf node: recurse, carrying indices down
    return <RepeatNodeView node={child} renderLeaf={renderLeaf} parentIndices={childIndices} />
  }

  // Plain T: treat as a normal leaf with inherited indices
  return <div className="px-2 py-1">{renderLeaf(child, indices)}</div>
}

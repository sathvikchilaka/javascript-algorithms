import React, { useMemo } from 'react'
import { useTree } from '../hooks/useTree'

// Flattens the tree into visible rows, respecting expandedIds.
function flatten(nodes, { expandedIds, depth = 0 }) {
  const rows = []
  nodes.forEach((node) => {
    rows.push({ node, depth })
    if (expandedIds.has(node.id) && node.children) rows.push(...flatten(node.children, { expandedIds, depth: depth + 1 }))
  })
  return rows
}

const highlight = (name, term) => {
  if (!term) return name
  const idx = name.toLowerCase().indexOf(term)
  if (idx === -1) return name
  return (
    <>
      {name.slice(0, idx)}
      <mark>{name.slice(idx, idx + term.length)}</mark>
      {name.slice(idx + term.length)}
    </>
  )
}

const TreeView = () => {
  const {
    tree,
    expandedIds,
    loadingIds,
    focusedId,
    editingId,
    searchTerm,
    debouncedTerm,
    setSearchTerm,
    setFocusedId,
    setEditingId,
    toggleExpand,
    addChild,
    rename,
    deleteNode,
  } = useTree()

  const rows = useMemo(() => flatten(tree, { expandedIds }), [tree, expandedIds])

  const handleKeyDown = (e, node) => {
    if(e.key === 'Enter'){
      if(node.type === "folder") toggleExpand(node)
      else setEditingId(node.id)
    }
  }

  return (
    <div className="tree-view">
      <div className="tree-toolbar">
        <input
          className="tree-search-box"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="button" onClick={() => addChild(null, 'file')}>
          + File
        </button>
        <button type="button" onClick={() => addChild(null, 'folder')}>
          + Folder
        </button>
      </div>
      <ul className="tree-root">
        {rows.map(({ node, depth }, idx) => {
          const isExpanded = expandedIds.has(node.id)
          const isEditing = editingId === node.id
          const isFocused = focusedId === node.id
          return (
            <li
              key={node.id}
              tabIndex={0}
              className={`tree-row ${isFocused ? 'tree-row--focused' : ''}`}
              style={{ paddingLeft: `${depth * 16}px` }}
              onClick={() => setFocusedId(node.id)}
              onKeyDown={(e) => handleKeyDown(e, node)}
              onDoubleClick={() => setEditingId(node.id)}
            >
              {node.type === 'folder' && (
                <button type="button" className="tree-caret" onClick={() => toggleExpand(node)}>
                  {loadingIds.has(node.id) ? '⏳' : isExpanded ? '▾' : '▸'}
                </button>
              )}
              <span className="tree-icon">{node.type === 'folder' ? (isExpanded ? '📂' : '📁') : '📄'}</span>
              {isEditing ? (
                <input
                  autoFocus
                  className="tree-rename-input"
                  defaultValue={node.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => rename(node.id, e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') rename(node.id, e.target.value)
                  }}
                />
              ) : (
                <span className="tree-label">{highlight(node.name, debouncedTerm)}</span>
              )}
              <button
                type="button"
                className="tree-delete-btn"
                aria-label={`Delete ${node.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  deleteNode(node.id)
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" strokeLinecap="round" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default TreeView

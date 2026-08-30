import { useState, useEffect, useCallback } from 'react';
import { initialTree, fetchChildren } from '../mockData';

// Recursively rebuilds the tree, calling `update` on the node matching `id`.
function updateNode(nodes, id, update) {
  return nodes.map((node) => {
    if (node.id === id) return update(node);
    if (node.children)
      return { ...node, children: updateNode(node.children, id, update) };
    return node;
  });
}

function removeNode(nodes, id) {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.children
        ? { ...node, children: removeNode(node.children, id) }
        : node,
    );
}

export function useTree() {
  const [tree, setTree] = useState(initialTree);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [focusedId, setFocusedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedTerm(searchTerm.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleExpand = useCallback(async (node) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(node.id) ? next.delete(node.id) : next.add(node.id);
      return next;
    });
    if (node.type === 'folder' && node.children === null) {
      setLoadingIds((prev) => new Set(prev).add(node.id));
      const children = await fetchChildren(node);
      setTree((prev) => updateNode(prev, node.id, (n) => ({ ...n, children })));
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    }
  }, []);

  const addChild = useCallback((parentId, nodeType) => {
    const newNode = {
      id: `new-${Date.now()}`,
      name: nodeType === 'folder' ? 'New Folder' : 'New File',
      type: nodeType,
      children: nodeType === 'folder' ? [] : undefined,
    };
    if (parentId === null) {
      setTree((prev) => [...prev, newNode]);
    } else {
      setTree((prev) =>
        updateNode(prev, parentId, (n) => ({
          ...n,
          children: [...(n.children || []), newNode],
        })),
      );
      setExpandedIds((prev) => new Set(prev).add(parentId));
    }
    setEditingId(newNode.id);
  }, []);

  const rename = useCallback((id, name) => {
    setEditingId(null);
    if (!name) return;
    setTree((prev) => updateNode(prev, id, (n) => ({ ...n, name })));
  }, []);

  const deleteNode = useCallback((id) => {
    setTree((prev) => removeNode(prev, id));
  }, []);

  return {
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
  };
}

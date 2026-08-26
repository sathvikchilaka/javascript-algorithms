import { lazy } from 'react';

// Auto-discovers any `app.jsx` under system-design/<folder>/ — no manual registration needed.
// To add an exercise: create system-design/<folder-name>/app.jsx with a default export.
const modules = import.meta.glob('./system-design/*/app.jsx');

function toLabel(folder) {
  return folder
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export const routes = Object.entries(modules).map(([filePath, loader]) => {
  const folder = filePath.split('/')[2];
  return {
    path: folder,
    label: `System Design: ${toLabel(folder)}`,
    component: lazy(loader),
  };
});

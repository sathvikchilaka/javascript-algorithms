let idCounter = 0
const nextId = () => `node-${++idCounter}`

const file = (name) => ({ id: nextId(), name, type: 'file' })
const folder = (name) => ({ id: nextId(), name, type: 'folder', children: null }) // null children = not loaded yet

export const initialTree = [folder('src'), file('README.md'), file('package.json')]

// Simulated async fetch — real interview follow-up: "what if children come from an API?"
export const fetchChildren = (node) =>
  new Promise((resolve) => {
    setTimeout(() => {
      if (node.name === 'src') resolve([folder('components'), file('index.js')])
      else if (node.name === 'components') resolve([file('Button.jsx'), file('Modal.jsx')])
      else resolve([])
    }, 300)
  })

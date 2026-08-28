# Repo purpose

Fork of trekhleb/javascript-algorithms, repurposed as personal interview-prep repo. Not upstream algo library work — `src/playground/` is where actual activity happens.

## Structure

- `src/algorithms/`, `src/data-structures/` — upstream reference (rarely touched)
- `src/playground/GoogleInterviews/` — DSA + FE question prep (`dsa-questions/`, `fe-questions/`)
- `src/playground/js-dsa-frontendgeek/` — main active area. Vite + React app (React 18, react-router-dom v6) implementing frontend system-design exercises:
  - `system-design/scrollable-carousel/` — Carousel w/ RTL support, tripled-item rendering for smooth infinite scroll (`hooks/useCarousel.js`, `components/`)
  - `system-design/data-table/` — pagination, sorting, selection
  - `system-design/auto-complete/` — debounced input + API integration
  - `system-design/infinite-scroll/`
  - `strings/` — string algo exercises
  - Routes auto-discovered/lazy-loaded (see recent commit history)
  - Run: `cd src/playground/js-dsa-frontendgeek && npm run dev`

## Conventions

- Playground exercises are self-contained per feature folder (components/, hooks/, context/ as needed)
- Follow global UI/UX standards (Tailwind + OKLch dark theme) from `~/.claude/CLAUDE.md` for any new UI work here

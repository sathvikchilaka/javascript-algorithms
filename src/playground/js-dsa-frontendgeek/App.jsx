import { Routes, Route, Link } from 'react-router-dom';
import { routes } from './routes.js';

function Landing() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>FE Playground</h1>
      <ul>
        {routes.map((r) => (
          <li key={r.path}>
            <Link to={r.path}>{r.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {routes.map((r) => (
        <Route key={r.path} path={r.path} element={<r.component />} />
      ))}
    </Routes>
  );
}

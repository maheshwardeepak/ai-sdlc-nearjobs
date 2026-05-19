import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section>
      <h1>404 — Not Found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </section>
  );
}
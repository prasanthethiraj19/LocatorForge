import { Link } from 'react-router-dom';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <p className="mb-4 font-mono text-ember-600">404</p>
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-stone-900">
          Locator not found.
        </h1>
        <p className="mb-8 text-stone-600">The page you're looking for doesn't exist (or moved).</p>
        <Link to="/" className="btn-primary">
          Back home
        </Link>
      </div>
      <Footer />
    </>
  );
}

import { Link } from 'react-router-dom';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Nav />
      <div className="max-w-3xl mx-auto px-6 py-32 text-center">
        <p className="font-mono text-emerald-600 mb-4">404</p>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Locator not found.</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          The page you're looking for doesn't exist (or moved).
        </p>
        <Link to="/" className="btn-primary">Back home</Link>
      </div>
      <Footer />
    </>
  );
}

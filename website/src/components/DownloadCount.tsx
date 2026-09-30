import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface DownloadCounts {
  chrome: number;
  edge: number;
  total: number;
}

export function DownloadCount({ className = 'mt-5' }: { className?: string }) {
  const [counts, setCounts] = useState<DownloadCounts | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/downloads', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DownloadCounts | null) => {
        if (alive && data && typeof data.total === 'number') setCounts(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!counts || counts.total <= 0) return null;

  return (
    <p className={`flex items-center gap-1.5 font-mono text-xs text-stone-500 ${className}`}>
      <Download className="h-3.5 w-3.5" />
      {counts.total.toLocaleString()} downloads and counting
    </p>
  );
}

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { fetchDownloadCounts, type DownloadCounts } from '@/lib/downloadStats';

export function DownloadCount({ className = 'mt-5' }: { className?: string }) {
  const [counts, setCounts] = useState<DownloadCounts | null>(null);

  useEffect(() => {
    let alive = true;
    fetchDownloadCounts().then((data) => {
      if (alive && data) setCounts(data);
    });
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

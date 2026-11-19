import { useEffect, useState } from 'react';

type State = 'memeriksa' | 'tersambung' | 'tidak tersambung';

/** Indikator koneksi ke API (lewat proxy Vite ke localhost:3000). */
export function ApiStatus() {
  const [state, setState] = useState<State>('memeriksa');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/health', { signal: controller.signal })
      .then((res) => setState(res.ok ? 'tersambung' : 'tidak tersambung'))
      .catch(() => {
        if (!controller.signal.aborted) setState('tidak tersambung');
      });
    return () => controller.abort();
  }, []);

  return <p style={{ color: '#666' }}>API: {state}</p>;
}

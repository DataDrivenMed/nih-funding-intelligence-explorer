import { useState, useEffect } from 'react';

const BASE = import.meta.env.BASE_URL;

function fetchJson<T>(path: string): Promise<T> {
  return fetch(`${BASE}data/${path}`).then(r => r.json());
}

export function useData<T>(file: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<T>(file)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [file]);

  return { data, loading, error };
}

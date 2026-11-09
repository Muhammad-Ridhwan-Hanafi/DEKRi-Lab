import { useEffect, useState } from 'react';

const raw = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
const read = raw;

export function navigate(path: string) {
  const target = path.replace(/^\//, '');
  window.location.hash = '/' + target;
}

/** Router hash sederhana: bekerja pada static site, offline, dan file lokal. */
export function useRoute(): string[] {
  const [segments, setSegments] = useState<string[]>(read);
  useEffect(() => {
    const on = () => {
      setSegments(read());
    };
    on();
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return segments;
}

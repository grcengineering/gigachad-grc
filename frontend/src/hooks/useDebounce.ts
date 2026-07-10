import { useState, useEffect } from 'react';

/**
 * Returns a debounced value that only updates after `delay` ms have passed
 * without `value` changing. Standard pattern for search inputs.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default useDebounce;

import { useEffect, useState } from 'react';

/** De huidige tijd in ms, ververst om de zoveel milliseconden. */
export function useNow(interval = 1000): number {
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNu(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return nu;
}

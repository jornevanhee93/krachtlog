import { useNavigate } from 'react-router';

/**
 * Terug naar het vorige scherm in de app. Is er geen vorig scherm (bv. de app opende
 * rechtstreeks op dit scherm), dan naar het opgegeven scherm.
 */
export function useTerug(standaard: string) {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(standaard, { replace: true });
  };
}

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

export function AuthBootstrap() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return null;
}

// src/hooks/useSucursal.ts
import { useState, useEffect } from 'react';

export function useSucursal() {
  const [sucursalId, setSucursalId] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('sucursalId') : null
  );
  const [sucursalNombre, setSucursalNombre] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('sucursalNombre') : null
  );

  // Actualizar estado cuando cambia localStorage (por ejemplo, después de login)
  useEffect(() => {
    const handleStorageChange = () => {
      setSucursalId(localStorage.getItem('sucursalId'));
      setSucursalNombre(localStorage.getItem('sucursalNombre'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    sucursalId,
    sucursalNombre,
    hasSucursal: !!sucursalId
  };
}

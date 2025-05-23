"use client"

import { authenticatedFetch } from "@/hooks/useAuth";
import { useState } from "react";

// src/components/admin/HealthMonitor.tsx
export function HealthMonitor() {
    const [health, setHealth] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);
  
    const runHealthCheck = async () => {
      setIsRunning(true);
      try {
        const response = await authenticatedFetch('/api/admin/health/afip', {
          method: 'POST'
        });
        const data = await response.json();
        setHealth(data);
      } catch (error) {
        console.error('Error en health check:', error);
      } finally {
        setIsRunning(false);
      }
    };
  
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Estado AFIP</h3>
          <button 
            onClick={runHealthCheck}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {isRunning ? 'Verificando...' : 'Verificar'}
          </button>
        </div>
        
        {health && (
          <div className="space-y-3">
            <HealthIndicator 
              label="Conectividad AFIP" 
              status={health.connectivity} 
            />
            <HealthIndicator 
              label="Certificados" 
              status={health.certificates} 
            />
            <HealthIndicator 
              label="Autenticación" 
              status={health.authentication} 
            />
            <HealthIndicator 
              label="Último Token" 
              status={health.lastToken} 
              details={health.tokenExpiry}
            />
          </div>
        )}
      </div>
    );
  }
  
  function HealthIndicator({ label, status, details }: {
    label: string;
    status: 'ok' | 'warning' | 'error';
    details?: string;
  }) {
    const statusColors = {
      ok: 'text-green-600 bg-green-100',
      warning: 'text-yellow-600 bg-yellow-100',
      error: 'text-red-600 bg-red-100'
    };
  
    const statusIcons = {
      ok: '✅',
      warning: '⚠️', 
      error: '❌'
    };
  
    return (
      <div className="flex items-center justify-between p-3 rounded border">
        <span className="font-medium">{label}</span>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-sm ${statusColors[status]}`}>
            {statusIcons[status]} {status.toUpperCase()}
          </span>
          {details && (
            <span className="text-xs text-gray-500">{details}</span>
          )}
        </div>
      </div>
    );
  }
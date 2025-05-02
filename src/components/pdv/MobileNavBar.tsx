// src/components/pdv/MobileNavBar.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, Clock, Tag, Home } from 'lucide-react';

export function MobileNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-4 h-16">
        <button
          onClick={() => router.push('/pdv')}
          className={`flex flex-col items-center justify-center ${
            pathname === '/pdv' ? 'text-[#311716]' : 'text-gray-500'
          }`}
        >
          <ShoppingCart size={20} />
          <span className="text-xs mt-1">Venta</span>
        </button>
        
        <button
          onClick={() => router.push('/pdv/cierre')}
          className={`flex flex-col items-center justify-center ${
            pathname.startsWith('/pdv/cierre') ? 'text-[#311716]' : 'text-gray-500'
          }`}
        >
          <Clock size={20} />
          <span className="text-xs mt-1">Cierre</span>
        </button>
        
        <button
          onClick={() => router.push('/pdv/ventas')}
          className={`flex flex-col items-center justify-center ${
            pathname.startsWith('/pdv/ventas') ? 'text-[#311716]' : 'text-gray-500'
          }`}
        >
          <Tag size={20} />
          <span className="text-xs mt-1">Historial</span>
        </button>
        
        <button
          onClick={() => router.push('/pdv/dashboard')}
          className={`flex flex-col items-center justify-center ${
            pathname.startsWith('/pdv/dashboard') ? 'text-[#311716]' : 'text-gray-500'
          }`}
        >
          <Home size={20} />
          <span className="text-xs mt-1">Dashboard</span>
        </button>
      </div>
    </div>
  );
}

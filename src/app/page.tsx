'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Efecto para animación de entrada
  useEffect(() => {
    setMounted(true);
    
    // Función para animación de burbujas
    const animateBubbles = () => {
      const bubbles = document.querySelectorAll('.bubble');
      bubbles.forEach((bubble) => {
        const element = bubble as HTMLElement;
        const randomX = (Math.random() - 0.5) * 20;
        const randomY = (Math.random() - 0.5) * 20;
        
        element.style.transform = `translate(${randomX}px, ${randomY}px)`;
        element.style.opacity = `${0.5 + Math.random() * 0.5}`;
      });
    };
    
    // Iniciar animación
    const interval = setInterval(animateBubbles, 3000);
    
    // Redirigir si ya hay sesión
    if (isAuthenticated && user) {
      const redirectDelay = setTimeout(() => {
        if (user.roleId === 'role-admin') {
          router.push('/admin');
        } else if (user.roleId === 'role-fabrica') {
          router.push('/fabrica');
        } else if (user.roleId === 'role-vendedor') {
          router.push('/pdv');
        }
      }, 1500);
      
      return () => {
        clearTimeout(redirectDelay);
        clearInterval(interval);
      };
    }
    
    return () => clearInterval(interval);
  }, [isAuthenticated, user, router]);

  return (
    <ContrastEnhancer>
      <div className="min-h-screen bg-gradient-to-b from-[#311716] to-[#9c7561] flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Burbujas decorativas */}
        <div className="absolute inset-0 z-0">
          <div className="bubble w-64 h-64 rounded-full bg-[#eeb077]/10 absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 blur-md transition-all duration-3000"></div>
          <div className="bubble w-96 h-96 rounded-full bg-[#eeb077]/10 absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2 blur-md transition-all duration-3000"></div>
          <div className="bubble w-48 h-48 rounded-full bg-[#fcf3ea]/10 absolute top-1/2 right-1/3 blur-md transition-all duration-3000"></div>
          <div className="bubble w-32 h-32 rounded-full bg-[#fcf3ea]/10 absolute bottom-1/3 left-1/3 blur-md transition-all duration-3000"></div>
        </div>
        
        {/* Contenido principal */}
        <div 
          className={`relative z-10 max-w-4xl p-8 text-center transition-all duration-1000 transform ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="mb-8 flex justify-center">
            <Image 
              src="/logo-tulum.webp" 
              alt="Tulum Aromaterapia" 
              width={250} 
              height={100} 
              className="transition-all duration-700 filter brightness-110"
            />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Sistema de Gestión Integral y Punto de venta</h1>
          <p className="text-xl md:text-2xl text-[#fcf3ea] mb-12 max-w-2xl mx-auto">
            Plataforma completa para administración, producción y ventas de productos
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link 
              href="/login" 
              className="px-8 py-4 bg-gradient-to-r from-[#eeb077] to-[#9c7561] rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
            >
              Iniciar Sesión
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            
            {isAuthenticated && (
              <Link 
                href={
                  user?.roleId === 'role-admin' ? '/admin' :
                  user?.roleId === 'role-fabrica' ? '/fabrica' : 
                  '/pdv'
                } 
                className="px-8 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white font-semibold text-lg hover:bg-white/30 transition-all duration-300"
              >
                Continuar a mi panel
              </Link>
            )}
          </div>
        </div>
        
        {/* Footer con detalles */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 text-center text-white/60 text-sm transition-all duration-1000 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}>
          <p>Tulum Aromaterapia © {new Date().getFullYear()} - Sistema de Gestión</p>
        </div>
      </div>
    </ContrastEnhancer>
  );
}
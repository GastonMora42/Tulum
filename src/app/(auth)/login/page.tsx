'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCLabel } from '@/components/ui/HighContrastComponents';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  // Efecto para la animación de círculos flotantes
  useEffect(() => {
    const animateCircles = () => {
      const circles = document.querySelectorAll('.floating-circle');
      circles.forEach((circle) => {
        const element = circle as HTMLElement;
        const randomX = Math.random() * 10 - 5; // -5 a 5
        const randomY = Math.random() * 10 - 5; // -5 a 5
        const currentTransform = window.getComputedStyle(element).transform;
        
        // Aplicar transformación suave
        element.style.transform = `translate(${randomX}px, ${randomY}px)`;
        
        // Cambiar suavemente el tamaño
        const scale = 0.95 + Math.random() * 0.1; // 0.95 a 1.05
        element.style.transform += ` scale(${scale})`;
      });
    };

    // Iniciar la animación
    const interval = setInterval(animateCircles, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Guardar el email para refresh token
      localStorage.setItem('userEmail', email);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la autenticación');
      }
      
      // Guardar datos en localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('idToken', data.idToken);
      
      // Guardar usuario en el store
      if (login) {
        await login({ email, password });
      }
      
      // Establecer cookie para que el middleware pueda detectarla
      document.cookie = `accessToken=${data.accessToken}; path=/; max-age=3600`;
      
      // Redirección según el rol del usuario
      const role = data.user.roleId;
      let redirectPath = '/admin'; // Por defecto

      // Determinar la ruta según el rol
      if (role === 'role-fabrica' || (data.user.role && data.user.role.name === 'fabrica')) {
        redirectPath = '/fabrica';
      } else if (role === 'role-vendedor' || (data.user.role && data.user.role.name === 'vendedor')) {
        redirectPath = '/pdv';
      }
      
      // Redirect con transición
      setIsLoading(false);
      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      console.error('Error de login:', err);
      setIsLoading(false);
    }
  };

  return (
    <ContrastEnhancer>
      <div className="min-h-screen flex relative overflow-hidden">
        {/* Fondo con círculos flotantes */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#311716] to-[#9c7561] z-0">
          <div className="floating-circle w-64 h-64 rounded-full bg-[#eeb077]/10 absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 blur-md transition-transform duration-3000"></div>
          <div className="floating-circle w-96 h-96 rounded-full bg-[#eeb077]/10 absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2 blur-md transition-transform duration-3000"></div>
          <div className="floating-circle w-48 h-48 rounded-full bg-[#fcf3ea]/10 absolute top-1/2 right-1/3 blur-md transition-transform duration-3000"></div>
        </div>
        
        {/* Panel de login */}
        <div className="flex-1 flex items-center justify-center p-8 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Image 
                  src="/logo-tulum.webp" 
                  alt="Tulum Aromaterapia" 
                  width={150} 
                  height={60} 
                />
              </div>
              <h2 className="text-2xl font-bold text-black">Sistema de Gestión</h2>
              <p className="mt-1 text-black">Ingresa tus credenciales para continuar</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <HCLabel htmlFor="email" className="block text-sm font-medium mb-1">
                  Correo electrónico
                </HCLabel>
                <HCInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077] transition-colors"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              
              <div>
                <HCLabel htmlFor="password" className="block text-sm font-medium mb-1">
                  Contraseña
                </HCLabel>
                <HCInput
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077] transition-colors"
                  placeholder="••••••••"
                />
              </div>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#9c7561] to-[#eeb077] text-white py-3 px-6 rounded-lg font-medium shadow-md hover:from-[#eeb077] hover:to-[#9c7561] transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Accediendo...
                  </span>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ContrastEnhancer>
  );
}
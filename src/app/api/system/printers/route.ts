// src/app/api/system/printers/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Detectar impresoras del sistema (simulado para web)
    const detectedPrinters = await detectSystemPrinters();
    
    return NextResponse.json(detectedPrinters);
  } catch (error) {
    console.error('Error detectando impresoras del sistema:', error);
    return NextResponse.json(
      { error: 'Error al detectar impresoras' },
      { status: 500 }
    );
  }
}

async function detectSystemPrinters() {
  // En un entorno web, la detección de impresoras del sistema es limitada
  // Retornamos impresoras comunes que podrían estar instaladas
  
  const commonPrinters = [
    {
      name: 'Fukun POS80-CC',
      displayName: 'Fukun POS80-CC Thermal Printer',
      type: 'thermal',
      manufacturer: 'Fukun',
      model: 'POS80-CC',
      isDefault: false,
      status: 'unknown', // En web no podemos verificar estado real
      connection: 'usb',
      capabilities: {
        paperSizes: ['80mm'],
        autocut: true,
        cashdrawer: true,
        maxWidth: 72, // mm
        resolution: '203dpi'
      },
      settings: {
        paperWidth: 80,
        autocut: true,
        encoding: 'utf-8',
        printSpeed: 250, // mm/s
        charSet: 'CP437'
      }
    },
    {
      name: 'Generic / Text Only',
      displayName: 'Generic Text Printer',
      type: 'generic',
      manufacturer: 'Generic',
      isDefault: true,
      status: 'online',
      connection: 'system',
      capabilities: {
        paperSizes: ['A4', '80mm'],
        autocut: false,
        cashdrawer: false
      },
      settings: {
        paperWidth: 80,
        autocut: false,
        encoding: 'utf-8'
      }
    },
    {
      name: 'XPrinter XP-80C',
      displayName: 'XPrinter XP-80C',
      type: 'thermal',
      manufacturer: 'XPrinter',
      model: 'XP-80C',
      isDefault: false,
      status: 'unknown',
      connection: 'usb',
      capabilities: {
        paperSizes: ['80mm'],
        autocut: true,
        cashdrawer: true
      },
      settings: {
        paperWidth: 80,
        autocut: true,
        encoding: 'utf-8'
      }
    }
  ];

  // Simular detección basada en user agent para tablets Android
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroidTablet = /Android/i.test(userAgent) && /Mobile/i.test(userAgent);
  
  if (isAndroidTablet) {
    // En tablets Android, es más probable que tengan impresoras USB
    return commonPrinters.filter(p => p.connection === 'usb');
  }

  return commonPrinters;
}
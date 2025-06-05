// src/app/api/system/printers/route.ts - VERSIÓN CORREGIDA Y COMPLETA
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
      id: 'fukun-pos80-cc',
      name: 'Fukun POS80-CC',
      displayName: 'Fukun POS80-CC Thermal Printer',
      type: 'thermal',
      manufacturer: 'Fukun',
      model: 'POS80-CC',
      isDefault: true, // Primera impresora como predeterminada
      status: 'online', // Asumir que está en línea
      connection: 'usb',
      sucursalId: 'current', // Se asignará dinámicamente
      settings: {
        isOnline: true,
        paperWidth: 80,
        autocut: true,
        encoding: 'utf-8',
        printSpeed: 250,
        charSet: 'CP437'
      },
      capabilities: {
        paperSizes: ['80mm'],
        autocut: true,
        cashdrawer: true,
        maxWidth: 72, // mm
        resolution: '203dpi'
      }
    },
    {
      id: 'xprinter-xp-58iih',
      name: 'XPrinter XP-58IIH',
      displayName: 'XPrinter XP-58IIH',
      type: 'thermal',
      manufacturer: 'XPrinter',
      model: 'XP-58IIH',
      isDefault: false,
      status: 'unknown',
      connection: 'usb',
      sucursalId: 'current',
      settings: {
        isOnline: false,
        paperWidth: 58,
        autocut: false,
        encoding: 'utf-8'
      },
      capabilities: {
        paperSizes: ['58mm'],
        autocut: false,
        cashdrawer: true
      }
    },
    {
      id: 'epson-tm-t20iii',
      name: 'Epson TM-T20III',
      displayName: 'Epson TM-T20III',
      type: 'thermal',
      manufacturer: 'Epson',
      model: 'TM-T20III',
      isDefault: false,
      status: 'unknown',
      connection: 'usb',
      sucursalId: 'current',
      settings: {
        isOnline: false,
        paperWidth: 80,
        autocut: true,
        encoding: 'utf-8'
      },
      capabilities: {
        paperSizes: ['80mm'],
        autocut: true,
        cashdrawer: true
      }
    },
    {
      id: 'bixolon-srp-f312',
      name: 'Bixolon SRP-F312',
      displayName: 'Bixolon SRP-F312',
      type: 'thermal',
      manufacturer: 'Bixolon',
      model: 'SRP-F312',
      isDefault: false,
      status: 'unknown',
      connection: 'usb',
      sucursalId: 'current',
      settings: {
        isOnline: false,
        paperWidth: 80,
        autocut: true,
        encoding: 'utf-8'
      },
      capabilities: {
        paperSizes: ['80mm'],
        autocut: true,
        cashdrawer: true
      }
    },
    {
      id: 'generic-text-only',
      name: 'Generic / Text Only',
      displayName: 'Generic Text Printer',
      type: 'generic',
      manufacturer: 'Generic',
      isDefault: false,
      status: 'online',
      connection: 'system',
      sucursalId: 'current',
      settings: {
        isOnline: true,
        paperWidth: 80,
        autocut: false,
        encoding: 'utf-8'
      },
      capabilities: {
        paperSizes: ['A4', '80mm'],
        autocut: false,
        cashdrawer: false
      }
    }
  ];

  // Simular detección basada en user agent para tablets Android
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroidTablet = /Android/i.test(userAgent) && /Mobile/i.test(userAgent);
  
  if (isAndroidTablet) {
    // En tablets Android, es más probable que tengan impresoras USB térmicas
    console.log('🤖 Tablet Android detectada - Priorizando impresoras térmicas USB');
    return commonPrinters.filter(p => p.connection === 'usb' && p.type === 'thermal');
  }

  // Para otros dispositivos, devolver todas las opciones
  return commonPrinters;
}

// Función auxiliar para detectar impresoras via WebUSB (para uso futuro)
async function detectWebUSBPrinters() {
  if (typeof navigator === 'undefined' || !('usb' in navigator)) {
    return [];
  }

  try {
    // @ts-ignore - WebUSB API experimental
    const devices = await navigator.usb.getDevices();
    
    const printers = [];
    for (const device of devices) {
      // IDs de fabricantes conocidos de impresoras POS
      const knownManufacturers = [
        { id: 0x04b8, name: 'Epson' },
        { id: 0x0519, name: 'Star Micronics' },
        { id: 0x154f, name: 'Citizen' },
        { id: 0x1504, name: 'Bixolon' },
        { id: 0x0fe6, name: 'Boca Systems' },
        { id: 0x20d1, name: 'Rongta' },
        // Agregar más IDs según necesidades
      ];

      const manufacturer = knownManufacturers.find(m => m.id === device.vendorId);
      
      if (manufacturer || device.deviceClass === 7) { // Clase 7 = Printer
        printers.push({
          id: `usb-${device.vendorId}-${device.productId}`,
          name: device.productName || `USB Printer (${device.vendorId}:${device.productId})`,
          displayName: device.productName || `${manufacturer?.name || 'Unknown'} USB Printer`,
          type: 'thermal',
          manufacturer: manufacturer?.name || 'Unknown',
          isDefault: false,
          status: 'online',
          connection: 'usb',
          settings: {
            isOnline: true,
            paperWidth: 80,
            autocut: true,
            encoding: 'utf-8'
          }
        });
      }
    }

    return printers;
  } catch (error) {
    console.warn('Error detecting WebUSB printers:', error);
    return [];
  }
}
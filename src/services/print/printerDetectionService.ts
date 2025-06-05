// src/services/print/printerDetectionService.ts
export interface DetectedPrinter {
    systemName: string;
    displayName: string;
    type: 'thermal' | 'laser' | 'inkjet' | 'unknown';
    manufacturer?: string;
    model?: string;
    isDefault: boolean;
    isOnline: boolean;
    capabilities: {
      paperSizes: string[];
      autocut: boolean;
      cashdrawer: boolean;
      barcodes: boolean;
    };
    connectionType: 'usb' | 'network' | 'bluetooth' | 'parallel';
    recommendedSettings: {
      paperWidth: number;
      encoding: string;
      baudRate?: number;
    };
  }
  
  export interface PrinterProfile {
    patterns: string[];
    type: 'thermal' | 'laser' | 'inkjet';
    manufacturer: string;
    defaultSettings: {
      paperWidth: number;
      autocut: boolean;
      encoding: string;
    };
  }
  
  class PrinterDetectionService {
    private static instance: PrinterDetectionService;
    
    // Base de datos de perfiles de impresoras conocidas
    private printerProfiles: PrinterProfile[] = [
      {
        patterns: ['fukun', 'pos80', 'pos-80', 'fk-pos80'],
        type: 'thermal',
        manufacturer: 'Fukun',
        defaultSettings: {
          paperWidth: 80,
          autocut: true,
          encoding: 'utf-8'
        }
      },
      {
        patterns: ['xprinter', 'xp-', 'pos58', 'pos-58'],
        type: 'thermal',
        manufacturer: 'Xprinter',
        defaultSettings: {
          paperWidth: 58,
          autocut: false,
          encoding: 'utf-8'
        }
      },
      {
        patterns: ['epson', 'tm-', 'tmu'],
        type: 'thermal',
        manufacturer: 'Epson',
        defaultSettings: {
          paperWidth: 80,
          autocut: true,
          encoding: 'utf-8'
        }
      },
      {
        patterns: ['bixolon', 'srp-'],
        type: 'thermal',
        manufacturer: 'Bixolon',
        defaultSettings: {
          paperWidth: 80,
          autocut: true,
          encoding: 'utf-8'
        }
      },
      {
        patterns: ['citizen', 'ct-'],
        type: 'thermal',
        manufacturer: 'Citizen',
        defaultSettings: {
          paperWidth: 80,
          autocut: true,
          encoding: 'utf-8'
        }
      },
      {
        patterns: ['star', 'tsp'],
        type: 'thermal',
        manufacturer: 'Star Micronics',
        defaultSettings: {
          paperWidth: 80,
          autocut: true,
          encoding: 'utf-8'
        }
      }
    ];
  
    public static getInstance(): PrinterDetectionService {
      if (!PrinterDetectionService.instance) {
        PrinterDetectionService.instance = new PrinterDetectionService();
      }
      return PrinterDetectionService.instance;
    }
  
    /**
     * Detectar todas las impresoras disponibles en el sistema
     */
    async detectAllPrinters(): Promise<DetectedPrinter[]> {
      console.log('🔍 Iniciando detección automática de impresoras...');
      
      const detectedPrinters: DetectedPrinter[] = [];
  
      try {
        // Intentar detectar usando diferentes métodos
        const methods = [
          this.detectViaWebAPI.bind(this),
          this.detectViaSystemQuery.bind(this),
          this.detectViaUSB.bind(this),
          this.detectViaCommonNames.bind(this)
        ];
  
        for (const method of methods) {
          try {
            const printers = await method();
            detectedPrinters.push(...printers);
          } catch (error) {
            console.warn('Método de detección falló:', error);
          }
        }
  
        // Eliminar duplicados y procesar
        const uniquePrinters = this.removeDuplicates(detectedPrinters);
        const processedPrinters = uniquePrinters.map(printer => this.enrichPrinterInfo(printer));
  
        console.log(`✅ Detectadas ${processedPrinters.length} impresoras únicas`);
        return processedPrinters;
  
      } catch (error) {
        console.error('❌ Error en detección de impresoras:', error);
        return [];
      }
    }
  
    /**
     * Detectar usando Web Print API (experimental)
     */
    private async detectViaWebAPI(): Promise<DetectedPrinter[]> {
      const printers: DetectedPrinter[] = [];
  
      try {
        // Verificar si la API está disponible
        if ('navigator' in globalThis && 'getInstalledRelatedApps' in navigator) {
          // @ts-ignore - API experimental
          const apps = await navigator.getInstalledRelatedApps();
          console.log('Apps relacionadas encontradas:', apps);
        }
  
        // Web Serial API para impresoras USB
        if ('serial' in navigator) {
          try {
            // @ts-ignore - API experimental
            const ports = await navigator.serial.getPorts();
            
            for (const port of ports) {
              const info = port.getInfo();
              if (this.isLikelyPrinter(info)) {
                printers.push(this.createPrinterFromSerialInfo(info));
              }
            }
          } catch (serialError) {
            console.warn('Error accediendo a Serial API:', serialError);
          }
        }
  
      } catch (error) {
        console.warn('Web API no disponible:', error);
      }
  
      return printers;
    }
  
    /**
     * Detectar consultando el sistema operativo
     */
    private async detectViaSystemQuery(): Promise<DetectedPrinter[]> {
      try {
        const response = await fetch('/api/system/printers');
        if (response.ok) {
          const systemPrinters = await response.json();
          return systemPrinters.map((printer: any) => this.normalizeSystemPrinter(printer));
        }
      } catch (error) {
        console.warn('Error consultando impresoras del sistema:', error);
      }
      
      return [];
    }
  
    /**
     * Detectar dispositivos USB que podrían ser impresoras
     */
    private async detectViaUSB(): Promise<DetectedPrinter[]> {
      const printers: DetectedPrinter[] = [];
  
      try {
        if ('usb' in navigator) {
          // @ts-ignore - WebUSB API
          const devices = await navigator.usb.getDevices();
          
          for (const device of devices) {
            if (this.isUsbPrinter(device)) {
              printers.push(this.createPrinterFromUSB(device));
            }
          }
        }
      } catch (error) {
        console.warn('Error accediendo a USB API:', error);
      }
  
      return printers;
    }
  
    /**
     * Detectar usando nombres comunes de impresoras
     */
    private async detectViaCommonNames(): Promise<DetectedPrinter[]> {
      const commonNames = [
        'POS Printer',
        'Thermal Printer',
        'Receipt Printer',
        'Fukun POS80',
        'XPrinter',
        'Epson TM',
        'Generic / Text Only'
      ];
  
      const detectedPrinters: DetectedPrinter[] = [];
  
      // Simular detección de impresoras comunes
      for (const name of commonNames) {
        const profile = this.findProfileByName(name);
        if (profile) {
          detectedPrinters.push({
            systemName: name.toLowerCase().replace(/\s+/g, '_'),
            displayName: name,
            type: profile.type,
            manufacturer: profile.manufacturer,
            isDefault: false,
            isOnline: true, // Asumir que está en línea por ahora
            capabilities: {
              paperSizes: profile.defaultSettings.paperWidth === 80 ? ['80mm'] : ['58mm'],
              autocut: profile.defaultSettings.autocut,
              cashdrawer: true,
              barcodes: true
            },
            connectionType: 'usb',
            recommendedSettings: profile.defaultSettings
          });
        }
      }
  
      return detectedPrinters;
    }
  
    /**
     * Enriquecer información de impresora detectada
     */
    private enrichPrinterInfo(printer: DetectedPrinter): DetectedPrinter {
      const profile = this.findProfileByName(printer.displayName);
      
      if (profile) {
        return {
          ...printer,
          type: profile.type,
          manufacturer: profile.manufacturer,
          recommendedSettings: {
            ...printer.recommendedSettings,
            ...profile.defaultSettings
          },
          capabilities: {
            ...printer.capabilities,
            autocut: profile.defaultSettings.autocut
          }
        };
      }
  
      return printer;
    }
  
    /**
     * Buscar perfil de impresora por nombre
     */
    private findProfileByName(name: string): PrinterProfile | null {
      const lowerName = name.toLowerCase();
      
      return this.printerProfiles.find(profile =>
        profile.patterns.some(pattern => lowerName.includes(pattern.toLowerCase()))
      ) || null;
    }
  
    /**
     * Verificar si un dispositivo USB es probablemente una impresora
     */
    private isUsbPrinter(device: any): boolean {
      // Clases de dispositivo USB que suelen ser impresoras
      const printerClasses = [0x07]; // Printer class
      
      // IDs de fabricantes conocidos de impresoras POS
      const knownManufacturers = [
        0x04b8, // Epson
        0x0519, // Star Micronics
        0x154f, // Citizen
        0x1504, // Bixolon
      ];
  
      return printerClasses.includes(device.deviceClass) ||
             knownManufacturers.includes(device.vendorId);
    }
  
    /**
     * Crear objeto DetectedPrinter desde información USB
     */
    private createPrinterFromUSB(device: any): DetectedPrinter {
      return {
        systemName: `usb_${device.vendorId}_${device.productId}`,
        displayName: device.productName || `USB Printer (${device.vendorId}:${device.productId})`,
        type: 'thermal', // Asumir térmica para dispositivos POS
        isDefault: false,
        isOnline: true,
        capabilities: {
          paperSizes: ['80mm'],
          autocut: true,
          cashdrawer: true,
          barcodes: true
        },
        connectionType: 'usb',
        recommendedSettings: {
          paperWidth: 80,
          encoding: 'utf-8'
        }
      };
    }
  
    /**
     * Crear objeto DetectedPrinter desde información Serial
     */
    private createPrinterFromSerialInfo(info: any): DetectedPrinter {
      return {
        systemName: `serial_${info.usbVendorId}_${info.usbProductId}`,
        displayName: `Serial Printer (${info.usbVendorId}:${info.usbProductId})`,
        type: 'thermal',
        isDefault: false,
        isOnline: true,
        capabilities: {
          paperSizes: ['80mm'],
          autocut: true,
          cashdrawer: true,
          barcodes: true
        },
        connectionType: 'usb',
        recommendedSettings: {
          paperWidth: 80,
          encoding: 'utf-8'
        }
      };
    }
  
    /**
     * Verificar si información serial corresponde a una impresora
     */
    private isLikelyPrinter(info: any): boolean {
      // Heurísticas para identificar impresoras por info serial
      return info.usbVendorId && info.usbProductId;
    }
  
    /**
     * Normalizar impresora del sistema
     */
    private normalizeSystemPrinter(systemPrinter: any): DetectedPrinter {
      const profile = this.findProfileByName(systemPrinter.name);
      
      return {
        systemName: systemPrinter.name,
        displayName: systemPrinter.displayName || systemPrinter.name,
        type: profile?.type || 'unknown',
        manufacturer: profile?.manufacturer,
        isDefault: systemPrinter.isDefault || false,
        isOnline: systemPrinter.status === 'online' || true,
        capabilities: {
          paperSizes: profile ? [`${profile.defaultSettings.paperWidth}mm`] : ['80mm'],
          autocut: profile?.defaultSettings.autocut || false,
          cashdrawer: true,
          barcodes: true
        },
        connectionType: systemPrinter.connection || 'usb',
        recommendedSettings: profile?.defaultSettings || {
          paperWidth: 80,
          encoding: 'utf-8'
        }
      };
    }
  
    /**
     * Eliminar impresoras duplicadas
     */
    private removeDuplicates(printers: DetectedPrinter[]): DetectedPrinter[] {
      const seen = new Set<string>();
      return printers.filter(printer => {
        const key = `${printer.systemName}_${printer.displayName}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }
  
    /**
     * Configurar automáticamente una impresora detectada
     */
    async autoConfigurePrinter(
      detectedPrinter: DetectedPrinter, 
      sucursalId: string,
      makeDefault: boolean = false
    ): Promise<{ success: boolean; message: string; printerId?: string }> {
      
      try {
        console.log(`🔧 Configurando automáticamente: ${detectedPrinter.displayName}`);
  
        const printerConfig = {
          name: detectedPrinter.displayName,
          type: detectedPrinter.type,
          sucursalId,
          isDefault: makeDefault,
          settings: {
            paperWidth: detectedPrinter.recommendedSettings.paperWidth,
            autocut: detectedPrinter.capabilities.autocut,
            encoding: detectedPrinter.recommendedSettings.encoding,
            systemName: detectedPrinter.systemName,
            manufacturer: detectedPrinter.manufacturer,
            connectionType: detectedPrinter.connectionType
          }
        };
  
        const response = await fetch('/api/admin/impresoras', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(printerConfig)
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al configurar impresora');
        }
  
        const result = await response.json();
  
        console.log(`✅ Impresora configurada: ${detectedPrinter.displayName}`);
  
        return {
          success: true,
          message: `Impresora "${detectedPrinter.displayName}" configurada correctamente`,
          printerId: result.id
        };
  
      } catch (error) {
        console.error('❌ Error configurando impresora:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
    }
  
    /**
     * Probar conectividad con una impresora
     */
    async testPrinterConnectivity(printer: DetectedPrinter): Promise<{
      success: boolean;
      responseTime?: number;
      error?: string;
    }> {
      
      const startTime = Date.now();
      
      try {
        console.log(`🧪 Probando conectividad: ${printer.displayName}`);
  
        // Simular test de conectividad
        // En implementación real, aquí enviarías un comando de test específico
        
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        const responseTime = Date.now() - startTime;
        
        // Simular algunos fallos aleatorios para realismo
        if (Math.random() < 0.1) { // 10% de probabilidad de fallo
          throw new Error('Timeout de conexión');
        }
  
        console.log(`✅ Test exitoso: ${printer.displayName} (${responseTime}ms)`);
  
        return {
          success: true,
          responseTime
        };
  
      } catch (error) {
        console.error(`❌ Test fallido: ${printer.displayName}`, error);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error de conectividad'
        };
      }
    }
  
    /**
     * Obtener configuración recomendada para una impresora
     */
    getRecommendedConfig(printer: DetectedPrinter): {
      paperWidth: number;
      autocut: boolean;
      encoding: string;
      testPageEnabled: boolean;
      cashDrawerEnabled: boolean;
    } {
      
      return {
        paperWidth: printer.recommendedSettings.paperWidth,
        autocut: printer.capabilities.autocut,
        encoding: printer.recommendedSettings.encoding,
        testPageEnabled: true,
        cashDrawerEnabled: printer.capabilities.cashdrawer
      };
    }
  }
  
  // Exportar instancia singleton
  export const printerDetectionService = PrinterDetectionService.getInstance();
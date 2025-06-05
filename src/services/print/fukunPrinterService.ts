// src/services/print/fukunPrinterService.ts
export interface FukunPOS80Config {
    paperWidth: 80; // mm
    printWidth: 72; // mm (576 dots)
    resolution: 203; // DPI
    charSet: 'CP437' | 'UTF-8';
    printSpeed: 250; // mm/s
    autocut: boolean;
    cashdrawer: boolean;
    interface: 'USB' | 'LAN' | 'Bluetooth';
  }
  
  export class FukunPrinterService {
    private static readonly FUKUN_VENDOR_ID = 0x154F; // ID típico para Fukun
    private static readonly POS80_PRODUCT_ID = 0x80CC;
    
    // Comandos ESC/POS específicos para Fukun POS80-CC
    private static readonly COMMANDS = {
      INIT: new Uint8Array([0x1B, 0x40]), // ESC @
      CUT: new Uint8Array([0x1D, 0x56, 0x00]), // GS V 0
      CASHDRAWER: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]), // ESC p 0 25 250
      ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]), // ESC a 1
      ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]), // ESC a 0
      FONT_SMALL: new Uint8Array([0x1B, 0x21, 0x01]), // ESC ! 1
      FONT_NORMAL: new Uint8Array([0x1B, 0x21, 0x00]), // ESC ! 0
      FONT_BOLD: new Uint8Array([0x1B, 0x45, 0x01]), // ESC E 1
      FONT_BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]), // ESC E 0
      LINE_FEED: new Uint8Array([0x0A]), // LF
      PAPER_FEED: new Uint8Array([0x1B, 0x64, 0x02]), // ESC d 2
    };
  
    static getDefaultConfig(): FukunPOS80Config {
      return {
        paperWidth: 80,
        printWidth: 72,
        resolution: 203,
        charSet: 'UTF-8',
        printSpeed: 250,
        autocut: true,
        cashdrawer: true,
        interface: 'USB'
      };
    }
  
    static async detectFukunPrinter(): Promise<boolean> {
      try {
        // Intentar detectar via WebUSB (en Chrome/Edge)
        if ('usb' in navigator) {
          const devices = await (navigator as any).usb.getDevices();
          
          for (const device of devices) {
            if (device.vendorId === this.FUKUN_VENDOR_ID && 
                device.productId === this.POS80_PRODUCT_ID) {
              console.log('✅ Fukun POS80-CC detectada via USB');
              return true;
            }
          }
        }
  
        // Intentar detectar via Web Serial (alternativa)
        if ('serial' in navigator) {
          const ports = await (navigator as any).serial.getPorts();
          
          for (const port of ports) {
            const info = port.getInfo();
            if (info.usbVendorId === this.FUKUN_VENDOR_ID) {
              console.log('✅ Fukun POS80-CC detectada via Serial');
              return true;
            }
          }
        }
  
        console.log('⚠️ Fukun POS80-CC no detectada automáticamente');
        return false;
      } catch (error) {
        console.error('Error detectando Fukun POS80-CC:', error);
        return false;
      }
    }
  
    static async requestUSBPermission(): Promise<boolean> {
      try {
        if (!('usb' in navigator)) {
          throw new Error('WebUSB no soportado en este navegador');
        }
  
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: this.FUKUN_VENDOR_ID },
            { vendorId: 0x04b8 }, // Epson
            { vendorId: 0x0519 }, // Star Micronics
            { classCode: 7 } // Printer class
          ]
        });
  
        if (device) {
          console.log('✅ Permiso USB concedido para:', device);
          return true;
        }
  
        return false;
      } catch (error) {
        console.error('Error solicitando permiso USB:', error);
        return false;
      }
    }
  
    static generateESCPOSCommands(facturaData: any, config: FukunPOS80Config): Uint8Array {
      const commands: number[] = [];
      
      // Inicializar impresora
      commands.push(...this.COMMANDS.INIT);
      
      // Header centrado
      commands.push(...this.COMMANDS.ALIGN_CENTER);
      commands.push(...this.COMMANDS.FONT_BOLD);
      commands.push(...this.textToBytes('TULUM AROMATERAPIA'));
      commands.push(...this.COMMANDS.LINE_FEED);
      commands.push(...this.COMMANDS.FONT_BOLD_OFF);
      
      // Tipo de factura
      commands.push(...this.textToBytes(`FACTURA ${facturaData.tipoComprobante}`));
      commands.push(...this.COMMANDS.LINE_FEED);
      
      // Número de factura
      commands.push(...this.textToBytes(`N° ${facturaData.numeroFactura}`));
      commands.push(...this.COMMANDS.LINE_FEED);
      commands.push(...this.COMMANDS.LINE_FEED);
      
      // Información de venta (alineado a la izquierda)
      commands.push(...this.COMMANDS.ALIGN_LEFT);
      commands.push(...this.textToBytes(`Fecha: ${new Date(facturaData.fechaEmision).toLocaleDateString('es-AR')}`));
      commands.push(...this.COMMANDS.LINE_FEED);
      
      if (facturaData.venta.clienteNombre) {
        commands.push(...this.textToBytes(`Cliente: ${facturaData.venta.clienteNombre}`));
        commands.push(...this.COMMANDS.LINE_FEED);
        
        if (facturaData.venta.clienteCuit) {
          commands.push(...this.textToBytes(`CUIT: ${facturaData.venta.clienteCuit}`));
          commands.push(...this.COMMANDS.LINE_FEED);
        }
      }
      
      // Línea separadora
      commands.push(...this.COMMANDS.LINE_FEED);
      commands.push(...this.textToBytes('----------------------------------------'));
      commands.push(...this.COMMANDS.LINE_FEED);
      
      // Items
      for (const item of facturaData.venta.items) {
        const producto = this.truncateText(item.producto.nombre, 32);
        const cantidad = item.cantidad;
        const precio = item.precioUnitario.toFixed(2);
        const subtotal = (cantidad * item.precioUnitario).toFixed(2);
        
        commands.push(...this.textToBytes(producto));
        commands.push(...this.COMMANDS.LINE_FEED);
        commands.push(...this.textToBytes(`${cantidad} x $${precio} = $${subtotal}`));
        commands.push(...this.COMMANDS.LINE_FEED);
      }
      
      // Total
      commands.push(...this.textToBytes('----------------------------------------'));
      commands.push(...this.COMMANDS.LINE_FEED);
      commands.push(...this.COMMANDS.ALIGN_CENTER);
      commands.push(...this.COMMANDS.FONT_BOLD);
      commands.push(...this.textToBytes(`TOTAL: $${facturaData.venta.total.toFixed(2)}`));
      commands.push(...this.COMMANDS.FONT_BOLD_OFF);
      commands.push(...this.COMMANDS.LINE_FEED);
      commands.push(...this.COMMANDS.LINE_FEED);
      
      // CAE
      if (facturaData.cae) {
        commands.push(...this.COMMANDS.ALIGN_LEFT);
        commands.push(...this.textToBytes(`CAE: ${facturaData.cae}`));
        commands.push(...this.COMMANDS.LINE_FEED);
        commands.push(...this.textToBytes(`Vto: ${new Date(facturaData.vencimientoCae).toLocaleDateString('es-AR')}`));
        commands.push(...this.COMMANDS.LINE_FEED);
      }
      
      // Espacio final y corte
      commands.push(...this.COMMANDS.PAPER_FEED);
      
      if (config.autocut) {
        commands.push(...this.COMMANDS.CUT);
      }
      
      return new Uint8Array(commands);
    }
  
    private static textToBytes(text: string): number[] {
      // Convertir texto a bytes usando codificación Latin-1 para impresoras térmicas
      const bytes: number[] = [];
      for (let i = 0; i < text.length; i++) {
        let charCode = text.charCodeAt(i);
        
        // Mapear caracteres especiales del español
        const specialChars: { [key: string]: number } = {
          'á': 0xA0, 'é': 0x82, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3,
          'ñ': 0xA4, 'Ñ': 0xA5, '°': 0xF8, '$': 0x24
        };
        
        const char = text.charAt(i);
        if (specialChars[char]) {
          charCode = specialChars[char];
        } else if (charCode > 127) {
          charCode = 63; // '?' para caracteres no soportados
        }
        
        bytes.push(charCode);
      }
      return bytes;
    }
  
    private static truncateText(text: string, maxLength: number): string {
      return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }
  
    // Método para abrir cajón de dinero (si está conectado)
    static async openCashDrawer(device?: any): Promise<boolean> {
      try {
        if (device && device.opened) {
          await device.transferOut(1, this.COMMANDS.CASHDRAWER);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error abriendo cajón:', error);
        return false;
      }
    }
  
    // Test de conectividad específico para Fukun
    static async testFukunConnectivity(): Promise<{
      success: boolean;
      method?: string;
      error?: string;
    }> {
      try {
        // Test 1: WebUSB
        if ('usb' in navigator) {
          const devices = await (navigator as any).usb.getDevices();
          for (const device of devices) {
            if (device.vendorId === this.FUKUN_VENDOR_ID) {
              return { success: true, method: 'WebUSB' };
            }
          }
        }
  
        // Test 2: Web Serial
        if ('serial' in navigator) {
          const ports = await (navigator as any).serial.getPorts();
          for (const port of ports) {
            const info = port.getInfo();
            if (info.usbVendorId === this.FUKUN_VENDOR_ID) {
              return { success: true, method: 'Web Serial' };
            }
          }
        }
  
        // Test 3: Simulación (para desarrollo)
        if (process.env.NODE_ENV === 'development') {
          return { success: true, method: 'Simulation' };
        }
  
        return { 
          success: false, 
          error: 'Fukun POS80-CC no detectada. Verifique conexión USB.' 
        };
  
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Error de conectividad' 
        };
      }
    }
  }
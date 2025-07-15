// src/services/print/fukunPrintServiceFixed.ts - SOLUCIÓN INTEGRADA
export class FukunPrintServiceFixed {
    private device: USBDevice | null = null;
    private isConnected = false;
    private endpoint: USBEndpoint | null = null;
  
    // IDs específicos para impresoras POS comunes (incluyendo Fukun)
    private static readonly VENDOR_IDS = [
      0x154F, // Citizen (Fukun usa chips Citizen)
      0x0519, // Star Micronics
      0x04B8, // Epson
      0x20D1, // Rongta/Fukun
      0x0483, // STMicroelectronics (usado por algunas Fukun)
    ];
  
    // Comandos ESC/POS optimizados para Fukun 80mm
    private static readonly COMMANDS = {
      INIT: [0x1B, 0x40], // ESC @ - Inicializar
      CUT: [0x1D, 0x56, 0x00], // GS V 0 - Corte completo
      PARTIAL_CUT: [0x1D, 0x56, 0x01], // GS V 1 - Corte parcial
      
      // Alineación
      ALIGN_LEFT: [0x1B, 0x61, 0x00],
      ALIGN_CENTER: [0x1B, 0x61, 0x01],
      ALIGN_RIGHT: [0x1B, 0x61, 0x02],
      
      // Formato texto
      FONT_NORMAL: [0x1B, 0x21, 0x00],
      FONT_BOLD_ON: [0x1B, 0x45, 0x01],
      FONT_BOLD_OFF: [0x1B, 0x45, 0x00],
      FONT_DOUBLE_HEIGHT: [0x1B, 0x21, 0x10],
      FONT_DOUBLE_WIDTH: [0x1B, 0x21, 0x20],
      
      // Control
      LINE_FEED: [0x0A],
      CARRIAGE_RETURN: [0x0D],
      
      // Cajón (Fukun específico)
      OPEN_DRAWER: [0x1B, 0x70, 0x00, 0x19, 0xFA], // ESC p 0 25 250
    };
  
    /**
     * PASO 1: Conectar automáticamente a la impresora Fukun
     */
    async connectToFukun(): Promise<{ success: boolean; message: string }> {
      try {
        console.log('🔌 Conectando a impresora Fukun...');
  
        // Primero intentar con dispositivos ya emparejados
        const devices = await navigator.usb.getDevices();
        let targetDevice: USBDevice | null = null;
  
        for (const device of devices) {
          if (this.isFukunPrinter(device)) {
            targetDevice = device;
            break;
          }
        }
  
        // Si no hay dispositivos emparejados, solicitar permiso
        if (!targetDevice) {
          console.log('📱 Solicitando acceso a dispositivo USB...');
          
          try {
            targetDevice = await navigator.usb.requestDevice({
              filters: [
                // Filtros específicos para impresoras POS
                ...FukunPrintServiceFixed.VENDOR_IDS.map(vendorId => ({ vendorId })),
                { classCode: 7 }, // Clase impresora
                { classCode: 255 }, // Clase vendor-specific (común en POS)
              ]
            });
          } catch (error) {
            return {
              success: false,
              message: 'Usuario canceló la selección de dispositivo o no se encontró impresora compatible'
            };
          }
        }
  
        if (!targetDevice) {
          return {
            success: false,
            message: 'No se encontró impresora Fukun compatible'
          };
        }
  
        // Configurar dispositivo
        await this.setupDevice(targetDevice);
  
        return {
          success: true,
          message: `Conectado a ${targetDevice.productName || 'Impresora Fukun'}`
        };
  
      } catch (error) {
        console.error('❌ Error conectando:', error);
        return {
          success: false,
          message: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  
    /**
     * Configurar dispositivo USB para comunicación
     */
    private async setupDevice(device: USBDevice): Promise<void> {
      try {
        // Abrir dispositivo
        if (!device.opened) {
          await device.open();
        }
  
        // Seleccionar configuración
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }
  
        // Buscar interfaz de impresora
        let printerInterface: USBInterface | null = null;
        
        for (const iface of device.configuration!.interfaces) {
          for (const alternate of iface.alternates) {
            // Buscar clase de impresora (7) o vendor-specific (255)
            if (alternate.interfaceClass === 7 || alternate.interfaceClass === 255) {
              printerInterface = iface;
              break;
            }
          }
          if (printerInterface) break;
        }
  
        if (!printerInterface) {
          throw new Error('No se encontró interfaz de impresora en el dispositivo');
        }
  
        // Reclamar interfaz
        await device.claimInterface(printerInterface.interfaceNumber);
  
        // Buscar endpoint de salida
        const alternate = printerInterface.alternates[0];
        this.endpoint = alternate.endpoints.find(ep => ep.direction === 'out') || null;
  
        if (!this.endpoint) {
          throw new Error('No se encontró endpoint de salida');
        }
  
        this.device = device;
        this.isConnected = true;
  
        console.log('✅ Dispositivo configurado correctamente');
        console.log(`📋 Interfaz: ${printerInterface.interfaceNumber}, Endpoint: ${this.endpoint.endpointNumber}`);
  
      } catch (error) {
        console.error('❌ Error configurando dispositivo:', error);
        throw error;
      }
    }
  
    /**
     * PASO 2: Función principal para imprimir facturas
     */
    async printFactura(facturaData: any): Promise<{ success: boolean; message: string }> {
      if (!this.isConnected || !this.device || !this.endpoint) {
        return {
          success: false,
          message: 'Impresora no conectada. Use connectToFukun() primero.'
        };
      }
  
      try {
        console.log('🖨️ Generando contenido de factura...');
        
        const printData = this.generateFacturaCommands(facturaData);
        
        console.log('📤 Enviando datos a impresora...');
        await this.sendDataToDevice(printData);
        
        return {
          success: true,
          message: 'Factura impresa correctamente'
        };
  
      } catch (error) {
        console.error('❌ Error imprimiendo factura:', error);
        return {
          success: false,
          message: `Error de impresión: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  
    /**
     * PASO 3: Generar comandos ESC/POS para la factura
     */
    private generateFacturaCommands(facturaData: any): Uint8Array {
      const commands: number[] = [];
  
      // Inicializar impresora
      commands.push(...FukunPrintServiceFixed.COMMANDS.INIT);
  
      // Header centrado
      commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
      commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
      commands.push(...this.textToBytes('TULUM AROMATERAPIA'));
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
  
      // Tipo de factura
      commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_DOUBLE_HEIGHT);
      commands.push(...this.textToBytes(`FACTURA ${facturaData.tipoComprobante || 'B'}`));
      commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_NORMAL);
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
      // Número de factura
      const numeroFactura = String(facturaData.numeroFactura || '00000001').padStart(8, '0');
      commands.push(...this.textToBytes(`N° ${numeroFactura}`));
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
      // Fecha y cliente (izquierda)
      commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_LEFT);
      commands.push(...this.textToBytes(`Fecha: ${new Date().toLocaleDateString('es-AR')}`));
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
      if (facturaData.venta?.clienteNombre) {
        commands.push(...this.textToBytes(`Cliente: ${facturaData.venta.clienteNombre}`));
        commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      }
  
      // Línea separadora
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      commands.push(...this.textToBytes('----------------------------------------'));
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
      // Items de la venta
      if (facturaData.venta?.items) {
        for (const item of facturaData.venta.items) {
          // Nombre del producto (truncado a 32 chars para 80mm)
          const nombreProducto = this.truncateText(item.producto?.nombre || 'Producto', 32);
          commands.push(...this.textToBytes(nombreProducto));
          commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
          // Cantidad x precio = subtotal
          const cantidad = item.cantidad || 1;
          const precio = (item.precioUnitario || 0).toFixed(2);
          const subtotal = (cantidad * (item.precioUnitario || 0)).toFixed(2);
          
          const lineaDetalle = `${cantidad} x $${precio} = $${subtotal}`;
          commands.push(...this.textToBytes(lineaDetalle));
          commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        }
      }
  
      // Total
      commands.push(...this.textToBytes('----------------------------------------'));
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
      commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_DOUBLE_HEIGHT);
      commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
      
      const total = (facturaData.venta?.total || 0).toFixed(2);
      commands.push(...this.textToBytes(`TOTAL: $${total}`));
      
      commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_NORMAL);
      commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
      // CAE (si existe)
      if (facturaData.cae) {
        commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_LEFT);
        commands.push(...this.textToBytes(`CAE: ${facturaData.cae}`));
        commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        
        if (facturaData.vencimientoCae) {
          const vencimiento = new Date(facturaData.vencimientoCae).toLocaleDateString('es-AR');
          commands.push(...this.textToBytes(`Vencimiento: ${vencimiento}`));
          commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        }
      }
  
      // Footer
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
      commands.push(...this.textToBytes('Gracias por su compra!'));
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
      // Alimentar papel y cortar
      commands.push(...[0x1B, 0x64, 0x03]); // Alimentar 3 líneas
      commands.push(...FukunPrintServiceFixed.COMMANDS.CUT);
  
      return new Uint8Array(commands);
    }
  
    /**
     * PASO 4: Test de impresión
     */
    async printTest(): Promise<{ success: boolean; message: string }> {
      if (!this.isConnected || !this.device || !this.endpoint) {
        return {
          success: false,
          message: 'Impresora no conectada'
        };
      }
  
      try {
        const testCommands: number[] = [];
  
        // Inicializar
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.INIT);
        
        // Header
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
        testCommands.push(...this.textToBytes('FUKUN 80 POS TEST'));
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
        // Información
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_LEFT);
        testCommands.push(...this.textToBytes(`Fecha: ${new Date().toLocaleString('es-AR')}`));
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        testCommands.push(...this.textToBytes('Estado: FUNCIONANDO CORRECTAMENTE'));
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        testCommands.push(...this.textToBytes('Papel: 80mm termico'));
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        testCommands.push(...this.textToBytes('Conexion: USB OTG'));
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
        // Test de caracteres especiales
        testCommands.push(...this.textToBytes('Caracteres especiales:'));
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        testCommands.push(...this.textToBytes('áéíóú ñÑ ¿¡ $°'));
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
        // Confirmación
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
        testCommands.push(...this.textToBytes('TEST EXITOSO'));
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
        // Cortar
        testCommands.push(...[0x1B, 0x64, 0x03]);
        testCommands.push(...FukunPrintServiceFixed.COMMANDS.CUT);
  
        const testData = new Uint8Array(testCommands);
        await this.sendDataToDevice(testData);
  
        return {
          success: true,
          message: 'Test de impresión enviado correctamente'
        };
  
      } catch (error) {
        console.error('❌ Error en test:', error);
        return {
          success: false,
          message: `Error en test: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  
    /**
     * Enviar datos al dispositivo USB
     */
    private async sendDataToDevice(data: Uint8Array): Promise<void> {
      if (!this.device || !this.endpoint) {
        throw new Error('Dispositivo no configurado');
      }
  
      try {
        console.log(`📤 Enviando ${data.length} bytes a la impresora...`);
        
        const result = await this.device.transferOut(this.endpoint.endpointNumber, data);
        
        if (result.status !== 'ok') {
          throw new Error(`Error en transferencia: ${result.status}`);
        }
  
        console.log(`✅ ${result.bytesWritten} bytes enviados correctamente`);
  
      } catch (error) {
        console.error('❌ Error enviando datos:', error);
        throw error;
      }
    }
  
    /**
     * Abrir cajón de dinero
     */
    async openCashDrawer(): Promise<{ success: boolean; message: string }> {
      if (!this.isConnected || !this.device || !this.endpoint) {
        return {
          success: false,
          message: 'Impresora no conectada'
        };
      }
  
      try {
        const drawerCommand = new Uint8Array(FukunPrintServiceFixed.COMMANDS.OPEN_DRAWER);
        await this.sendDataToDevice(drawerCommand);
  
        return {
          success: true,
          message: 'Cajón abierto correctamente'
        };
      } catch (error) {
        return {
          success: false,
          message: `Error abriendo cajón: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  
    /**
     * Utilidades
     */
    private isFukunPrinter(device: USBDevice): boolean {
      // Verificar por vendor ID
      if (FukunPrintServiceFixed.VENDOR_IDS.includes(device.vendorId)) {
        return true;
      }
  
      // Verificar por nombre del producto
      const productName = (device.productName || '').toLowerCase();
      const fukunKeywords = ['fukun', 'pos80', 'pos-80', 'thermal', 'receipt'];
      
      return fukunKeywords.some(keyword => productName.includes(keyword));
    }
  
    private textToBytes(text: string): number[] {
      // Convertir texto a bytes con soporte para caracteres españoles
      const encoder = new TextEncoder();
      const encoded = encoder.encode(text);
      return Array.from(encoded);
    }
  
    private truncateText(text: string, maxLength: number): string {
      if (text.length <= maxLength) {
        return text;
      }
      return text.substring(0, maxLength - 3) + '...';
    }
  
    /**
     * Desconectar
     */
    async disconnect(): Promise<void> {
      if (this.device) {
        try {
          await this.device.close();
        } catch (error) {
          console.warn('Error cerrando dispositivo:', error);
        }
      }
  
      this.device = null;
      this.endpoint = null;
      this.isConnected = false;
    }
  
    /**
     * Estado de conexión
     */
    getConnectionStatus(): {
      connected: boolean;
      deviceName?: string;
      vendorId?: number;
      productId?: number;
    } {
      return {
        connected: this.isConnected,
        deviceName: this.device?.productName,
        vendorId: this.device?.vendorId,
        productId: this.device?.productId
      };
    }
  }
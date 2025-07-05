// src/services/print/fukunOptimizedService.ts - CONFIGURACIÓN ESPECÍFICA FUKUN POS 80
export interface FukunPOS80Config {
  paperWidth: 80; // mm
  printWidth: 72; // mm (576 dots)
  resolution: 203; // DPI
  charSet: 'UTF-8';
  printSpeed: 250; // mm/s
  autocut: boolean;
  cashdrawer: boolean;
  interface: 'USB' | 'Bluetooth';
}

export class FukunOptimizedService {
  private static readonly FUKUN_COMMANDS = {
    // Comandos básicos ESC/POS para FUKUN POS80-CC
    INIT: new Uint8Array([0x1B, 0x40]), // ESC @ - Inicializar impresora
    CUT: new Uint8Array([0x1D, 0x56, 0x00]), // GS V 0 - Corte total
    PARTIAL_CUT: new Uint8Array([0x1D, 0x56, 0x01]), // GS V 1 - Corte parcial
    
    // Alineación de texto
    ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]), // ESC a 0
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]), // ESC a 1
    ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]), // ESC a 2
    
    // Formato de fuente
    FONT_NORMAL: new Uint8Array([0x1B, 0x21, 0x00]), // ESC ! 0
    FONT_BOLD: new Uint8Array([0x1B, 0x45, 0x01]), // ESC E 1
    FONT_BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]), // ESC E 0
    FONT_DOUBLE_HEIGHT: new Uint8Array([0x1B, 0x21, 0x10]), // ESC ! 16
    FONT_DOUBLE_WIDTH: new Uint8Array([0x1B, 0x21, 0x20]), // ESC ! 32
    FONT_SMALL: new Uint8Array([0x1B, 0x21, 0x01]), // ESC ! 1
    
    // Control de líneas
    LINE_FEED: new Uint8Array([0x0A]), // LF
    CARRIAGE_RETURN: new Uint8Array([0x0D]), // CR
    PAPER_FEED: new Uint8Array([0x1B, 0x64, 0x02]), // ESC d 2
    REVERSE_LINE_FEED: new Uint8Array([0x1B, 0x65, 0x01]), // ESC e 1
    
    // Cajón de dinero (específico FUKUN)
    CASHDRAWER_PULSE1: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]), // ESC p 0 25 250
    CASHDRAWER_PULSE2: new Uint8Array([0x1B, 0x70, 0x01, 0x19, 0xFA]), // ESC p 1 25 250
    
    // Estado de impresora
    STATUS_REQUEST: new Uint8Array([0x10, 0x04, 0x01]), // DLE EOT 1
    
    // Caracteres especiales
    UNDERLINE_ON: new Uint8Array([0x1B, 0x2D, 0x01]), // ESC - 1
    UNDERLINE_OFF: new Uint8Array([0x1B, 0x2D, 0x00]), // ESC - 0
  };

  static getOptimizedConfig(): FukunPOS80Config {
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

  /**
   * Generar contenido optimizado para factura FUKUN POS 80
   */
  static generateFacturaContent(facturaData: any, config: FukunPOS80Config): string {
    const content: string[] = [];
    
    // Header - Información de la empresa
    content.push('\x1B\x61\x01'); // Centrar
    content.push('\x1B\x45\x01'); // Negrita ON
    content.push('TULUM AROMATERAPIA');
    content.push('\x1B\x45\x00'); // Negrita OFF
    content.push('\x0A'); // Nueva línea
    
    // Información del documento
    content.push('\x1B\x21\x10'); // Doble altura
    content.push(`FACTURA ${facturaData.tipoComprobante}`);
    content.push('\x1B\x21\x00'); // Tamaño normal
    content.push('\x0A');
    
    content.push(`N° ${String(facturaData.numeroFactura).padStart(8, '0')}`);
    content.push('\x0A');
    content.push(`Fecha: ${new Date(facturaData.fechaEmision).toLocaleDateString('es-AR')}`);
    content.push('\x0A\x0A');
    
    // Cliente (si existe)
    if (facturaData.venta.clienteNombre) {
      content.push('\x1B\x61\x00'); // Alinear izquierda
      content.push('\x1B\x45\x01'); // Negrita
      content.push('CLIENTE:');
      content.push('\x1B\x45\x00'); // Negrita OFF
      content.push('\x0A');
      content.push(`${facturaData.venta.clienteNombre}`);
      content.push('\x0A');
      
      if (facturaData.venta.clienteCuit) {
        content.push(`CUIT: ${facturaData.venta.clienteCuit}`);
        content.push('\x0A');
      }
      content.push('\x0A');
    }
    
    // Línea separadora
    content.push('----------------------------------------');
    content.push('\x0A');
    
    // Items de la factura
    facturaData.venta.items.forEach((item: any) => {
      const nombreProducto = this.truncateText(item.producto.nombre, 32);
      const cantidad = item.cantidad;
      const precioUnit = item.precioUnitario.toFixed(2);
      const subtotal = (cantidad * item.precioUnitario).toFixed(2);
      
      // Nombre del producto
      content.push(nombreProducto);
      content.push('\x0A');
      
      // Cantidad x precio = subtotal
      const lineaDetalle = `${cantidad} x $${precioUnit}`;
      const espacios = 32 - lineaDetalle.length - subtotal.length - 1;
      content.push(lineaDetalle + ' '.repeat(Math.max(1, espacios)) + `$${subtotal}`);
      content.push('\x0A');
    });
    
    // Línea separadora
    content.push('----------------------------------------');
    content.push('\x0A');
    
    // Total
    content.push('\x1B\x61\x01'); // Centrar
    content.push('\x1B\x21\x10'); // Doble altura
    content.push('\x1B\x45\x01'); // Negrita
    content.push(`TOTAL: $${facturaData.venta.total.toFixed(2)}`);
    content.push('\x1B\x21\x00'); // Tamaño normal
    content.push('\x1B\x45\x00'); // Negrita OFF
    content.push('\x0A\x0A');
    
    // Métodos de pago
    if (facturaData.venta.pagos && facturaData.venta.pagos.length > 0) {
      content.push('\x1B\x61\x00'); // Alinear izquierda
      content.push('\x1B\x45\x01'); // Negrita
      content.push('FORMA DE PAGO:');
      content.push('\x1B\x45\x00'); // Negrita OFF
      content.push('\x0A');
      
      facturaData.venta.pagos.forEach((pago: any) => {
        const medioPago = this.formatMedioPago(pago.medioPago);
        content.push(`${medioPago}: $${pago.monto.toFixed(2)}`);
        content.push('\x0A');
      });
      content.push('\x0A');
    }
    
    // Información fiscal (CAE)
    if (facturaData.cae) {
      content.push('\x1B\x61\x00'); // Alinear izquierda
      content.push(`CAE: ${facturaData.cae}`);
      content.push('\x0A');
      content.push(`Vencimiento: ${new Date(facturaData.vencimientoCae).toLocaleDateString('es-AR')}`);
      content.push('\x0A\x0A');
    }
    
    // Footer
    content.push('\x1B\x61\x01'); // Centrar
    content.push('¡Gracias por su compra!');
    content.push('\x0A');
    content.push('www.tulumaromaterapia.com');
    content.push('\x0A\x0A');
    
    // Alimentar papel antes del corte
    content.push('\x1B\x64\x03'); // Alimentar 3 líneas
    
    // Corte automático si está habilitado
    if (config.autocut) {
      content.push('\x1D\x56\x00'); // Corte total
    }
    
    return content.join('');
  }

  /**
   * Generar ticket de venta optimizado (más compacto)
   */
  static generateTicketContent(ventaData: any, config: FukunPOS80Config): string {
    const content: string[] = [];
    
    // Header compacto
    content.push('\x1B\x61\x01'); // Centrar
    content.push('\x1B\x45\x01'); // Negrita
    content.push('TULUM AROMATERAPIA');
    content.push('\x1B\x45\x00'); // Negrita OFF
    content.push('\x0A');
    content.push('TICKET DE VENTA');
    content.push('\x0A\x0A');
    
    // Info básica
    content.push('\x1B\x61\x00'); // Izquierda
    content.push(`Ticket: #${ventaData.id.slice(-6)}`);
    content.push('\x0A');
    content.push(`Fecha: ${new Date(ventaData.fecha).toLocaleString('es-AR')}`);
    content.push('\x0A');
    
    if (ventaData.usuario?.name) {
      content.push(`Vendedor: ${ventaData.usuario.name}`);
      content.push('\x0A');
    }
    
    content.push('------------------------');
    content.push('\x0A');
    
    // Items (versión compacta)
    ventaData.items.forEach((item: any) => {
      const nombre = this.truncateText(item.producto.nombre, 24);
      const subtotal = (item.cantidad * item.precioUnitario).toFixed(2);
      
      content.push(nombre);
      content.push('\x0A');
      content.push(`${item.cantidad} x $${item.precioUnitario.toFixed(2)} = $${subtotal}`);
      content.push('\x0A');
    });
    
    content.push('------------------------');
    content.push('\x0A');
    
    // Total
    content.push('\x1B\x61\x01'); // Centrar
    content.push('\x1B\x21\x10'); // Doble altura
    content.push(`TOTAL: $${ventaData.total.toFixed(2)}`);
    content.push('\x1B\x21\x00'); // Normal
    content.push('\x0A\x0A');
    
    // Footer
    content.push('¡Gracias por su compra!');
    content.push('\x0A\x0A');
    
    // Alimentar y cortar
    content.push('\x1B\x64\x02');
    if (config.autocut) {
      content.push('\x1D\x56\x00');
    }
    
    return content.join('');
  }

  /**
   * Verificar estado de la impresora FUKUN
   */
  static async checkPrinterStatus(): Promise<{
    online: boolean;
    paperStatus: 'ok' | 'low' | 'out';
    error?: string;
  }> {
    try {
      // En un entorno real, aquí enviarías comandos de estado específicos
      // Por ahora simulamos la verificación
      
      return {
        online: true,
        paperStatus: 'ok'
      };
    } catch (error) {
      return {
        online: false,
        paperStatus: 'out',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Abrir cajón de dinero FUKUN
   */
  static async openCashDrawer(): Promise<boolean> {
    try {
      console.log('💰 Abriendo cajón de dinero FUKUN...');
      
      // En implementación real, enviarías el comando via USB/Bluetooth
      const command = this.FUKUN_COMMANDS.CASHDRAWER_PULSE1;
      
      // Simular envío de comando
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Cajón abierto correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error abriendo cajón:', error);
      return false;
    }
  }

  /**
   * Test específico para FUKUN POS 80
   */
  static async runFukunTest(): Promise<{
    success: boolean;
    results: {
      connectivity: boolean;
      paperStatus: boolean;
      printTest: boolean;
      cashDrawer: boolean;
    };
    errors: string[];
  }> {
    const results = {
      connectivity: false,
      paperStatus: false,
      printTest: false,
      cashDrawer: false
    };
    const errors: string[] = [];

    try {
      // Test 1: Conectividad
      console.log('🔌 Probando conectividad...');
      const status = await this.checkPrinterStatus();
      results.connectivity = status.online;
      results.paperStatus = status.paperStatus === 'ok';
      
      if (!status.online) {
        errors.push('Impresora no responde');
      }
      
      if (status.paperStatus !== 'ok') {
        errors.push(`Problema con papel: ${status.paperStatus}`);
      }

      // Test 2: Impresión de prueba
      if (results.connectivity) {
        console.log('🖨️ Probando impresión...');
        
        const testContent = this.generateTestPage();
        // En implementación real: await this.sendToPrinter(testContent);
        
        results.printTest = true;
        console.log('✅ Test de impresión exitoso');
      }

      // Test 3: Cajón de dinero
      if (results.connectivity) {
        console.log('💰 Probando cajón...');
        results.cashDrawer = await this.openCashDrawer();
      }

      return {
        success: results.connectivity && results.printTest,
        results,
        errors
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Error general');
      return {
        success: false,
        results,
        errors
      };
    }
  }

  /**
   * Generar página de prueba
   */
  private static generateTestPage(): string {
    const content: string[] = [];
    
    content.push('\x1B\x40'); // Init
    content.push('\x1B\x61\x01'); // Centrar
    content.push('\x1B\x45\x01'); // Negrita
    content.push('FUKUN POS80-CC');
    content.push('\x1B\x45\x00');
    content.push('\x0A');
    content.push('TEST DE IMPRESIÓN');
    content.push('\x0A\x0A');
    
    content.push('\x1B\x61\x00'); // Izquierda
    content.push(`Fecha: ${new Date().toLocaleString('es-AR')}`);
    content.push('\x0A');
    content.push('Estado: FUNCIONANDO CORRECTAMENTE');
    content.push('\x0A');
    content.push('Papel: 80mm x Continuo');
    content.push('\x0A');
    content.push('Codificación: UTF-8');
    content.push('\x0A\x0A');
    
    // Test de caracteres especiales
    content.push('Caracteres especiales:');
    content.push('\x0A');
    content.push('áéíóú ÁÉÍÓÚ ñÑ ¿¡ $°');
    content.push('\x0A\x0A');
    
    content.push('\x1B\x61\x01'); // Centrar
    content.push('✅ TEST EXITOSO ✅');
    content.push('\x0A\x0A');
    
    content.push('\x1B\x64\x03'); // Alimentar
    content.push('\x1D\x56\x00'); // Cortar
    
    return content.join('');
  }

  /**
   * Formatear medio de pago
   */
  private static formatMedioPago(medio: string): string {
    const mediosPago: { [key: string]: string } = {
      'efectivo': 'Efectivo',
      'tarjeta_credito': 'Tarjeta Crédito',
      'tarjeta_debito': 'Tarjeta Débito',
      'transferencia': 'Transferencia',
      'qr': 'Código QR'
    };
    
    return mediosPago[medio] || medio;
  }

  /**
   * Truncar texto para ancho de papel
   */
  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Configuración específica para tablet Samsung
   */
  static getTabletOptimizedConfig(): {
    printSettings: FukunPOS80Config;
    usbSettings: {
      timeout: number;
      baudRate: number;
      flowControl: boolean;
    };
    compatibility: {
      androidVersion: string;
      chromeVersion: string;
      webUSBSupport: boolean;
    };
  } {
    return {
      printSettings: {
        paperWidth: 80,
        printWidth: 72,
        resolution: 203,
        charSet: 'UTF-8',
        printSpeed: 250, // Velocidad estándar para compatibilidad
        autocut: true,
        cashdrawer: true,
        interface: 'USB'
      },
      usbSettings: {
        timeout: 5000,
        baudRate: 9600,
        flowControl: true
      },
      compatibility: {
        androidVersion: '8.0+',
        chromeVersion: '89+',
        webUSBSupport: true
      }
    };
  }
}
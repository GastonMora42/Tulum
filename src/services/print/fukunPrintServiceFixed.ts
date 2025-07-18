
// =================================================================
// 2. CORRECCIÓN: src/services/print/fukunPrintServiceFixed.ts
// =================================================================

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
     * CONECTAR A FUKUN
     */
    async connectToFukun(): Promise<{ success: boolean; message: string }> {
      try {
        console.log('🔌 [FUKUN] Conectando a impresora Fukun...');
  
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
          console.log('📱 [FUKUN] Solicitando acceso a dispositivo USB...');
          
          try {
            targetDevice = await navigator.usb.requestDevice({
              filters: [
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
        console.error('❌ [FUKUN] Error conectando:', error);
        return {
          success: false,
          message: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  
    /**
     * 🔧 FUNCIÓN PRINCIPAL PARA IMPRIMIR FACTURA (MEJORADA)
     */
    async printFactura(facturaData: any): Promise<{ success: boolean; message: string }> {
      if (!this.isConnected || !this.device || !this.endpoint) {
        return {
          success: false,
          message: 'Impresora no conectada. Use connectToFukun() primero.'
        };
      }
  
      try {
        console.log('🖨️ [FUKUN] Generando contenido de factura...');
        console.log('📋 [FUKUN] Datos recibidos:', {
          id: facturaData.id,
          tipoComprobante: facturaData.tipoComprobante,
          numeroFactura: facturaData.numeroFactura,
          ventaTotal: facturaData.venta?.total,
          itemsCount: facturaData.venta?.items?.length || 0
        });
        
        const printData = this.generateFacturaCommands(facturaData);
        
        console.log('📤 [FUKUN] Enviando datos a impresora...');
        console.log(`📊 [FUKUN] Tamaño de datos: ${printData.length} bytes`);
        
        await this.sendDataToDevice(printData);
        
        console.log('✅ [FUKUN] Factura enviada a impresora correctamente');
        
        return {
          success: true,
          message: 'Factura impresa correctamente'
        };
  
      } catch (error) {
        console.error('❌ [FUKUN] Error imprimiendo factura:', error);
        return {
          success: false,
          message: `Error de impresión: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  
/**
 * 🔧 GENERAR COMANDOS ESC/POS MEJORADOS CON DIFERENTES TIPOS DE COMPROBANTES
 */
private generateFacturaCommands(facturaData: any): Uint8Array {
  const commands: number[] = [];
  
  console.log('🔧 [FUKUN] Generando comandos ESC/POS mejorados...');

  // Inicializar impresora
  commands.push(...FukunPrintServiceFixed.COMMANDS.INIT);

  // ===== DATOS DE LA EMPRESA =====
  const empresaData = {
    nombre: "CUSCO SAS",
    cuit: "30-71823656-4",
    razonSocial: "CUSCO SAS"
  };

  // ===== DETECTAR TIPO DE COMPROBANTE =====
  const tipoComprobante = facturaData.tipoComprobante || 'TICKET';
  const esFactura = tipoComprobante === 'A' || tipoComprobante === 'B';
  const esTicket = !esFactura || tipoComprobante === 'TICKET';

  console.log(`📋 [FUKUN] Tipo de comprobante: ${esTicket ? 'TICKET' : `FACTURA ${tipoComprobante}`}`);

  // ===== HEADER EMPRESARIAL =====
  commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_DOUBLE_HEIGHT);
  commands.push(...this.textToBytes('TULUM'));
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_NORMAL);
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
  commands.push(...this.textToBytes('ALMACEN DE AROMAS'));
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

  // ===== DATOS DE LA EMPRESA RESPONSABLE =====
  if (esFactura) {
    // Para facturas, mostrar datos fiscales completos
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
    commands.push(...this.textToBytes(empresaData.razonSocial));
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    commands.push(...this.textToBytes(`CUIT: ${empresaData.cuit}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    // Condición IVA
    commands.push(...this.textToBytes('IVA RESPONSABLE INSCRIPTO'));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }

  // Información de la sucursal
  const sucursalNombre = facturaData.venta?.sucursal?.nombre || 'Sucursal Principal';
  const sucursalDireccion = facturaData.venta?.sucursal?.direccion || '';
  const sucursalTelefono = facturaData.venta?.sucursal?.telefono || '';
  
  commands.push(...this.textToBytes(sucursalNombre));
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
  if (sucursalDireccion) {
    commands.push(...this.textToBytes(sucursalDireccion));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }
  
  if (sucursalTelefono) {
    commands.push(...this.textToBytes(`Tel: ${sucursalTelefono}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }

  // ===== TIPO DE COMPROBANTE =====
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_DOUBLE_HEIGHT);
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
  
  if (esTicket) {
    commands.push(...this.textToBytes('TICKET DE VENTA'));
  } else {
    commands.push(...this.textToBytes(`FACTURA ${tipoComprobante}`));
  }
  
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_NORMAL);
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

  // Número de comprobante/ticket
  if (esFactura) {
    const numeroFactura = String(facturaData.numeroFactura || '00000001').padStart(8, '0');
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
    commands.push(...this.textToBytes(`N° ${numeroFactura}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  } else {
    // Para tickets, mostrar ID de venta
    const ventaId = facturaData.venta?.id || 'N/A';
    commands.push(...this.textToBytes(`Venta: ${ventaId.substring(0, 8)}...`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }

  // CAE y Vencimiento (solo para facturas)
  if (esFactura && facturaData.cae) {
    commands.push(...this.textToBytes(`CAE: ${facturaData.cae}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    if (facturaData.vencimientoCae) {
      const vencimiento = new Date(facturaData.vencimientoCae).toLocaleDateString('es-AR');
      commands.push(...this.textToBytes(`Venc CAE: ${vencimiento}`));
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    }
  }

  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

  // ===== FECHA Y HORA =====
  commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_LEFT);
  
  // Fecha
  const fecha = facturaData.fechaEmision 
    ? new Date(facturaData.fechaEmision).toLocaleDateString('es-AR')
    : new Date().toLocaleDateString('es-AR');
  commands.push(...this.textToBytes(`Fecha: ${fecha}`));
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

  // Hora
  const hora = facturaData.fechaEmision
    ? new Date(facturaData.fechaEmision).toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    : new Date().toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
  commands.push(...this.textToBytes(`Hora: ${hora}`));
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

  // ===== DATOS DEL CLIENTE (solo para facturas) =====
  if (esFactura) {
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    // Cliente
    const clienteNombre = facturaData.venta?.clienteNombre || 'Consumidor Final';
    commands.push(...this.textToBytes(`Cliente: ${clienteNombre}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

    // CUIT/DNI
    const clienteCuit = facturaData.venta?.clienteCuit || 'No informado';
    const tipoCuit = facturaData.venta?.clienteCuit && facturaData.venta.clienteCuit.length === 11 ? 'CUIT' : 'DNI';
    commands.push(...this.textToBytes(`${tipoCuit}: ${clienteCuit}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

    // Condición IVA del cliente
    if (tipoComprobante === 'A') {
      commands.push(...this.textToBytes('Cond. IVA: IVA Responsable Inscripto'));
    } else {
      commands.push(...this.textToBytes('Cond. IVA: Consumidor Final'));
    }
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }

  // ===== LÍNEA SEPARADORA =====
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  commands.push(...this.textToBytes('========================================'));
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

  // ===== PRODUCTOS =====
  const total = parseFloat(facturaData.venta?.total || 0);
  
  if (facturaData.venta?.items && Array.isArray(facturaData.venta.items)) {
    console.log(`📦 [FUKUN] Procesando ${facturaData.venta.items.length} items...`);
    
    for (let i = 0; i < facturaData.venta.items.length; i++) {
      const item = facturaData.venta.items[i];
      
      // Validar item
      if (!item || !item.producto) {
        console.warn(`⚠️ [FUKUN] Item ${i} inválido, saltando...`);
        continue;
      }

      // Nombre del producto
      const nombreProducto = item.producto.nombre || 'Producto sin nombre';
      const descripcion = item.producto.descripcion || '';
      
      // Mostrar nombre del producto
      if (descripcion && descripcion !== nombreProducto) {
        commands.push(...this.textToBytes(this.truncateText(nombreProducto, 38)));
        commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        commands.push(...this.textToBytes(`  ${this.truncateText(descripcion, 36)}`));
        commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      } else {
        const lineasNombre = this.wrapText(nombreProducto, 38);
        for (const linea of lineasNombre) {
          commands.push(...this.textToBytes(linea));
          commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
        }
      }

      // Cálculos de precios según tipo de comprobante
      const cantidad = item.cantidad || 1;
      const precioOriginal = parseFloat(item.precioUnitario || 0);
      const descuento = parseFloat(item.descuento || 0);
      
      let precioMostrar: number;
      let subtotal: number;
      
      if (tipoComprobante === 'A') {
        // Factura A: mostrar precios sin IVA
        precioMostrar = precioOriginal / 1.21; // Precio sin IVA
        subtotal = cantidad * precioMostrar * (1 - descuento / 100);
      } else {
        // Factura B y Tickets: mostrar precios con IVA incluido
        precioMostrar = precioOriginal;
        subtotal = cantidad * precioMostrar * (1 - descuento / 100);
      }
      
      // Línea de cantidad x precio = subtotal
      let lineaDetalle = `${cantidad} x $${precioMostrar.toFixed(2)}`;
      if (descuento > 0) {
        lineaDetalle += ` (-${descuento}%)`;
      }
      lineaDetalle += ` = $${subtotal.toFixed(2)}`;
      
      commands.push(...this.textToBytes(lineaDetalle));
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      
      // Espacio entre items (solo si no es el último)
      if (i < facturaData.venta.items.length - 1) {
        commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      }
    }
  } else {
    console.warn('⚠️ [FUKUN] No se encontraron items válidos');
    commands.push(...this.textToBytes('Sin items disponibles'));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }

  // ===== TOTALES SEGÚN TIPO DE COMPROBANTE =====
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  commands.push(...this.textToBytes('========================================'));
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  
  if (tipoComprobante === 'A') {
    // ===== FACTURA A: IVA DISCRIMINADO =====
    commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_LEFT);
    
    const netoGravado = total / 1.21;
    const ivaCalculado = total - netoGravado;
    
    commands.push(...this.textToBytes(`Subtotal (Neto Gravado): $${netoGravado.toFixed(2)}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    commands.push(...this.textToBytes(`IVA 21%:                 $${ivaCalculado.toFixed(2)}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    commands.push(...this.textToBytes('----------------------------------------'));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    // Total final
    commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_DOUBLE_HEIGHT);
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
    commands.push(...this.textToBytes(`TOTAL: $${total.toFixed(2)}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_NORMAL);
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
    
  } else if (tipoComprobante === 'B') {
    // ===== FACTURA B: IVA INCLUIDO =====
    commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_DOUBLE_HEIGHT);
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
    commands.push(...this.textToBytes(`TOTAL: $${total.toFixed(2)}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_NORMAL);
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    // Nota sobre IVA incluido
    commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_LEFT);
    commands.push(...this.textToBytes('(IVA incluido en el precio)'));
    
  } else {
    // ===== TICKET: SOLO TOTAL =====
    commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_DOUBLE_HEIGHT);
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
    commands.push(...this.textToBytes(`TOTAL: $${total.toFixed(2)}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_NORMAL);
    commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
  }
  
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

  // ===== INFORMACIÓN FISCAL ADICIONAL =====
  if (esFactura && facturaData.cae) {
    commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_LEFT);
    
    // Información AFIP
    commands.push(...this.textToBytes('-- DATOS FISCALES --'));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    commands.push(...this.textToBytes(`Comprobante Autorizado por AFIP`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    if (tipoComprobante === 'A') {
      commands.push(...this.textToBytes('Discriminacion de IVA'));
    } else {
      commands.push(...this.textToBytes('IVA Incluido'));
    }
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }

  // ===== IMPUESTOS NACIONALES (SOLO FACTURA B) =====
  if (tipoComprobante === 'B' && esFactura) {
    const ivaIncluido = total - (total / 1.21);
    
    commands.push(...this.textToBytes('-- IMPUESTOS NACIONALES --'));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    commands.push(...this.textToBytes(`IVA 21% (incluido):      $${ivaIncluido.toFixed(2)}`));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }

  // ===== INFORMACIÓN DE PAGOS =====
  if (facturaData.venta?.pagos && Array.isArray(facturaData.venta.pagos)) {
    commands.push(...this.textToBytes('-- FORMA DE PAGO --'));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    for (const pago of facturaData.venta.pagos) {
      const medioPago = this.formatPaymentMethod(pago.medioPago);
      commands.push(...this.textToBytes(`${medioPago}: $${parseFloat(pago.monto || 0).toFixed(2)}`));
      commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      
      // Si hay cambio en efectivo
      if (pago.medioPago === 'efectivo' && pago.datosPago?.cambio > 0) {
        commands.push(...this.textToBytes(`Cambio: $${parseFloat(pago.datosPago.cambio).toFixed(2)}`));
        commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
      }
    }
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }

  // ===== FOOTER =====
  commands.push(...FukunPrintServiceFixed.COMMANDS.ALIGN_CENTER);
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_ON);
  commands.push(...this.textToBytes('MUCHAS GRACIAS POR SU COMPRA!'));
  commands.push(...FukunPrintServiceFixed.COMMANDS.FONT_BOLD_OFF);
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

  // ===== INFORMACIÓN DE CONTACTO =====
  commands.push(...this.textToBytes('Visite nuestras redes sociales'));
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  commands.push(...this.textToBytes('@tulumalmacendearomas'));
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);

  // ===== QR CODE PARA CAE (solo facturas) =====
  if (esFactura && facturaData.cae) {
    commands.push(...this.textToBytes('Escanee el QR para verificar'));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    commands.push(...this.textToBytes('el comprobante en AFIP:'));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    
    // URL de verificación AFIP
    const qrUrl = `https://www.afip.gob.ar/fe/qr/`;
    commands.push(...this.textToBytes(qrUrl));
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
    commands.push(...FukunPrintServiceFixed.COMMANDS.LINE_FEED);
  }

  // ===== FINALIZAR =====
  // Alimentar papel y cortar
  commands.push(...[0x1B, 0x64, 0x04]); // Alimentar 4 líneas
  commands.push(...FukunPrintServiceFixed.COMMANDS.CUT);

  console.log(`✅ [FUKUN] Comandos ${esTicket ? 'TICKET' : `FACTURA ${tipoComprobante}`} generados: ${commands.length} bytes`);
  return new Uint8Array(commands);
}

/**
 * FUNCIÓN AUXILIAR: Formatear método de pago
 */
private formatPaymentMethod(medioPago: string): string {
  const metodos: { [key: string]: string } = {
    'efectivo': 'Efectivo',
    'tarjeta_credito': 'Tarjeta de Crédito',
    'tarjeta_debito': 'Tarjeta de Débito',
    'transferencia': 'Transferencia',
    'qr': 'Pago QR'
  };
  
  return metodos[medioPago] || medioPago.charAt(0).toUpperCase() + medioPago.slice(1);
}

/**
 * FUNCIÓN AUXILIAR: Dividir texto largo en múltiples líneas
 */
private wrapText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
  
    /**
     * TEST DE IMPRESIÓN
     */
    async printTest(): Promise<{ success: boolean; message: string }> {
      if (!this.isConnected || !this.device || !this.endpoint) {
        return {
          success: false,
          message: 'Impresora no conectada'
        };
      }
  
      try {
        console.log('🧪 [FUKUN] Ejecutando test de impresión...');
        
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
  
        console.log('✅ [FUKUN] Test completado');
        return {
          success: true,
          message: 'Test de impresión enviado correctamente'
        };
  
      } catch (error) {
        console.error('❌ [FUKUN] Error en test:', error);
        return {
          success: false,
          message: `Error en test: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  
    /**
     * ABRIR CAJÓN DE DINERO
     */
    async openCashDrawer(): Promise<{ success: boolean; message: string }> {
      if (!this.isConnected || !this.device || !this.endpoint) {
        return {
          success: false,
          message: 'Impresora no conectada'
        };
      }
  
      try {
        console.log('💰 [FUKUN] Abriendo cajón de dinero...');
        
        const drawerCommand = new Uint8Array(FukunPrintServiceFixed.COMMANDS.OPEN_DRAWER);
        await this.sendDataToDevice(drawerCommand);
  
        console.log('✅ [FUKUN] Cajón abierto');
        return {
          success: true,
          message: 'Cajón abierto correctamente'
        };
      } catch (error) {
        console.error('❌ [FUKUN] Error abriendo cajón:', error);
        return {
          success: false,
          message: `Error abriendo cajón: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  
    /**
     * UTILIDADES PRIVADAS
     */
    private async setupDevice(device: USBDevice): Promise<void> {
      try {
        console.log('🔧 [FUKUN] Configurando dispositivo...');
  
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
  
        console.log('✅ [FUKUN] Dispositivo configurado correctamente');
        console.log(`📋 [FUKUN] Interfaz: ${printerInterface.interfaceNumber}, Endpoint: ${this.endpoint.endpointNumber}`);
  
      } catch (error) {
        console.error('❌ [FUKUN] Error configurando dispositivo:', error);
        throw error;
      }
    }
  
    private async sendDataToDevice(data: Uint8Array): Promise<void> {
      if (!this.device || !this.endpoint) {
        throw new Error('Dispositivo no configurado');
      }
  
      try {
        console.log(`📤 [FUKUN] Enviando ${data.length} bytes a la impresora...`);
        
        const result = await this.device.transferOut(this.endpoint.endpointNumber, data);
        
        if (result.status !== 'ok') {
          throw new Error(`Error en transferencia: ${result.status}`);
        }
  
        console.log(`✅ [FUKUN] ${result.bytesWritten} bytes enviados correctamente`);
  
      } catch (error) {
        console.error('❌ [FUKUN] Error enviando datos:', error);
        throw error;
      }
    }
  
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
  
    async disconnect(): Promise<void> {
      if (this.device) {
        try {
          await this.device.close();
        } catch (error) {
          console.warn('⚠️ [FUKUN] Error cerrando dispositivo:', error);
        }
      }
  
      this.device = null;
      this.endpoint = null;
      this.isConnected = false;
    }
  
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
  
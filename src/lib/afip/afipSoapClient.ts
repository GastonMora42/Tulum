// src/lib/afip/afipSoapClient.ts - VERSIÓN COMPLETA MEJORADA
import * as soap from 'soap';
import * as crypto from 'crypto';
import { parseStringPromise } from 'xml2js';
import { DOMParser } from 'xmldom';
import * as forge from 'node-forge';
import { v4 as uuidv4 } from 'uuid';
import { AFIP_CONFIG } from '@/config/afip';
import prisma from '@/server/db/client';

export class AfipSoapClient {
  private wsaaUrl: string;
  private wsfeUrl: string;
  private cert: string;
  private key: string;
  private production: boolean;
  private cuit: string;
  private token: string = '';
  private sign: string = '';
  private tokenExpiration: Date = new Date();

  constructor(cuit: string) {
    this.wsaaUrl = AFIP_CONFIG.wsaa_url;
    this.wsfeUrl = AFIP_CONFIG.wsfe_url;
    this.cert = AFIP_CONFIG.cert;
    this.key = AFIP_CONFIG.key;
    this.production = AFIP_CONFIG.production;
    this.cuit = cuit;
    
    // Validar configuración
    if (!this.cert || !this.key) {
      throw new Error('Certificado AFIP no configurado correctamente');
    }
    
    console.log(`[AFIP] Cliente SOAP inicializado para CUIT: ${cuit}`);
    console.log(`[AFIP] Ambiente: ${this.production ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'}`);
    console.log(`[AFIP] WSAA URL: ${this.wsaaUrl}`);
    console.log(`[AFIP] WSFE URL: ${this.wsfeUrl}`);
  }

  /**
   * Verifica si el token actual es válido
   */
  private isTokenValid(): boolean {
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    return !!this.token && !!this.sign && this.tokenExpiration > tenMinutesFromNow;
  }

  /**
   * Crea el ticket de autenticación CMS firmado - VERSIÓN CORREGIDA
   */
  private async createCMS(): Promise<string> {
    try {
      console.log('[AFIP] Creando CMS para autenticación...');
      
      // Generar TRA XML
      const ttl = AFIP_CONFIG.tokenDuration;
      const uniqueId = Math.floor(Math.random() * 999999999);
      const generationTime = new Date();
      const expirationTime = new Date(generationTime.getTime() + ttl * 1000);

      const tra = `<?xml version="1.0" encoding="UTF-8" ?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime.toISOString()}</generationTime>
    <expirationTime>${expirationTime.toISOString()}</expirationTime>
  </header>
  <service>${AFIP_CONFIG.service}</service>
</loginTicketRequest>`;

      console.log('[AFIP] TRA XML generado');

      // Cargar certificado y clave privada
      const certificate = forge.pki.certificateFromPem(this.cert);
      const privateKey = forge.pki.privateKeyFromPem(this.key);
      
      console.log('[AFIP] Certificado y clave privada cargados');

      // Crear mensaje PKCS#7
      const p7 = forge.pkcs7.createSignedData();
      p7.content = forge.util.createBuffer(tra, 'utf8');
      
      // Agregar certificado
      p7.addCertificate(certificate);
      
      // CORRECCIÓN: Crear atributos autenticados con tipos correctos
      const authenticatedAttributes: { type: string; value?: string }[] = [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data
        },
        {
          type: forge.pki.oids.messageDigest
          // No especificamos value, se calcula automáticamente
        },
        {
          type: forge.pki.oids.signingTime,
          value: generationTime.toISOString()
        }
      ];
      
      // Añadir firmante con tipos corregidos
      p7.addSigner({
        key: privateKey,
        certificate: certificate,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: authenticatedAttributes
      });
      
      console.log('[AFIP] Firmante agregado al PKCS#7');
      
      // Firmar
      p7.sign();
      console.log('[AFIP] PKCS#7 firmado');
      
      // Convertir a DER y luego a Base64
      const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
      const base64 = Buffer.from(der, 'binary').toString('base64');
      
      console.log(`[AFIP] CMS creado correctamente, tamaño: ${base64.length} caracteres`);
      
      return base64;
    } catch (error) {
      console.error('[AFIP] Error creando CMS:', error);
      throw new Error(`No se pudo crear el CMS para autenticación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Autentica con AFIP y obtiene token y sign
   */
  private async authenticate(): Promise<{token: string; sign: string; expirationTime: Date}> {
    try {
      console.log(`[AFIP] Iniciando autenticación con AFIP para CUIT ${this.cuit}`);
      
      // Crear CMS
      const cms = await this.createCMS();
      console.log(`[AFIP] CMS creado correctamente`);
      
      // CORRECCIÓN: Opciones simplificadas y compatibles
      console.log(`[AFIP] Creando cliente SOAP para ${this.wsaaUrl}`);
      
      // Crear cliente SOAP con opciones básicas
      const client = await soap.createClientAsync(this.wsaaUrl + '?WSDL');
      
      console.log(`[AFIP] Cliente SOAP creado, llamando a loginCms...`);
      
      // Llamar al método loginCms con retry
      let result;
      let retries = 3;
      
      while (retries > 0) {
        try {
          result = await client.loginCmsAsync({
            in0: cms
          });
          break; // Si llega aquí, fue exitoso
        } catch (soapError) {
          retries--;
          console.error(`[AFIP] Error en llamada SOAP (intentos restantes: ${retries}):`, soapError);
          
          if (retries === 0) {
            throw soapError;
          }
          
          // Esperar 2 segundos antes del retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!result || !result[0] || !result[0].loginCmsReturn) {
        throw new Error('Respuesta inválida del servicio WSAA');
      }
      
      console.log(`[AFIP] Respuesta recibida de loginCms`);
      
      // Parsear XML de respuesta
      const response = await parseStringPromise(result[0].loginCmsReturn);
      
      if (!response.loginTicketResponse || !response.loginTicketResponse.credentials) {
        throw new Error('Formato de respuesta inválido del servicio WSAA');
      }
      
      // Extraer credentials
      const credentials = response.loginTicketResponse.credentials[0];
      const token = credentials.token[0];
      const sign = credentials.sign[0];
      
      if (!token || !sign) {
        throw new Error('Token o Sign no recibidos en la respuesta de AFIP');
      }
      
      // Calcular expiración
      const expirationTime = new Date();
      expirationTime.setSeconds(expirationTime.getSeconds() + AFIP_CONFIG.tokenDuration - 600); // 10 minutos antes para margen
      
      console.log(`[AFIP] Autenticación exitosa`);
      console.log(`[AFIP] Token válido hasta: ${expirationTime.toISOString()}`);
      console.log(`[AFIP] Token length: ${token.length}, Sign length: ${sign.length}`);
      
      // Guardar token en base de datos para uso futuro
      await this.saveTokenToDatabase(token, sign, expirationTime);
      
      return {
        token,
        sign,
        expirationTime
      };
    } catch (error) {
      console.error('[AFIP] Error en autenticación AFIP:', error);
      
      // Información adicional para debug
      if (error instanceof Error) {
        console.error('[AFIP] Error message:', error.message);
        console.error('[AFIP] Error stack:', error.stack);
      }
      
      throw new Error(`No se pudo autenticar con AFIP: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Guarda el token en la base de datos para reuso entre instancias
   */
  private async saveTokenToDatabase(token: string, sign: string, expirationTime: Date): Promise<void> {
    try {
      // Buscar token existente para este CUIT
      const existingToken = await prisma.tokenAFIP.findFirst({
        where: { cuit: this.cuit }
      });
      
      if (existingToken) {
        // Si existe, actualizar
        await prisma.tokenAFIP.update({
          where: { id: existingToken.id },
          data: {
            token,
            sign,
            expirationTime
          }
        });
      } else {
        // Si no existe, crear nuevo
        await prisma.tokenAFIP.create({
          data: {
            id: uuidv4(),
            cuit: this.cuit,
            token,
            sign,
            expirationTime,
            createdAt: new Date()
          }
        });
      }
      console.log(`[AFIP] Token guardado en base de datos para CUIT ${this.cuit}`);
    } catch (error) {
      console.error('[AFIP] Error al guardar token en base de datos:', error);
      // No fallamos la autenticación, solo logueamos el error
    }
  }

  /**
   * Carga token desde base de datos
   */
  private async loadTokenFromDatabase(): Promise<boolean> {
    try {
      const tokenData = await prisma.tokenAFIP.findFirst({
        where: { cuit: this.cuit }
      });
      
      if (tokenData && tokenData.expirationTime > new Date()) {
        this.token = tokenData.token;
        this.sign = tokenData.sign;
        this.tokenExpiration = tokenData.expirationTime;
        console.log(`[AFIP] Token cargado desde base de datos para CUIT ${this.cuit}, válido hasta: ${this.tokenExpiration.toISOString()}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[AFIP] Error al cargar token desde base de datos:', error);
      return false;
    }
  }

  /**
   * Obtiene token y sign, autenticando si es necesario
   */
  public async getAuth(): Promise<{ Token: string; Sign: string; Cuit: string }> {
    if (!this.isTokenValid()) {
      try {
        // Intentar cargar desde base de datos primero
        const tokenLoaded = await this.loadTokenFromDatabase();
        
        if (!tokenLoaded || !this.isTokenValid()) {
          // Si no hay token en base de datos o ya expiró, autenticar
          console.log(`[AFIP] Token no disponible o expirado, iniciando autenticación...`);
          const auth = await this.authenticate();
          this.token = auth.token;
          this.sign = auth.sign;
          this.tokenExpiration = auth.expirationTime;
        }
      } catch (error) {
        console.error('[AFIP] Error al obtener token AFIP:', error);
        throw error;
      }
    }
    
    return {
      Token: this.token,
      Sign: this.sign,
      Cuit: this.cuit
    };
  }

  /**
   * Obtiene el último número de comprobante
   */
  public async getLastInvoiceNumber(puntoVenta: number, comprobanteTipo: number): Promise<number> {
    try {
      const auth = await this.getAuth();
      
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      const result = await client.FECompUltimoAutorizadoAsync({
        Auth: auth,
        PtoVta: puntoVenta,
        CbteTipo: comprobanteTipo
      });
      
      return parseInt(result[0].FECompUltimoAutorizadoResult.CbteNro);
    } catch (error) {
      console.error('[AFIP] Error obteniendo último número de comprobante:', error);
      throw new Error('No se pudo obtener el último número de comprobante');
    }
  }

  /**
   * Consulta comprobante existente
   */
  public async getInvoice(puntoVenta: number, comprobanteTipo: number, numeroComprobante: number): Promise<any> {
    try {
      const auth = await this.getAuth();
      
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      const result = await client.FECompConsultarAsync({
        Auth: auth,
        FeCompConsReq: {
          CbteTipo: comprobanteTipo,
          CbteNro: numeroComprobante,
          PtoVta: puntoVenta
        }
      });
      
      return result[0].FECompConsultarResult;
    } catch (error) {
      console.error('[AFIP] Error consultando comprobante:', error);
      throw new Error('No se pudo consultar el comprobante');
    }
  }

  /**
   * Crea una nueva factura electrónica - VERSIÓN MEJORADA CON VALIDACIONES
   */
  public async createInvoice(params: {
    puntoVenta: number;
    comprobanteTipo: number;
    concepto: number;
    docTipo: number;
    docNro: string;
    comprobantesAsociados?: any[];
    fechaComprobante: string;
    importeTotal: number;
    importeNeto: number;
    importeIVA: number;
    monedaId: string;
    cotizacion: number;
    iva: Array<{
      Id: number;
      BaseImp: number;
      Importe: number;
    }>;
    items: Array<{
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      bonificacion: number;
      subtotal: number;
    }>;
  }): Promise<any> {
    try {
      console.log(`[AFIP] 🚀 Iniciando createInvoice con parámetros:`);
      console.log(`[AFIP]    - Punto Venta: ${params.puntoVenta}`);
      console.log(`[AFIP]    - Tipo Comprobante: ${params.comprobanteTipo}`);
      console.log(`[AFIP]    - Doc Tipo: ${params.docTipo}, Doc Nro: ${params.docNro}`);
      console.log(`[AFIP]    - Importes: Total ${params.importeTotal}, Neto ${params.importeNeto}, IVA ${params.importeIVA}`);

      const auth = await this.getAuth();
      
      // Obtener último número de comprobante
      const ultimoNumero = await this.getLastInvoiceNumber(params.puntoVenta, params.comprobanteTipo);
      const nuevoNumero = ultimoNumero + 1;
      
      console.log(`[AFIP] 📊 Último número: ${ultimoNumero}, Nuevo número: ${nuevoNumero}`);
      
      // Crear cliente SOAP
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      // Preparar solicitud con validaciones mejoradas
      const feDetReq: any = {
        FECAEDetRequest: {
          Concepto: params.concepto,
          DocTipo: params.docTipo,
          DocNro: params.docNro,
          CbteDesde: nuevoNumero,
          CbteHasta: nuevoNumero,
          CbteFch: params.fechaComprobante,
          ImpTotal: Number(params.importeTotal.toFixed(2)),
          ImpTotConc: 0,
          ImpNeto: Number(params.importeNeto.toFixed(2)),
          ImpOpEx: 0,
          ImpIVA: Number(params.importeIVA.toFixed(2)),
          ImpTrib: 0,
          MonId: params.monedaId,
          MonCotiz: params.cotizacion
        }
      };

      // Agregar comprobantes asociados si existen
      if (params.comprobantesAsociados && params.comprobantesAsociados.length > 0) {
        feDetReq.FECAEDetRequest.CbtesAsoc = {
          CbteAsoc: params.comprobantesAsociados
        };
      }

      // Agregar IVA solo si hay alícuotas
      if (params.iva && params.iva.length > 0) {
        feDetReq.FECAEDetRequest.Iva = {
          AlicIva: params.iva.map(alicuota => ({
            Id: alicuota.Id,
            BaseImp: Number(alicuota.BaseImp.toFixed(2)),
            Importe: Number(alicuota.Importe.toFixed(2))
          }))
        };
      }

      const request = {
        Auth: auth,
        FeCAEReq: {
          FeCabReq: {
            CantReg: 1,
            PtoVta: params.puntoVenta,
            CbteTipo: params.comprobanteTipo
          },
          FeDetReq: feDetReq
        }
      };
      
      console.log(`[AFIP] 📤 Enviando solicitud a AFIP...`);
      console.log(`[AFIP] 📤 Request estructura:`, JSON.stringify(request, null, 2));
      
      // Llamar al método FECAESolicitar con retry
      let result;
      let retries = 3;
      
      while (retries > 0) {
        try {
          result = await client.FECAESolicitarAsync(request);
          break;
        } catch (soapError) {
          retries--;
          console.error(`[AFIP] ❌ Error en FECAESolicitar (intentos restantes: ${retries}):`, soapError);
          
          if (retries === 0) {
            throw soapError;
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // ✅ MEJORA: Logging detallado de la respuesta completa
      console.log(`[AFIP] 📥 Respuesta cruda completa de AFIP:`);
      console.log(JSON.stringify(result, null, 2));
      
      if (!result || !result[0]) {
        throw new Error('AFIP devolvió respuesta vacía o nula');
      }

      const response = result[0].FECAESolicitarResult;
      
      if (!response) {
        throw new Error('AFIP devolvió FECAESolicitarResult vacío');
      }

      console.log(`[AFIP] 📋 Estructura de respuesta analizada:`);
      console.log(`[AFIP]    - Tiene Errors: ${!!response.Errors}`);
      console.log(`[AFIP]    - Tiene FeDetResp: ${!!response.FeDetResp}`);
      console.log(`[AFIP]    - Tiene FECAEDetResponse: ${!!(response.FeDetResp && response.FeDetResp.FECAEDetResponse)}`);

      // Verificar errores globales primero
      if (response.Errors && response.Errors.Err && response.Errors.Err.length > 0) {
        console.error(`[AFIP] ❌ Errores globales en respuesta:`, JSON.stringify(response.Errors, null, 2));
        throw new Error(`Error AFIP Global: ${JSON.stringify(response.Errors)}`);
      }

      // Verificar que existe el detalle de respuesta
      if (!response.FeDetResp || !response.FeDetResp.FECAEDetResponse) {
        console.error(`[AFIP] ❌ Respuesta sin detalle válido:`, JSON.stringify(response, null, 2));
        throw new Error('AFIP no devolvió detalle de respuesta válido');
      }

      const respDetalle = response.FeDetResp.FECAEDetResponse;
      
      // ✅ MEJORA: Logging completo del detalle
      console.log(`[AFIP] 📄 Detalle completo de respuesta:`);
      console.log(JSON.stringify(respDetalle, null, 2));

      // ✅ MEJORA: Verificaciones más estrictas
      console.log(`[AFIP] 🔍 Verificando resultado: ${respDetalle.Resultado}`);
      
      if (respDetalle.Resultado !== 'A') {
        const errorInfo = {
          resultado: respDetalle.Resultado,
          observaciones: respDetalle.Observaciones || 'Sin observaciones',
          errores: respDetalle.Errors || 'Sin errores específicos'
        };
        
        console.error(`[AFIP] ❌ Resultado no exitoso:`, JSON.stringify(errorInfo, null, 2));
        throw new Error(`AFIP rechazó la factura. Resultado: ${respDetalle.Resultado}. Detalles: ${JSON.stringify(errorInfo)}`);
      }

      // ✅ MEJORA: Validación estricta del CAE
      console.log(`[AFIP] 🔍 Verificando CAE: "${respDetalle.CAE}" (tipo: ${typeof respDetalle.CAE})`);
      
      if (!respDetalle.CAE || typeof respDetalle.CAE !== 'string' || respDetalle.CAE.trim() === '') {
        console.error(`[AFIP] ❌ CAE inválido o vacío:`, {
          cae: respDetalle.CAE,
          tipo: typeof respDetalle.CAE,
          longitud: respDetalle.CAE ? respDetalle.CAE.length : 0
        });
        throw new Error('AFIP no devolvió CAE válido en la respuesta');
      }

      // ✅ MEJORA: Validación de otros campos críticos
      if (!respDetalle.CbteDesde && respDetalle.CbteDesde !== 0) {
        console.error(`[AFIP] ❌ Número de comprobante inválido:`, respDetalle.CbteDesde);
        throw new Error('AFIP no devolvió número de comprobante válido');
      }

      if (!respDetalle.CAEFchVto) {
        console.error(`[AFIP] ❌ Fecha de vencimiento CAE inválida:`, respDetalle.CAEFchVto);
        throw new Error('AFIP no devolvió fecha de vencimiento CAE válida');
      }

      // ✅ RESULTADO VALIDADO
      const resultadoFinal = {
        Resultado: respDetalle.Resultado,
        CAE: respDetalle.CAE.trim(),
        CAEFchVto: respDetalle.CAEFchVto,
        CbteNro: respDetalle.CbteDesde,
        Observaciones: respDetalle.Observaciones,
        Errores: response.Errors
      };

      console.log(`[AFIP] ✅ Respuesta válida procesada exitosamente:`);
      console.log(`[AFIP]    - CAE: ${resultadoFinal.CAE}`);
      console.log(`[AFIP]    - Número: ${resultadoFinal.CbteNro}`);
      console.log(`[AFIP]    - Vencimiento: ${resultadoFinal.CAEFchVto}`);

      return resultadoFinal;

    } catch (error) {
      console.error('[AFIP] ❌ Error detallado en createInvoice:', error);
      
      if (error instanceof Error) {
        console.error('[AFIP] ❌ Message:', error.message);
        console.error('[AFIP] ❌ Stack:', error.stack);
      }
      
      // Mejorar el mensaje de error según el tipo
      let errorMessage = 'No se pudo crear la factura en AFIP';
      
      if (error instanceof Error) {
        if (error.message.includes('10005')) {
          errorMessage = 'Punto de venta no habilitado en AFIP para facturación electrónica';
        } else if (error.message.includes('10015')) {
          errorMessage = 'Para facturas mayores al tope, debe identificar al cliente con CUIT/DNI';
        } else if (error.message.includes('10000')) {
          errorMessage = 'CUIT no autorizado para emitir comprobantes electrónicos';
        } else {
          errorMessage = error.message;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtiene los tipos de comprobantes disponibles
   */
  public async getInvoiceTypes(): Promise<any> {
    try {
      const auth = await this.getAuth();
      
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      const result = await client.FEParamGetTiposCbteAsync({
        Auth: auth
      });
      
      return result[0].FEParamGetTiposCbteResult.ResultGet;
    } catch (error) {
      console.error('[AFIP] Error obteniendo tipos de comprobantes:', error);
      throw new Error('No se pudo obtener los tipos de comprobantes');
    }
  }

  /**
   * Obtiene los tipos de documentos disponibles
   */
  public async getDocumentTypes(): Promise<any> {
    try {
      const auth = await this.getAuth();
      
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      const result = await client.FEParamGetTiposDocAsync({
        Auth: auth
      });
      
      return result[0].FEParamGetTiposDocResult.ResultGet;
    } catch (error) {
      console.error('[AFIP] Error obteniendo tipos de documentos:', error);
      throw new Error('No se pudo obtener los tipos de documentos');
    }
  }

  /**
   * Obtiene los tipos de IVA disponibles
   */
  public async getVatTypes(): Promise<any> {
    try {
      const auth = await this.getAuth();
      
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      const result = await client.FEParamGetTiposIvaAsync({
        Auth: auth
      });
      
      return result[0].FEParamGetTiposIvaResult.ResultGet;
    } catch (error) {
      console.error('[AFIP] Error obteniendo tipos de IVA:', error);
      throw new Error('No se pudo obtener los tipos de IVA');
    }
  }

  /**
   * Obtiene los tipos de conceptos disponibles
   */
  public async getConceptTypes(): Promise<any> {
    try {
      const auth = await this.getAuth();
      
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      const result = await client.FEParamGetTiposConceptoAsync({
        Auth: auth
      });
      
      return result[0].FEParamGetTiposConceptoResult.ResultGet;
    } catch (error) {
      console.error('[AFIP] Error obteniendo tipos de conceptos:', error);
      throw new Error('No se pudo obtener los tipos de conceptos');
    }
  }

  /**
   * Obtiene los puntos de venta disponibles
   */
  public async getSalesPoints(): Promise<any> {
    try {
      const auth = await this.getAuth();
      
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      const result = await client.FEParamGetPtosVentaAsync({
        Auth: auth
      });
      
      return result[0].FEParamGetPtosVentaResult.ResultGet;
    } catch (error) {
      console.error('[AFIP] Error obteniendo puntos de venta:', error);
      throw new Error('No se pudo obtener los puntos de venta');
    }
  }

  /**
   * Obtiene estado del servidor AFIP
   */
  public async getServerStatus(): Promise<any> {
    try {
      // Este método no necesita autenticación
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      const result = await client.FEDummyAsync({});
      
      return result[0].FEDummyResult;
    } catch (error) {
      console.error('[AFIP] Error obteniendo estado del servidor:', error);
      throw new Error('No se pudo obtener el estado del servidor AFIP');
    }
  }

  /**
   * Método de diagnóstico para verificar conectividad
   */
  public async verificarConectividad(): Promise<{
    servidor: boolean;
    autenticacion: boolean;
    ultimoComprobante: boolean;
    errores: string[];
  }> {
    const errores: string[] = [];
    let servidor = false;
    let autenticacion = false;
    let ultimoComprobante = false;

    try {
      // Test 1: Estado del servidor
      console.log('[AFIP] Verificando estado del servidor...');
      const estadoServidor = await this.getServerStatus();
      servidor = estadoServidor.AppServer === 'OK' && estadoServidor.DbServer === 'OK' && estadoServidor.AuthServer === 'OK';
      
      if (!servidor) {
        errores.push(`Servidor AFIP no disponible: ${JSON.stringify(estadoServidor)}`);
      } else {
        console.log('[AFIP] ✅ Servidor AFIP disponible');
      }
    } catch (error) {
      errores.push(`Error al consultar servidor AFIP: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    try {
      // Test 2: Autenticación
      console.log('[AFIP] Verificando autenticación...');
      const auth = await this.getAuth();
      autenticacion = !!(auth.Token && auth.Sign);
      
      if (!autenticacion) {
        errores.push('No se pudo obtener token de autenticación');
      } else {
        console.log('[AFIP] ✅ Autenticación exitosa');
        console.log(`[AFIP] Token length: ${auth.Token.length}, Sign length: ${auth.Sign.length}`);
      }
    } catch (error) {
      errores.push(`Error en autenticación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    try {
      // Test 3: Consulta de último comprobante
      console.log('[AFIP] Verificando consulta de comprobantes...');
      const ultimoNumero = await this.getLastInvoiceNumber(1, 6); // Punto 1, Factura B
      ultimoComprobante = typeof ultimoNumero === 'number';
      
      if (!ultimoComprobante) {
        errores.push('No se pudo consultar último comprobante');
      } else {
        console.log(`[AFIP] ✅ Último comprobante consultado: ${ultimoNumero}`);
      }
    } catch (error) {
      errores.push(`Error al consultar último comprobante: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return {
      servidor,
      autenticacion,
      ultimoComprobante,
      errores
    };
  }
}
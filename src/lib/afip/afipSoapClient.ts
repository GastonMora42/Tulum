// src/lib/afip/afipSoapClient.ts
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
  }

  /**
   * Verifica si el token actual es válido
   */
  private isTokenValid(): boolean {
    const now = new Date();
    // Consideramos que es válido si falta más de 10 minutos para que expire
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    return !!this.token && !!this.sign && this.tokenExpiration > tenMinutesFromNow;
  }

/**
 * Crea el ticket de autenticación CMS firmado con el certificado
 */
private async createCMS(): Promise<string> {
  try {
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

    // Crear certificado PKCS#7/CMS
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(tra, 'utf8');
    
    // Cargar certificado y clave privada
    const certificate = forge.pki.certificateFromPem(this.cert);
    const privateKey = forge.pki.privateKeyFromPem(this.key);
    
    // Agregar certificado
    p7.addCertificate(certificate);
    
    // Añadir autenticado
    p7.addSigner({
      key: privateKey,
      certificate: certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [{
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data
      }, {
        type: forge.pki.oids.messageDigest
        // Valor generado automáticamente
      }, {
        type: forge.pki.oids.signingTime,
        // Convertir Date a string ISO para corregir error de tipo
        value: generationTime.toISOString()
      }]
    });
    
    // Firmar
    p7.sign();
    
    // Encapsular contenido - corregimos el error de null
    p7.content = undefined; // Usar undefined en lugar de null
    
    // Convertir a DER y luego a Base64
    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const base64 = Buffer.from(der, 'binary').toString('base64');
    
    return base64;
  } catch (error) {
    console.error('Error creando CMS:', error);
    throw new Error('No se pudo crear el CMS para autenticación');
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
      console.log(`[AFIP] CMS creado correctamente, longitud: ${cms.length}`);
      
      // Crear cliente SOAP
      const client = await soap.createClientAsync(this.wsaaUrl + '?WSDL');
      
      console.log(`[AFIP] Cliente SOAP creado, llamando a loginCms...`);
      
      // Llamar al método loginCms
      const result = await client.loginCmsAsync({
        in0: cms
      });
      
      console.log(`[AFIP] Respuesta recibida de loginCms`);
      
      // Parsear XML de respuesta
      const response = await parseStringPromise(result[0].loginCmsReturn);
      
      // Extraer credentials
      const credentials = response.loginTicketResponse.credentials[0];
      const token = credentials.token[0];
      const sign = credentials.sign[0];
      
      // Calcular expiración
      const expirationTime = new Date();
      expirationTime.setSeconds(expirationTime.getSeconds() + AFIP_CONFIG.tokenDuration - 600); // 10 minutos antes para margen
      
      console.log(`[AFIP] Autenticación exitosa, token válido hasta: ${expirationTime.toISOString()}`);
      
      // Guardar token en base de datos para uso futuro
      await this.saveTokenToDatabase(token, sign, expirationTime);
      
      return {
        token,
        sign,
        expirationTime
      };
    } catch (error) {
      console.error('[AFIP] Error en autenticación AFIP:', error);
      throw new Error('No se pudo autenticar con AFIP');
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
            id: uuidv4(), // Usar UUID v4 para generar un ID único
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
      // Buscar por CUIT usando findFirst
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
   * Crea una nueva factura electrónica
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
      const auth = await this.getAuth();
      
      // Obtener último número de comprobante
      const ultimoNumero = await this.getLastInvoiceNumber(params.puntoVenta, params.comprobanteTipo);
      const nuevoNumero = ultimoNumero + 1;
      
      console.log(`[AFIP] Generando factura: Pto. Venta ${params.puntoVenta}, Tipo ${params.comprobanteTipo}, Número ${nuevoNumero}`);
      
      // Crear cliente SOAP
      const client = await soap.createClientAsync(this.wsfeUrl + '?WSDL');
      
      // Preparar solicitud
      const request = {
        Auth: auth,
        FeCAEReq: {
          FeCabReq: {
            CantReg: 1,
            PtoVta: params.puntoVenta,
            CbteTipo: params.comprobanteTipo
          },
          FeDetReq: {
            FECAEDetRequest: {
              Concepto: params.concepto,
              DocTipo: params.docTipo,
              DocNro: params.docNro,
              CbteDesde: nuevoNumero,
              CbteHasta: nuevoNumero,
              CbteFch: params.fechaComprobante,
              ImpTotal: params.importeTotal,
              ImpTotConc: 0,
              ImpNeto: params.importeNeto,
              ImpOpEx: 0,
              ImpIVA: params.importeIVA,
              ImpTrib: 0,
              MonId: params.monedaId,
              MonCotiz: params.cotizacion,
              ...(params.comprobantesAsociados && {
                CbtesAsoc: {
                  CbteAsoc: params.comprobantesAsociados
                }
              }),
              Iva: {
                AlicIva: params.iva
              }
            }
          }
        }
      };
      
      // Log de los parámetros importantes para debug
      console.log(`[AFIP] Solicitando CAE para: DocNro ${params.docNro}, ImpTotal: ${params.importeTotal}, Neto: ${params.importeNeto}, IVA: ${params.importeIVA}`);
      
      // Llamar al método FECAESolicitar
      const result = await client.FECAESolicitarAsync(request);
      
      // Procesar respuesta
      const response = result[0].FECAESolicitarResult;
      
      // Verificar si hay errores
      if (response.Errors) {
        console.error(`[AFIP] Error en respuesta AFIP:`, response.Errors);
        throw new Error(`Error AFIP: ${JSON.stringify(response.Errors)}`);
      }
      
      const respDetalle = response.FeDetResp.FECAEDetResponse;
      
      console.log(`[AFIP] Respuesta recibida, CAE: ${respDetalle.CAE}, Vencimiento: ${respDetalle.CAEFchVto}`);
      
      return {
        Resultado: respDetalle.Resultado,
        CAE: respDetalle.CAE,
        CAEFchVto: respDetalle.CAEFchVto,
        CbteNro: respDetalle.CbteDesde,
        Observaciones: respDetalle.Observaciones,
        Errores: response.Errors
      };
    } catch (error) {
      console.error('[AFIP] Error creando factura en AFIP:', error);
      throw new Error('No se pudo crear la factura en AFIP');
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
}
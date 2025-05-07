// src/lib/afip/afipSoapClient.ts
import * as soap from 'soap';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { parseStringPromise } from 'xml2js';
import { AFIP_CONFIG } from '@/config/afip';
import { TokenAFIP } from '@/types/afip';

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
    return !!this.token && !!this.sign && this.tokenExpiration > now;
  }

  /**
   * Crea el ticket de autenticación CMS
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

      // Firmar TRA con certificado
      const sign = crypto.createSign('sha256');
      sign.update(tra);
      sign.end();
      const signature = sign.sign({ key: this.key, cert: this.cert });

      // Crear CMS
      const cms = crypto.createSigner('sha256');
      cms.update(tra);
      cms.end();
      
      // Esta línea es simplificada, en la implementación real necesitarías una librería como node-forge
      // o pkcs7 para crear adecuadamente el mensaje CMS (la librería afip.js tiene una implementación)
      // Para propósitos del código, asumimos que esta función existe
      const cmsTra = this.createCMSMessage(tra, signature, this.cert);
      
      return cmsTra;
    } catch (error) {
      console.error('Error creando CMS:', error);
      throw new Error('No se pudo crear el CMS para autenticación');
    }
  }

  // Función mock que necesitaría implementarse usando una librería PKCS#7 real
  private createCMSMessage(tra: string, signature: Buffer, cert: string): string {
    // En una implementación real, se usaría node-forge, pkcs7 u otra librería
    // para generar el mensaje CMS correctamente
    return Buffer.from(tra).toString('base64');
  }

  /**
   * Autentica con AFIP y obtiene token y sign
   */
  private async authenticate(): Promise<TokenAFIP> {
    try {
      // Crear CMS
      const cms = await this.createCMS();
      
      // Crear cliente SOAP
      const client = await soap.createClientAsync(this.wsaaUrl + '?WSDL');
      
      // Llamar al método loginCms
      const result = await client.loginCmsAsync({
        in0: cms
      });
      
      // Parsear XML de respuesta
      const response = await parseStringPromise(result[0].loginCmsReturn);
      
      // Extraer credentials
      const credentials = response.loginTicketResponse.credentials[0];
      const token = credentials.token[0];
      const sign = credentials.sign[0];
      
      // Calcular expiración (24 horas)
      const expirationTime = new Date();
      expirationTime.setSeconds(expirationTime.getSeconds() + AFIP_CONFIG.tokenDuration);
      
      return {
        token,
        sign,
        expirationTime
      };
    } catch (error) {
      console.error('Error en autenticación AFIP:', error);
      throw new Error('No se pudo autenticar con AFIP');
    }
  }

  /**
   * Obtiene token y sign, autenticando si es necesario
   */
  public async getAuth(): Promise<{ Token: string; Sign: string; Cuit: string }> {
    if (!this.isTokenValid()) {
      const auth = await this.authenticate();
      this.token = auth.token;
      this.sign = auth.sign;
      this.tokenExpiration = auth.expirationTime;
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
      console.error('Error obteniendo último número de comprobante:', error);
      throw new Error('No se pudo obtener el último número de comprobante');
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
              Iva: {
                AlicIva: params.iva
              }
            }
          }
        }
      };
      
      // Llamar al método FECAESolicitar
      const result = await client.FECAESolicitarAsync(request);
      
      // Procesar respuesta
      const response = result[0].FECAESolicitarResult;
      const respDetalle = response.FeDetResp.FECAEDetResponse;
      
      return {
        Resultado: respDetalle.Resultado,
        CAE: respDetalle.CAE,
        CAEFchVto: respDetalle.CAEFchVto,
        CbteNro: respDetalle.CbteDesde,
        Observaciones: respDetalle.Observaciones,
        Errores: response.Errors
      };
    } catch (error) {
      console.error('Error creando factura en AFIP:', error);
      throw new Error('No se pudo crear la factura en AFIP');
    }
  }
}
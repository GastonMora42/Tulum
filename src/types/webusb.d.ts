// src/types/webusb.d.ts - ARCHIVO NUEVO PARA DEFINICIONES WebUSB
declare global {
    interface Navigator {
      usb: USB;
    }
  
    interface USB extends EventTarget {
      getDevices(): Promise<USBDevice[]>;
      requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
      addEventListener(type: 'connect' | 'disconnect', listener: (this: USB, ev: USBConnectionEvent) => any, options?: boolean | AddEventListenerOptions): void;
      removeEventListener(type: 'connect' | 'disconnect', listener: (this: USB, ev: USBConnectionEvent) => any, options?: boolean | EventListenerOptions): void;
    }
  
    interface USBDeviceRequestOptions {
      filters: USBDeviceFilter[];
    }
  
    interface USBDeviceFilter {
      vendorId?: number;
      productId?: number;
      classCode?: number;
      subclassCode?: number;
      protocolCode?: number;
      serialNumber?: string;
    }
  
    interface USBDevice {
      readonly usbVersionMajor: number;
      readonly usbVersionMinor: number;
      readonly usbVersionSubminor: number;
      readonly deviceClass: number;
      readonly deviceSubclass: number;
      readonly deviceProtocol: number;
      readonly vendorId: number;
      readonly productId: number;
      readonly deviceVersionMajor: number;
      readonly deviceVersionMinor: number;
      readonly deviceVersionSubminor: number;
      readonly manufacturerName?: string;
      readonly productName?: string;
      readonly serialNumber?: string;
      readonly configuration: USBConfiguration | null;
      readonly configurations: USBConfiguration[];
      readonly opened: boolean;
  
      open(): Promise<void>;
      close(): Promise<void>;
      selectConfiguration(configurationValue: number): Promise<void>;
      claimInterface(interfaceNumber: number): Promise<void>;
      releaseInterface(interfaceNumber: number): Promise<void>;
      selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
      controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>;
      controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>;
      clearHalt(direction: USBDirection, endpointNumber: number): Promise<void>;
      transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
      transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
      isochronousTransferIn(endpointNumber: number, packetLengths: number[]): Promise<USBIsochronousInTransferResult>;
      isochronousTransferOut(endpointNumber: number, data: BufferSource, packetLengths: number[]): Promise<USBIsochronousOutTransferResult>;
      reset(): Promise<void>;
    }
  
    interface USBConfiguration {
      readonly configurationValue: number;
      readonly configurationName?: string;
      readonly interfaces: USBInterface[];
    }
  
    interface USBInterface {
      readonly interfaceNumber: number;
      readonly alternate: USBAlternateInterface;
      readonly alternates: USBAlternateInterface[];
      readonly claimed: boolean;
    }
  
    interface USBAlternateInterface {
      readonly alternateSetting: number;
      readonly interfaceClass: number;
      readonly interfaceSubclass: number;
      readonly interfaceProtocol: number;
      readonly interfaceName?: string;
      readonly endpoints: USBEndpoint[];
    }
  
    interface USBEndpoint {
      readonly endpointNumber: number;
      readonly direction: USBDirection;
      readonly type: USBEndpointType;
      readonly packetSize: number;
    }
  
    interface USBConnectionEvent extends Event {
      readonly device: USBDevice;
    }
  
    interface USBInTransferResult {
      readonly data: DataView;
      readonly status: USBTransferStatus;
    }
  
    interface USBOutTransferResult {
      readonly bytesWritten: number;
      readonly status: USBTransferStatus;
    }
  
    interface USBIsochronousInTransferPacket {
      readonly data: DataView;
      readonly status: USBTransferStatus;
    }
  
    interface USBIsochronousInTransferResult {
      readonly data: DataView;
      readonly packets: USBIsochronousInTransferPacket[];
    }
  
    interface USBIsochronousOutTransferPacket {
      readonly bytesWritten: number;
      readonly status: USBTransferStatus;
    }
  
    interface USBIsochronousOutTransferResult {
      readonly packets: USBIsochronousOutTransferPacket[];
    }
  
    interface USBControlTransferParameters {
      readonly requestType: USBRequestType;
      readonly recipient: USBRecipient;
      readonly request: number;
      readonly value: number;
      readonly index: number;
    }
  
    type USBDirection = 'in' | 'out';
    type USBEndpointType = 'bulk' | 'interrupt' | 'isochronous';
    type USBRequestType = 'standard' | 'class' | 'vendor';
    type USBRecipient = 'device' | 'interface' | 'endpoint' | 'other';
    type USBTransferStatus = 'ok' | 'stall' | 'babble';
  }
  
  export {};
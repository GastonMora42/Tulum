// src/components/productos/BarcodeGenerator.tsx
'use client';

import { useRef } from 'react';
import Barcode from 'react-barcode';

interface BarcodeGeneratorProps {
  value: string;
  productName?: string;
}

export const BarcodeGenerator = ({ value, productName }: BarcodeGeneratorProps) => {
  const barcodeRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = () => {
    const printContent = barcodeRef.current?.innerHTML;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Código de Barras</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            .barcode-container {
              display: inline-block;
              margin: 10px;
              padding: 15px;
              border: 1px dashed #ccc;
            }
            .product-name {
              margin-top: 5px;
              font-size: 12px;
              word-break: break-word;
              max-width: 200px;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${printContent}
            ${productName ? `<div class="product-name">${productName}</div>` : ''}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  if (!value) return <div>No hay código de barras disponible</div>;
  
  return (
    <div className="flex flex-col items-center p-4">
      <div ref={barcodeRef}>
        <Barcode value={value} />
      </div>
      <button
        onClick={handlePrint}
        className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
      >
        Imprimir código de barras
      </button>
    </div>
  );
};
// src/app/api/admin/productos/generate-barcode/route.ts - API SEGURA Y COMPATIBLE
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { barcodeService } from '@/server/services/producto/barcodeService';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { productName, productId, forceFormat, regenerate = false } = body;
    
    console.log('🔄 [Generate Barcode] Solicitud de generación:', {
      productName,
      productId,
      forceFormat,
      regenerate
    });
    
    let codigoGenerado: string;
    
    if (productId && regenerate) {
      // 🚨 REGENERAR CÓDIGO EXISTENTE (CON VALIDACIONES)
      console.log('⚠️ [Generate Barcode] Regenerando código existente...');
      
      try {
        codigoGenerado = await barcodeService.regenerateBarcode(productId, true);
        
        return NextResponse.json({
          codigoBarras: codigoGenerado,
          success: true,
          action: 'regenerated',
          warning: 'Código regenerado. El código anterior ya no será válido.',
          compatibility: await barcodeService.isCodeCompatible(codigoGenerado)
        });
        
      } catch (regenerateError: any) {
        if (regenerateError.message.includes('ADVERTENCIA')) {
          return NextResponse.json({
            error: regenerateError.message,
            requiresConfirmation: true,
            action: 'regenerate_confirmation_needed'
          }, { status: 409 });
        }
        throw regenerateError;
      }
      
    } else {
      // 🆕 GENERAR CÓDIGO NUEVO COMPATIBLE
      console.log('🆕 [Generate Barcode] Generando código nuevo compatible...');
      
      try {
        // Obtener información de compatibilidad actual
        const compatibilityInfo = await barcodeService.getCompatibilityInfo();
        
        // Generar código compatible con el formato recomendado
        codigoGenerado = await barcodeService.generateCompatibleBarcode(forceFormat);
        
        // Verificar compatibilidad del código generado
        const compatibility = await barcodeService.isCodeCompatible(codigoGenerado);
        
        console.log('✅ [Generate Barcode] Código generado:', codigoGenerado);
        console.log('🔍 [Generate Barcode] Compatibilidad:', compatibility);
        
        return NextResponse.json({
          codigoBarras: codigoGenerado,
          success: true,
          action: 'generated',
          compatibility: {
            format: compatibility.format,
            isCompatible: compatibility.isCompatible,
            warnings: compatibility.warnings
          },
          systemInfo: {
            recommendedFormat: compatibilityInfo.analysis.recommendedFormat,
            totalExistingCodes: compatibilityInfo.analysis.totalCodes,
            recommendations: compatibilityInfo.recommendations
          }
        });
        
      } catch (generateError: any) {
        console.error('❌ [Generate Barcode] Error al generar:', generateError);
        return NextResponse.json({
          error: `Error al generar código compatible: ${generateError.message}`,
          action: 'generation_failed'
        }, { status: 500 });
      }
    }
    
  } catch (error: any) {
    console.error('❌ [Generate Barcode] Error general:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar solicitud de código de barras' },
      { status: 500 }
    );
  }
}

// 🔍 ENDPOINT PARA OBTENER INFORMACIÓN DE COMPATIBILIDAD
export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    console.log('🔍 [Generate Barcode] Obteniendo información de compatibilidad...');
    
    // Obtener estadísticas y compatibilidad del sistema
    const [compatibilityInfo, stats] = await Promise.all([
      barcodeService.getCompatibilityInfo(),
      barcodeService.getBarcodeStats()
    ]);
    
    return NextResponse.json({
      success: true,
      systemAnalysis: compatibilityInfo.analysis,
      recommendations: compatibilityInfo.recommendations,
      supportedFormats: compatibilityInfo.supportedFormats,
      statistics: {
        totalProducts: stats.total,
        productsWithBarcode: stats.withBarcode,
        productsWithoutBarcode: stats.withoutBarcode,
        recentlyGenerated: stats.recentlyGenerated
      },
      safeguards: {
        preserveExisting: true,
        requireConfirmation: true,
        compatibilityChecks: true
      }
    });
    
  } catch (error: any) {
    console.error('❌ [Generate Barcode] Error al obtener información:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener información de compatibilidad' },
      { status: 500 }
    );
  }
}
-- IMPORTANTE: Ejecutar este script para corregir el CUIT
UPDATE "ConfiguracionAFIP" 
SET cuit = '27285773658' 
WHERE cuit = '30718236564';

-- Verificar el cambio
SELECT * FROM "ConfiguracionAFIP";
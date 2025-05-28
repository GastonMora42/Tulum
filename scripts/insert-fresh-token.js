// scripts/insert-fresh-token.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function insertFreshToken() {
  const cuit = '30718236564';
  const token = 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8c3NvIHZlcnNpb249IjIuMCI+CiAgICA8aWQgc3JjPSJDTj13c2FhLCBPPUFGSVAsIEM9QVIsIFNFUklBTE5VTUJFUj1DVUlUIDMzNjkzNDUwMjM5IiBkc3Q9IkNOPXdzZmUsIE89QUZJUCwgQz1BUiIgdW5pcXVlX2lkPSIyOTcwODUzMjU3IiBnZW5fdGltZT0iMTc0ODQ2MjIxMCIgZXhwX3RpbWU9IjE3NDg1MDU0NzAiLz4KICAgIDxvcGVyYXRpb24gdHlwZT0ibG9naW4iIHZhbHVlPSJncmFudGVkIj4KICAgICAgICA8bG9naW4gZW50aXR5PSIzMzY5MzQ1MDIzOSIgc2VydmljZT0id3NmZSIgdWlkPSJTRVJJQUxOVU1CRVI9Q1VJVCAzMDcxODIzNjU2NCwgQ049dHVsdW0tcHJvZCIgYXV0aG1ldGhvZD0iY21zIiByZWdtZXRob2Q9IjIyIj4KICAgICAgICAgICAgPHJlbGF0aW9ucz4KICAgICAgICAgICAgICAgIDxyZWxhdGlvbiBrZXk9IjMwNzE4MjM2NTY0IiByZWx0eXBlPSI0Ii8+CiAgICAgICAgICAgIDwvcmVsYXRpb25zPgogICAgICAgIDwvbG9naW4+CiAgICA8L29wZXJhdGlvbj4KPC9zc28+Cg==';
  const sign = 'Z1lEaNB/GBYJ0EwUfZ2thiQNpQ6I0EH2X9I0rsgspcFAI8/r01YO8WVU5kpVLt8Dw80K/9FmBv8X74oFSe7FYbJ8GUsuRqdM4DfoSm8ND/DCSZCV/LZAjgIalayBXyTDaB+yFtKfK0Bihf9PltF8a5NK6AgC3Ry6vRXSUYSIneY=';
  
  // Según tu XML, expira el 2025-05-29T04:57:50.880-03:00
  const expirationTime = new Date('2025-05-29T07:57:50.880Z'); // UTC
  
  try {
    const existing = await prisma.tokenAFIP.findFirst({
      where: { cuit }
    });
    
    if (existing) {
      await prisma.tokenAFIP.update({
        where: { id: existing.id },
        data: { token, sign, expirationTime }
      });
      console.log('✅ Token actualizado');
    } else {
      await prisma.tokenAFIP.create({
        data: {
          cuit,
          token,
          sign,
          expirationTime
        }
      });
      console.log('✅ Token creado');
    }
    
    console.log(`Expira: ${expirationTime}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertFreshToken();
#!/bin/bash
# Script para descargar imágenes placeholder
echo "Descargando imágenes placeholder para categorías..."

cd public/images/categorias

# Aceites Corporales
echo "Descargando aceites.webp..."
curl -L "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400" -o "aceites.webp"

# Aguas Aromáticas
echo "Descargando aguas.jpg..."
curl -L "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400" -o "aguas.jpg"

# Bombas de Baño
echo "Descargando bombas-baño.webp..."
curl -L "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400" -o "bombas-baño.webp"

# Difusores para Auto
echo "Descargando difusores-auto.webp..."
curl -L "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400" -o "difusores-auto.webp"

# Difusores de Hogar
echo "Descargando difusores.webp..."
curl -L "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400" -o "difusores.webp"

# Esencias para Hornillo
echo "Descargando esencia-humi.webp..."
curl -L "https://images.unsplash.com/photo-1574706909645-f29b26e0d5a4?w=400" -o "esencia-humi.webp"

# Esencias para Humidificador
echo "Descargando esencia-humi.webp..."
curl -L "https://images.unsplash.com/photo-1556760544-74068565f05c?w=400" -o "esencia-humi.webp"

# Espumas de Baño
echo "Descargando espuma-baño.webp..."
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400" -o "espuma-baño.webp"

# Fragancias Textiles
echo "Descargando fragancia.webp..."
curl -L "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400" -o "fragancia.webp"

# Home Sprays
echo "Descargando home-spray.webp..."
curl -L "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400" -o "home-spray.webp"

# Humidificadores con Filtro
echo "Descargando humidificadores.webp..."
curl -L "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400" -o "humidificadores.webp"

# Humidificadores Grandes
echo "Descargando humidificadores-grandes.jpg..."
curl -L "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400" -o "humidificadores-grandes.jpg"

# Humidificadores Medianos
echo "Descargando humidificadores-medianos.jpg..."
curl -L "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400" -o "humidificadores-medianos.jpg"

# Jabones
echo "Descargando jabones.jpg..."
curl -L "https://images.unsplash.com/photo-1556229174-5e42a09e12ba?w=400" -o "jabones.jpg"

# Sales de Baño
echo "Descargando sales.webp..."
curl -L "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400" -o "sales.webp"

# Accesorios
echo "Descargando accesorios.jpg..."
curl -L "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400" -o "accesorios.jpg"

# Velas de Soja
echo "Descargando velas.jpg..."
curl -L "https://images.unsplash.com/photo-1602006832014-94ee0b4b0b67?w=400" -o "velas.jpg"

echo "✅ Descarga completada"
echo "💡 Reemplaza estas imágenes con fotos reales de tus productos"

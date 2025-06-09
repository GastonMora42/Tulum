# Gestión de Imágenes - Tulum Aromaterapia

## Estructura de Directorios

```
public/images/
├── categorias/          # Imágenes base para cada categoría
└── productos/           # Imágenes específicas de productos (opcional)
```

## Imágenes de Categorías Requeridas

### Aceites Corporales
- **Archivo:** `public/images/categorias/aceites.webp`
- **Descripción:** Botellas de aceites corporales aromáticos
- **Colores sugeridos:** #8B4513, #CD853F
- **Placeholder temporal:** https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400

### Aguas Aromáticas
- **Archivo:** `public/images/categorias/aguas.jpg`
- **Descripción:** Frascos spray de aguas aromáticas
- **Colores sugeridos:** #4682B4, #87CEEB
- **Placeholder temporal:** https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400

### Bombas de Baño
- **Archivo:** `public/images/categorias/bombas-baño.webp`
- **Descripción:** Bombas efervescentes coloridas para baño
- **Colores sugeridos:** #FF69B4, #DDA0DD
- **Placeholder temporal:** https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400

### Difusores para Auto
- **Archivo:** `public/images/categorias/difusores-auto.webp`
- **Descripción:** Difusores aromáticos para automóvil
- **Colores sugeridos:** #2F4F4F, #696969
- **Placeholder temporal:** https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400

### Difusores de Hogar
- **Archivo:** `public/images/categorias/difusores.webp`
- **Descripción:** Difusores con varillas de rattan para el hogar
- **Colores sugeridos:** #DEB887, #F5DEB3
- **Placeholder temporal:** https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400

### Esencias para Hornillo
- **Archivo:** `public/images/categorias/esencia-humi.webp`
- **Descripción:** Frascos pequeños de esencias para hornillo
- **Colores sugeridos:** #8B0000, #DC143C
- **Placeholder temporal:** https://images.unsplash.com/photo-1574706909645-f29b26e0d5a4?w=400

### Esencias para Humidificador
- **Archivo:** `public/images/categorias/esencia-humi.webp`
- **Descripción:** Botellas de esencias para humidificador
- **Colores sugeridos:** #00CED1, #48D1CC
- **Placeholder temporal:** https://images.unsplash.com/photo-1556760544-74068565f05c?w=400

### Espumas de Baño
- **Archivo:** `public/images/categorias/espuma-baño.webp`
- **Descripción:** Botellas de espuma de baño aromática
- **Colores sugeridos:** #9370DB, #BA55D3
- **Placeholder temporal:** https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400

### Fragancias Textiles
- **Archivo:** `public/images/categorias/fragancia.webp`
- **Descripción:** Sprays para perfumar textiles
- **Colores sugeridos:** #32CD32, #98FB98
- **Placeholder temporal:** https://images.unsplash.com/photo-1541643600914-78b084683601?w=400

### Home Sprays
- **Archivo:** `public/images/categorias/home-spray.webp`
- **Descripción:** Sprays aromáticos para ambientes
- **Colores sugeridos:** #FF6347, #FFA07A
- **Placeholder temporal:** https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400

### Humidificadores con Filtro
- **Archivo:** `public/images/categorias/humidificadores.webp`
- **Descripción:** Humidificadores aromáticos con filtro
- **Colores sugeridos:** #4169E1, #6495ED
- **Placeholder temporal:** https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400

### Humidificadores Grandes
- **Archivo:** `public/images/categorias/humidificadores-grandes.jpg`
- **Descripción:** Humidificadores de gran capacidad
- **Colores sugeridos:** #2E8B57, #3CB371
- **Placeholder temporal:** https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400

### Humidificadores Medianos
- **Archivo:** `public/images/categorias/humidificadores-medianos.jpg`
- **Descripción:** Humidificadores de tamaño mediano
- **Colores sugeridos:** #20B2AA, #40E0D0
- **Placeholder temporal:** https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400

### Jabones
- **Archivo:** `public/images/categorias/jabones.jpg`
- **Descripción:** Jabones líquidos y sólidos aromáticos
- **Colores sugeridos:** #DAA520, #F0E68C
- **Placeholder temporal:** https://images.unsplash.com/photo-1556229174-5e42a09e12ba?w=400

### Sales de Baño
- **Archivo:** `public/images/categorias/sales.webp`
- **Descripción:** Sales de baño aromáticas en frascos
- **Colores sugeridos:** #E6E6FA, #DDA0DD
- **Placeholder temporal:** https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400

### Accesorios
- **Archivo:** `public/images/categorias/accesorios.jpg`
- **Descripción:** Accesorios y complementos para aromaterapia
- **Colores sugeridos:** #808080, #A9A9A9
- **Placeholder temporal:** https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400

### Velas de Soja
- **Archivo:** `public/images/categorias/velas.jpg`
- **Descripción:** Velas aromáticas de cera de soja
- **Colores sugeridos:** #F5F5DC, #FFFACD
- **Placeholder temporal:** https://images.unsplash.com/photo-1602006832014-94ee0b4b0b67?w=400


## Implementación

1. **Imágenes por defecto:** Cada producto hereda la imagen de su categoría
2. **Imágenes específicas:** Se pueden asignar imágenes únicas por producto
3. **Fallback:** Si no existe la imagen, se muestra un placeholder

## Comandos Útiles

```bash
# Actualizar categorías con imágenes
node scripts/insertar/gestionar-imagenes-categorias.js --actualizar-categorias

# Generar placeholders temporales
node scripts/insertar/gestionar-imagenes-categorias.js --generar-placeholders

# Verificar imágenes existentes
node scripts/insertar/gestionar-imagenes-categorias.js --verificar
```

## Especificaciones Técnicas

- **Formato:** JPG, PNG, WebP
- **Tamaño:** 400x400px mínimo
- **Peso:** Máximo 200KB por imagen
- **Aspecto:** Cuadrado (1:1) preferible

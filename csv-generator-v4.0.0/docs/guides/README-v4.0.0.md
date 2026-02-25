# 🚀 CSV Generator v4.0.0 - MEGA UPDATE

## 📦 **ARCHIVOS v4.0.0:**

```
📁 v4.0.0/
├── formatLoaders.js           (nuevo) - Soporte XLSX, CSV, JSON, XML
├── transformations.js         (nuevo) - 10+ transformaciones
├── html-format-selector.html  (nuevo) - UI selector de formato
├── html-transform-modal.html  (nuevo) - Modal avanzado
├── app-v4-modules.js          (nuevo) - Módulos combinados
└── INTEGRATION-GUIDE.md       (este archivo)
```

---

## 🎯 **NUEVAS CARACTERÍSTICAS:**

### **1. Multi-Formato Input** ✨
- ✅ **XLSX** - Excel (.xlsx, .xls)
- ✅ **CSV** - Comma Separated Values
  - Auto-detección de separador
  - Múltiples encodings (UTF-8, Latin1, Windows-1252)
  - Opción de headers
- ✅ **JSON** - Dos formatos soportados:
  - Array de objetos: `[{col1: val}, {col1: val}]`
  - Objeto con arrays: `{col1: [val,val], col2: [val,val]}`
- ✅ **XML** - Estructura tabular
  - Auto-detección de nodos
  - Opción de xpath manual

### **2. Multi-Transformación** 🔀

#### **División Simple** (ya existente, mejorado)
```
"GARCIA, MANUEL" 
  separador: ", "
  → ["GARCIA", "MANUEL"]
```

#### **División Múltiple** (NUEVO)
```
"GARCIA,PEREZ JUAN CARLOS"
  sep1: ","  → ["GARCIA", "PEREZ JUAN CARLOS"]
  sep2: " "  → ["GARCIA", "PEREZ", "JUAN", "CARLOS"]
```

#### **Combinar Columnas** (NUEVO)
```
apellidos: "GARCIA"
nombre: "JUAN"
  separador: ", "
  → "GARCIA, JUAN"
```

#### **Extraer con Regex** (NUEVO)
```
"juan@company.com"
  pattern: (\w+)@(\w+\.\w+)
  → usuario: "juan"
  → dominio: "company.com"
```

#### **Reemplazar Texto** (NUEVO)
```
"Usuario-123"
  find: "-"
  replace: "_"
  → "Usuario_123"
```

#### **Mayúsculas/Minúsculas** (NUEVO)
```
"juan garcía"
  tipo: title
  → "Juan García"
```

#### **Y más...**
- Substring/Slice
- Padding (rellenar con ceros)
- Limpieza (trim, quitar espacios extra, etc.)
- Condicionales

---

## 📋 **INTEGRACIÓN PASO A PASO:**

### **PASO 1: Agregar librerías CDN**

En el `<head>` del HTML, **ANTES** de cerrar `</head>`:

```html
<!-- PapaParse para CSV -->
<script src="https://cdn.jsdelivr.net/npm/papaparse@5/papaparse.min.js"></script>

<!-- XLSX (ya lo tienes) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```

### **PASO 2: Incluir módulos JavaScript**

**ANTES** de tu `<script>` principal (app.js), agrega:

```html
<script src="formatLoaders.js"></script>
<script src="transformations.js"></script>
```

O si prefieres todo junto:

```html
<script src="app-v4-modules.js"></script>
```

### **PASO 3: Reemplazar PASO 2 del HTML**

Busca en tu `index.html` el PASO 2 (Cargar Excel) y reemplázalo con el contenido de:

```
html-format-selector.html
```

### **PASO 4: Agregar/Reemplazar Modal de Transformaciones**

Reemplaza el modal actual `#divisionModal` con el contenido de:

```
html-transform-modal.html
```

### **PASO 5: Actualizar app.js**

Cambia estas funciones:

#### **5a. Función handleFileUpload**

Ya está en `html-format-selector.html`, pero asegúrate de que llame a `setupMapping()` al final.

#### **5b. Botón "Dividir" → "Transformar"**

Cambia el botón en la tabla de mapeo:

```html
<!-- ANTES -->
<button onclick="openDivisionModal('${requiredCol}')">
    🔀 Dividir
</button>

<!-- AHORA -->
<button onclick="openTransformModal('${requiredCol}')">
    🎨 Transformar
</button>
```

---

## 🎨 **EJEMPLOS DE USO:**

### **Ejemplo 1: CSV con punto y coma**

```csv
userid;email;nombre
123;juan@test.com;Juan Pérez
124;ana@test.com;Ana García
```

1. Seleccionar formato: **CSV**
2. Opciones CSV:
   - Separador: `;` (punto y coma)
   - Headers: ✅
3. Cargar archivo
4. ¡Listo! Se procesa automáticamente

---

### **Ejemplo 2: JSON array de objetos**

```json
[
  {"userid": "123", "email": "juan@test.com"},
  {"userid": "124", "email": "ana@test.com"}
]
```

1. Seleccionar formato: **JSON**
2. Cargar archivo
3. ¡Automático!

---

### **Ejemplo 3: División múltiple**

Archivo: nombres como "GARCIA,PEREZ JUAN CARLOS"

1. Cargar archivo
2. Click "🎨 Transformar" en columna "nombre"
3. Seleccionar: **🔀 División Múltiple**
4. Separador 1: `,`
5. Click "➕ Agregar Separador"
6. Separador 2: ` ` (espacio)
7. Preview muestra: `["GARCIA", "PEREZ", "JUAN", "CARLOS"]`
8. Nombrar:
   - Parte 1: apellido1
   - Parte 2: apellido2
   - Parte 3: nombre1
   - Parte 4: nombre2
9. ✅ Aplicar

---

### **Ejemplo 4: Extraer email con regex**

Datos: "juan@company.com"

1. Transformar columna "email"
2. Tipo: **🔍 Extraer (Regex)**
3. Patrón: `(\w+)@(\w+\.\w+)`
4. Preview muestra 2 grupos
5. Nombrar:
   - Grupo 1: usuario
   - Grupo 2: dominio
6. ✅ Aplicar
7. Resultado:
   - email_usuario: "juan"
   - email_dominio: "company.com"

---

## 🔧 **API PROGRAMÁTICA:**

Si querés usar las transformaciones en tu código:

```javascript
// División simple
const result = Transformations.split(
    data,               // array de objetos
    'nombreCompleto',   // columna origen
    ', ',               // separador
    ['apellidos', 'nombre']  // nombres de partes
);

// División múltiple
const result = Transformations.splitMultiple(
    data,
    'nombreCompleto',
    {
        separators: [',', ' '],
        partNames: ['ap1', 'ap2', 'nom1', 'nom2']
    }
);

// Combinar
const result = Transformations.combine(
    data,
    ['apellidos', 'nombre'],  // columnas a combinar
    'nombreCompleto',          // columna destino
    ', '                       // separador
);

// Regex
const result = Transformations.extractRegex(
    data,
    'email',
    /(\w+)@(\w+\.\w+)/,
    ['usuario', 'dominio']
);
```

---

## 📊 **ESTRUCTURA DE DATOS:**

Todos los formatos se convierten internamente a:

```javascript
{
    columns: ['col1', 'col2', 'col3'],
    data: [
        {col1: 'val1', col2: 'val2', col3: 'val3'},
        {col1: 'val4', col2: 'val5', col3: 'val6'}
    ]
}
```

Esto garantiza que **todos los formatos funcionen igual** después de cargados.

---

## 🐛 **TROUBLESHOOTING:**

### **"PapaParse is not defined"**
→ Falta el CDN de PapaParse en el `<head>`

### **"FormatLoaders is not defined"**
→ Falta incluir `formatLoaders.js` o `app-v4-modules.js`

### **CSV no detecta separador**
→ Selecciona manualmente en las opciones CSV

### **XML no encuentra filas**
→ Especifica el nombre del elemento en "XML Row Path"

### **JSON error "formato no soportado"**
→ Verifica que sea array de objetos o objeto con arrays

---

## 🚀 **DEPLOY:**

```bash
git add .
git commit -m "v4.0.0 - Multi-format + Multi-transform"
git push origin main
```

---

## 📝 **CHANGELOG v4.0.0:**

### **🆕 Nuevas Features:**
- Multi-formato input (CSV, JSON, XML)
- División múltiple con N separadores
- Combinar columnas
- Extraer con regex
- Reemplazar texto
- Transformar mayús/minús
- 10+ transformaciones disponibles

### **✅ Mejoras:**
- División simple con botones rápidos
- Preview automático EN VIVO
- Auto-detección de separadores
- Auto-detección de encoding
- Validaciones mejoradas
- UI más intuitiva

### **🐛 Fixes:**
- Bug división no guardaba columnas ✅
- Datos llegaban vacíos ✅
- Mapeo no se actualizaba ✅

---

## 🎯 **ROADMAP v4.1+:**

- Drag & drop para mapeo
- Transformaciones encadenadas
- Templates guardados
- Export a múltiples formatos
- Modo oscuro

---

**¡Versión v4.0.0 lista para usar!** 🎉

¿Dudas? Revisá los ejemplos en este README.

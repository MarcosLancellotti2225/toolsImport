# 📦 INSTALACIÓN CSV Generator v4.0.0

---

## ⚡ INSTALACIÓN RÁPIDA (3 pasos)

### **1. Descargar**
Descarga el ZIP y descomprime

### **2. Subir a GitHub**
```bash
cd csv-generator-v4.0.0
git init
git add .
git commit -m "Initial commit v4.0.0"
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

### **3. Activar GitHub Pages**
1. Ve a Settings → Pages
2. Source: Deploy from branch
3. Branch: `main` → carpeta `/ (root)`
4. Save

**¡Listo!** En 2-3 minutos estará en:
`https://TU-USUARIO.github.io/TU-REPO/`

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
csv-generator-v4.0.0/
├── index.html              ← HTML principal
├── styles.css              ← Estilos
├── app.js                  ← Lógica principal
│
├── formatLoaders.js        ← NUEVO v4.0: Carga XLSX/CSV/JSON/XML
├── transformations.js      ← NUEVO v4.0: Transformaciones
│
├── .gitignore              ← Ignora archivos innecesarios
├── .nojekyll               ← Deshabilita Jekyll
│
├── README.md               ← Documentación principal
├── INSTALL.md              ← Esta guía
├── CHANGELOG.md            ← Historial de versiones
│
└── docs/                   ← Documentación adicional
    ├── html-format-selector.html     ← Snippet selector formato
    ├── html-transform-modal.html     ← Snippet modal avanzado
    └── guides/
        ├── README-v4.0.0.md          ← Guía técnica completa
        └── RESUMEN-v4.0.0.md         ← Quick start
```

---

## 🎯 USAR EN LOCAL (Sin GitHub)

### **Opción 1: Abrir directo**
```bash
# Solo doble-click en:
index.html
```

### **Opción 2: Servidor local (recomendado)**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js
npx http-server

# Luego abrir: http://localhost:8000
```

---

## 🔧 CONFIGURACIÓN

### **Verificar que todo está OK**

Abre `index.html` y verifica:

1. **Consola sin errores** (F12)
2. **Selector de producto** funciona
3. **Selector de formato** aparece
4. **Carga XLSX** funciona
5. **División** funciona

### **Si algo falla:**

#### **Error: "FormatLoaders is not defined"**
→ Falta incluir `formatLoaders.js` en index.html

Abre `index.html` y verifica que tiene:
```html
<script src="formatLoaders.js"></script>
<script src="transformations.js"></script>
```

#### **Error: "PapaParse is not defined"**
→ Falta CDN de PapaParse

En `<head>` debe tener:
```html
<script src="https://cdn.jsdelivr.net/npm/papaparse@5/papaparse.min.js"></script>
```

#### **CSV no funciona**
→ Verificar que PapaParse está cargado (ver arriba)

#### **División no guarda columnas**
→ Usar la versión de `app.js` incluida (ya tiene el fix v3.3)

---

## 🚀 DEPLOY A GITHUB PAGES

### **Opción 1: Repositorio NUEVO**

```bash
cd csv-generator-v4.0.0

# Inicializar Git
git init

# Agregar todo
git add .

# Commit inicial
git commit -m "v4.0.0 - Multi-format + Multi-transform"

# Crear repo en GitHub (nombre: toolsImport)

# Conectar repo
git remote add origin https://github.com/TU-USUARIO/toolsImport.git

# Push
git branch -M main
git push -u origin main

# Activar GitHub Pages:
# Settings → Pages → Source: main → Save
```

### **Opción 2: Repositorio EXISTENTE**

```bash
cd TU-REPO-ACTUAL

# Guardar cambios actuales (backup)
git checkout -b backup-pre-v4

# Volver a main
git checkout main

# Copiar archivos v4.0
cp -r /ruta/a/csv-generator-v4.0.0/* .

# Agregar y commitear
git add .
git commit -m "Update to v4.0.0"

# Push (si hay conflictos, ver abajo)
git push origin main
```

### **Si hay conflictos al push:**

```bash
# Opción A: Force push (sobrescribe remoto)
git push origin main --force

# Opción B: Pull + Merge
git pull origin main
# Resolver conflictos si aparecen
git push origin main
```

---

## 📝 ACTUALIZAR DESDE v3.x

Si ya tienes una versión anterior (v3.0, v3.1, v3.2, v3.3):

### **1. Backup**
```bash
git checkout -b backup-v3
git push origin backup-v3
```

### **2. Agregar archivos nuevos**
```bash
# Copiar nuevos módulos
cp formatLoaders.js TU-REPO/
cp transformations.js TU-REPO/
```

### **3. Actualizar index.html**

Agregar **ANTES** de `<script src="app.js">`:

```html
<script src="formatLoaders.js"></script>
<script src="transformations.js"></script>
```

Y en el `<head>`, agregar:

```html
<script src="https://cdn.jsdelivr.net/npm/papaparse@5/papaparse.min.js"></script>
```

### **4. Actualizar app.js**

Reemplazar con el `app.js` incluido (tiene fixes v3.3).

### **5. Commit y push**
```bash
git add .
git commit -m "Update to v4.0.0"
git push origin main
```

---

## 🧪 TESTING

### **Test 1: XLSX (debe funcionar como antes)**
1. Cargar archivo Excel
2. Verificar que procesa

### **Test 2: CSV (NUEVO)**
1. Seleccionar formato CSV
2. Cargar archivo .csv
3. Verificar que detecta separador
4. Verificar que carga datos

### **Test 3: División simple (debe funcionar)**
1. Cargar archivo con nombres: "GARCIA, MANUEL"
2. Click "🔀 Dividir"
3. Separador: `, ` (coma + espacio)
4. Nombrar: apellidos, nombre
5. Aplicar
6. Verificar columnas creadas

---

## ❓ FAQ

**¿Necesito instalar algo?**
→ No, todo corre en el navegador

**¿Funciona offline?**
→ Sí, excepto los CDN (XLSX, PapaParse)

**¿Qué navegadores soporta?**
→ Chrome, Firefox, Safari, Edge (últimas versiones)

**¿Puedo usarlo sin GitHub?**
→ Sí, abriendo index.html localmente

**¿Los datos se suben a algún servidor?**
→ No, todo es client-side

---

## 🆘 SOPORTE

**Problemas con la instalación:**
1. Revisa la consola (F12) en busca de errores
2. Verifica que todos los archivos están en la misma carpeta
3. Asegúrate que los CDN se cargan (revisa Network en F12)

**¿Sigue sin funcionar?**
→ Consulta: [docs/guides/RESUMEN-v4.0.0.md](docs/guides/RESUMEN-v4.0.0.md)

---

## ✅ CHECKLIST FINAL

Antes de usar en producción:

- [ ] Todos los archivos copiados
- [ ] index.html abre sin errores
- [ ] XLSX funciona
- [ ] CSV funciona
- [ ] División funciona
- [ ] GitHub Pages activo
- [ ] URL pública funciona

---

**¡Listo para usar!** 🚀

Si necesitas ayuda adicional, revisa la documentación en `docs/guides/`

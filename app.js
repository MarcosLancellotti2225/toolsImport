// ============================================
// CSV Generator v4.1.0
// Multi-format + Multi-sheet + No errors
// ============================================

(function() {
    'use strict';

    // ============================================
    // ESTADO GLOBAL
    // ============================================
    const state = {
        selectedProduct: null,
        selectedCommand: null,
        selectedFormat: 'xlsx',  // NUEVO: formato seleccionado
        currentWorkbook: null,   // NUEVO: workbook para hojas múltiples
        excelColumns: [],
        excelData: [],
        mapping: {},
        hasHeaderRow: true
    };

    // ============================================
    // TEMPLATES (IvSign + IvNeos)
    // ============================================
    const templates = {
        ivsign: {
            'users-add': {
                columns: ['userid', 'email', 'nombre', 'apellidos', 'dni', 'telefono', 'rol', 'password'],
                defaults: { rol: 'admin', password: '---' }
            },
            'users-modify': {
                columns: ['userid', 'email', 'nombre', 'apellidos', 'dni', 'telefono', 'rol'],
                defaults: { rol: 'admin' }
            },
            'users-delete': {
                columns: ['userid'],
                defaults: {}
            },
            'certs-add': {
                columns: ['userid', 'certType', 'p12File', 'p12Pass'],
                defaults: { certType: 'qualified' }
            },
            'certs-modify': {
                columns: ['userid', 'certType', 'p12File', 'p12Pass'],
                defaults: { certType: 'qualified' }
            },
            'certs-delegate': {
                columns: ['userid', 'certType', 'certSerial', 'certOwner'],
                defaults: { certType: 'qualified' }
            },
            'delegs-add': {
                columns: ['userid', 'delegType', 'delegUser', 'delegStart', 'delegEnd'],
                defaults: { delegType: 'permanent' }
            },
            'delegs-modify': {
                columns: ['userid', 'delegType', 'delegUser', 'delegStart', 'delegEnd'],
                defaults: { delegType: 'permanent' }
            },
            'delegs-delete': {
                columns: ['userid', 'delegUser'],
                defaults: {}
            },
            'rules-add': {
                columns: ['userid', 'ruleType', 'ruleValue'],
                defaults: { ruleType: 'email' }
            },
            'rules-modify': {
                columns: ['userid', 'ruleType', 'ruleValue'],
                defaults: { ruleType: 'email' }
            }
        },
        ivneos: {
            'clientes': {
                columns: ['identificador', 'razon_social', 'nif', 'email', 'telefono'],
                defaults: {}
            },
            'grupos': {
                columns: ['id_grupo', 'nombre_grupo', 'descripcion'],
                defaults: {}
            },
            'usuarios': {
                columns: ['userid', 'email', 'nombre', 'apellidos', 'dni', 'telefono', 'grupo'],
                defaults: { grupo: 'usuarios' }
            }
        }
    };

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        setupProductSelection();
        setupFormatSelection();  // NUEVO
        setupFileUpload();
        setupHeaderOptions();
        setupDownload();
        setupReset();
    }

    // ============================================
    // PASO 1: SELECCIÓN DE PRODUCTO Y COMANDO
    // ============================================
    function setupProductSelection() {
        // Product cards
        document.querySelectorAll('.product-card').forEach(card => {
            card.onclick = () => {
                const product = card.dataset.product;
                selectProduct(product);
            };
        });

        // Template buttons
        document.getElementById('createTemplateBtn').onclick = () => {
            if (!state.selectedCommand) {
                alert('⚠️ Primero selecciona un comando');
                return;
            }
            createEmptyTemplate();
        };

        document.getElementById('loadExcelBtn').onclick = () => {
            if (!state.selectedCommand) {
                alert('⚠️ Primero selecciona un comando');
                return;
            }
            // Show format selector
            document.getElementById('formatSelector').style.display = 'block';
            document.getElementById('formatSelector').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        };

        document.getElementById('downloadTemplateBtn').onclick = () => {
            if (!state.selectedCommand) {
                alert('⚠️ Primero selecciona un comando');
                return;
            }
            downloadTemplate();
        };
    }

    function selectProduct(product) {
        state.selectedProduct = product;
        
        // Update UI
        document.querySelectorAll('.product-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-product="${product}"]`).classList.add('selected');

        // Show command selection
        document.getElementById('commandSelection').style.display = 'block';
        
        // Generate command buttons dynamically
        const commandGrid = document.getElementById('commandGrid');
        commandGrid.innerHTML = '';
        
        const productTemplates = templates[product];
        Object.keys(productTemplates).forEach(cmdKey => {
            const btn = document.createElement('button');
            btn.className = 'command-item';
            btn.dataset.command = cmdKey;
            btn.textContent = cmdKey;
            btn.onclick = () => selectCommand(cmdKey);
            commandGrid.appendChild(btn);
        });
        
        // Scroll
        document.getElementById('commandSelection').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    function selectCommand(command) {
        state.selectedCommand = command;
        
        // Update UI
        document.querySelectorAll('.command-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-command="${command}"]`).classList.add('selected');

        // Show columns info
        const template = getTemplate();
        const columnsInfo = document.getElementById('columnsInfo');
        const requiredColumns = document.getElementById('requiredColumns');
        
        columnsInfo.style.display = 'block';
        requiredColumns.textContent = template.columns.join(', ');
        
        // Show next step (format selection)
        const formatStep = document.querySelector('.step:nth-of-type(2)');
        if (formatStep) {
            formatStep.style.display = 'block';
            formatStep.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }

    // ============================================
    // TEMPLATES
    // ============================================
    function createEmptyTemplate() {
        const template = getTemplate();
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([template.columns]);
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, `template_${state.selectedCommand}.xlsx`);
    }

    function downloadTemplate() {
        const template = getTemplate();
        const sampleData = [
            template.columns,
            template.columns.map(col => template.defaults[col] || `ejemplo_${col}`)
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(sampleData);
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, `template_${state.selectedCommand}_con_ejemplo.xlsx`);
    }

    function getTemplate() {
        return templates[state.selectedProduct][state.selectedCommand];
    }

    // ============================================
    // PASO 2: SELECCIÓN DE FORMATO (NUEVO)
    // ============================================
    function setupFormatSelection() {
        const formatCards = document.querySelectorAll('.format-card');
        
        formatCards.forEach(card => {
            card.onclick = () => {
                const format = card.dataset.format;
                selectFormat(format);
            };
        });
    }

    function selectFormat(format) {
        state.selectedFormat = format;
        
        // Update UI
        document.querySelectorAll('.format-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-format="${format}"]`).classList.add('selected');

        // Show/hide format options
        document.querySelectorAll('.format-options').forEach(opt => {
            opt.style.display = 'none';
        });
        
        document.getElementById('formatOptions').style.display = 'none';
        
        if (format === 'csv') {
            document.getElementById('formatOptions').style.display = 'block';
            document.getElementById('csvOptions').style.display = 'block';
        } else if (format === 'xml') {
            document.getElementById('formatOptions').style.display = 'block';
            document.getElementById('xmlOptions').style.display = 'block';
        }

        // Update file input accept
        const accepts = {
            xlsx: '.xlsx,.xls',
            csv: '.csv',
            json: '.json',
            xml: '.xml'
        };
        document.getElementById('fileInput').accept = accepts[format];

        // Show upload button
        document.getElementById('uploadBtn').style.display = 'block';
        document.getElementById('noFormatSelected').style.display = 'none';
    }

    // ============================================
    // CARGA DE ARCHIVOS (MULTI-FORMATO)
    // ============================================
    function setupFileUpload() {
        document.getElementById('fileInput').onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileUpload(file);
            }
        };
    }

    async function handleFileUpload(file) {
        if (!state.selectedCommand) {
            alert('⚠️ Primero selecciona un comando');
            return;
        }

        try {
            let result;
            
            // Cargar según formato seleccionado
            switch (state.selectedFormat) {
                case 'xlsx':
                    result = await loadXLSXFile(file);
                    break;
                    
                case 'csv':
                    const csvOptions = {
                        delimiter: document.getElementById('csvDelimiter').value === 'auto' ? null : document.getElementById('csvDelimiter').value,
                        encoding: document.getElementById('csvEncoding').value,
                        hasHeader: document.getElementById('csvHasHeader').checked
                    };
                    result = await FormatLoaders.loadCSV(file, csvOptions);
                    break;
                    
                case 'json':
                    result = await FormatLoaders.loadJSON(file);
                    break;
                    
                case 'xml':
                    const xmlOptions = {
                        rowPath: document.getElementById('xmlRowPath').value || null
                    };
                    result = await FormatLoaders.loadXML(file, xmlOptions);
                    break;
            }
            
            // Guardar datos
            state.excelColumns = result.columns;
            state.excelData = result.data;
            
            // Mostrar opciones de header (solo para XLSX)
            if (state.selectedFormat === 'xlsx') {
                document.getElementById('headerOption').style.display = 'block';
                document.getElementById('headerOption').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            } else {
                // Para otros formatos, ir directo al mapeo
                setupMapping();
            }
            
        } catch (error) {
            alert('❌ Error al procesar archivo:\n' + error.message);
            console.error(error);
        }
    }

    // Cargar XLSX con soporte multi-hoja
    async function loadXLSXFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    state.currentWorkbook = workbook;
                    
                    // Si hay múltiples hojas, mostrar selector
                    if (workbook.SheetNames.length > 1) {
                        showSheetSelector(workbook);
                        resolve({ columns: [], data: [] }); // Placeholder
                    } else {
                        // Solo una hoja
                        const result = processSheet(workbook, workbook.SheetNames[0]);
                        resolve(result);
                    }
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    function showSheetSelector(workbook) {
        const html = `
            <div style="margin: 20px 0; padding: 20px; background: #f8f9ff; border: 2px solid #667eea; border-radius: 10px;">
                <h4 style="color: #667eea; margin-bottom: 15px;">
                    📑 Este archivo tiene ${workbook.SheetNames.length} hojas
                </h4>
                <p style="margin-bottom: 15px; color: #666;">
                    Selecciona qué hoja quieres procesar:
                </p>
                <select id="sheetSelector" style="width: 100%; padding: 12px; border: 2px solid #667eea; border-radius: 8px; font-size: 1em; margin-bottom: 15px;">
                    ${workbook.SheetNames.map((name, idx) => 
                        `<option value="${idx}">${name}</option>`
                    ).join('')}
                </select>
                <button id="loadSheetBtn" class="btn btn-primary" style="width: 100%;">
                    ✅ Cargar Hoja Seleccionada
                </button>
            </div>
        `;
        
        const container = document.getElementById('headerOption');
        container.insertAdjacentHTML('beforebegin', `<div id="sheetSelectorDiv">${html}</div>`);
        
        document.getElementById('loadSheetBtn').onclick = () => {
            const idx = document.getElementById('sheetSelector').value;
            const sheetName = workbook.SheetNames[idx];
            const result = processSheet(workbook, sheetName);
            
            state.excelColumns = result.columns;
            state.excelData = result.data;
            
            document.getElementById('sheetSelectorDiv').remove();
            document.getElementById('headerOption').style.display = 'block';
            document.getElementById('headerOption').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        };
    }

    function processSheet(workbook, sheetName) {
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        if (rawData.length === 0) {
            throw new Error('La hoja está vacía');
        }
        
        // Asumir que tiene header por defecto
        const columns = rawData[0].map(h => String(h).trim());
        const dataRows = rawData.slice(1);
        
        const data = dataRows.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx] !== undefined ? String(row[idx]).trim() : '';
            });
            return obj;
        });
        
        return { columns, data };
    }

    // ============================================
    // OPCIONES DE HEADER
    // ============================================
    function setupHeaderOptions() {
        document.getElementById('processFileBtn').onclick = () => {
            const hasHeader = document.getElementById('hasHeaderRow').value === 'true';
            
            if (!hasHeader) {
                // Regenerar columnas como A, B, C...
                const numCols = state.excelData[0] ? Object.keys(state.excelData[0]).length : 0;
                state.excelColumns = Array.from({ length: numCols }, (_, i) => {
                    let col = '';
                    let n = i;
                    while (n >= 0) {
                        col = String.fromCharCode(65 + (n % 26)) + col;
                        n = Math.floor(n / 26) - 1;
                    }
                    return `Columna ${col}`;
                });
            }
            
            setupMapping();
        };

        // Header option cards
        document.getElementById('optionWithHeader').onclick = function() {
            document.getElementById('hasHeaderRow').value = 'true';
            this.style.background = '#f8f9ff';
            this.style.borderColor = '#667eea';
            this.querySelector('h4').style.color = '#667eea';
            
            document.getElementById('optionWithoutHeader').style.background = 'white';
            document.getElementById('optionWithoutHeader').style.borderColor = '#e0e0e0';
            document.getElementById('optionWithoutHeader').querySelector('h4').style.color = '#666';
        };

        document.getElementById('optionWithoutHeader').onclick = function() {
            document.getElementById('hasHeaderRow').value = 'false';
            this.style.background = '#fff8e1';
            this.style.borderColor = '#ffc107';
            this.querySelector('h4').style.color = '#f57c00';
            
            document.getElementById('optionWithHeader').style.background = 'white';
            document.getElementById('optionWithHeader').style.borderColor = '#e0e0e0';
            document.getElementById('optionWithHeader').querySelector('h4').style.color = '#666';
        };
    }

    // ============================================
    // MAPEO DE COLUMNAS
    // ============================================
    function setupMapping() {
        const template = getTemplate();
        
        // Auto-mapeo
        state.mapping = {};
        let autoMappedCount = 0;
        
        template.columns.forEach(reqCol => {
            const match = state.excelColumns.find(excelCol => 
                excelCol.toLowerCase().includes(reqCol.toLowerCase()) ||
                reqCol.toLowerCase().includes(excelCol.toLowerCase())
            );
            
            if (match) {
                state.mapping[reqCol] = match;
                autoMappedCount++;
            } else {
                state.mapping[reqCol] = '';
            }
        });

        // Mostrar sección de mapeo
        document.getElementById('mappingSection').style.display = 'block';
        
        // Actualizar UI
        renderMappingTable();
        
        // Setup apply button
        document.getElementById('applyMappingBtn').onclick = () => {
            updateMapping();
            generatePreview();
        };

        // Scroll
        document.getElementById('mappingSection').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    function renderMappingTable() {
        const template = getTemplate();
        const tbody = document.querySelector('#mappingTable tbody');
        tbody.innerHTML = '';

        template.columns.forEach(reqCol => {
            const tr = document.createElement('tr');
            
            // Columna requerida
            const tdReq = document.createElement('td');
            tdReq.textContent = reqCol;
            tdReq.style.fontWeight = '600';
            tr.appendChild(tdReq);
            
            // Dropdown de mapeo
            const tdMap = document.createElement('td');
            const select = document.createElement('select');
            select.className = 'mapping-select';
            select.dataset.column = reqCol;
            
            const optionEmpty = document.createElement('option');
            optionEmpty.value = '';
            optionEmpty.textContent = '-- Seleccionar --';
            select.appendChild(optionEmpty);
            
            state.excelColumns.forEach(excelCol => {
                const option = document.createElement('option');
                option.value = excelCol;
                option.textContent = excelCol;
                if (state.mapping[reqCol] === excelCol) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            tdMap.appendChild(select);
            tr.appendChild(tdMap);
            
            // Botón dividir
            const tdAction = document.createElement('td');
            const btnDiv = document.createElement('button');
            btnDiv.textContent = '🔀 Dividir';
            btnDiv.className = 'btn btn-secondary';
            btnDiv.style.padding = '5px 10px';
            btnDiv.style.fontSize = '0.9em';
            btnDiv.onclick = () => openDivisionModal(reqCol);
            tdAction.appendChild(btnDiv);
            tr.appendChild(tdAction);
            
            tbody.appendChild(tr);
        });

        // Mostrar estado
        updateMappingStatus();
    }

    function updateMapping() {
        document.querySelectorAll('.mapping-select').forEach(select => {
            const reqCol = select.dataset.column;
            state.mapping[reqCol] = select.value;
        });
        
        updateMappingStatus();
    }

    function updateMappingStatus() {
        const template = getTemplate();
        const mapped = template.columns.filter(col => state.mapping[col]).length;
        const withDefault = template.columns.filter(col => !state.mapping[col] && template.defaults[col] !== undefined).length;
        const unmapped = template.columns.filter(col => !state.mapping[col] && template.defaults[col] === undefined).length;
        
        const statusDiv = document.getElementById('mappingStatus');
        statusDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="font-size: 1.5em;">📊</span>
                    <strong>Estado del mapeo:</strong>
                </div>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <span style="color: #28a745;">✅ Mapeadas: ${mapped}/${template.columns.length}</span>
                    <span style="color: #ffc107;">🔧 Con valor por defecto: ${withDefault}</span>
                    <span style="color: #dc3545;">⚠️ Sin mapear: ${unmapped} (quedarán vacías)</span>
                </div>
            </div>
        `;
    }

    // ============================================
    // DIVISIÓN DE COLUMNAS
    // ============================================
    let divisionState = {
        currentColumn: null,
        sourceColumn: null,
        sourceData: [],
        separator: '',
        columnNames: []
    };

    function openDivisionModal(columnName) {
        divisionState.currentColumn = columnName;
        divisionState.sourceColumn = state.mapping[columnName];
        
        if (!divisionState.sourceColumn) {
            alert('⚠️ Primero mapea esta columna a una columna de tu archivo');
            return;
        }
        
        // Obtener datos
        divisionState.sourceData = state.excelData.map(row => row[divisionState.sourceColumn] || '');
        
        // Mostrar modal
        document.getElementById('divisionModal').style.display = 'flex';
        document.getElementById('divisionModalTitle').textContent = `🔀 Dividir: ${divisionState.sourceColumn}`;
        
        // Mostrar datos originales
        const previewHTML = divisionState.sourceData.slice(0, 5).map((val, idx) => 
            `<div style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
                <strong>Fila ${idx + 1}:</strong> "${val}"
            </div>`
        ).join('');
        
        document.getElementById('divisionOriginalData').innerHTML = previewHTML;
        
        // Limpiar
        document.getElementById('divisionSeparatorInput').value = '';
        document.getElementById('divisionPreview').innerHTML = '<span style="color: #999;">Ingresa un separador para ver el preview...</span>';
        document.getElementById('divisionNaming').style.display = 'none';
    }

    function closeDivisionModal() {
        document.getElementById('divisionModal').style.display = 'none';
    }

    function setDivisionSeparator(sep) {
        document.getElementById('divisionSeparatorInput').value = sep;
        updateDivisionPreview();
    }

    function updateDivisionPreview() {
        const separator = document.getElementById('divisionSeparatorInput').value;
        
        if (!separator) {
            document.getElementById('divisionPreview').innerHTML = '<span style="color: #999;">Ingresa un separador...</span>';
            document.getElementById('divisionNaming').style.display = 'none';
            document.getElementById('divisionApplyBtn').disabled = true;
            return;
        }
        
        divisionState.separator = separator;
        
        // Preview
        const previewData = divisionState.sourceData.slice(0, 5).map((val, rowIdx) => {
            const parts = String(val).split(separator);
            return `
                <div style="padding: 10px; border: 1px solid #28a745; border-radius: 5px; margin-bottom: 10px; background: white;">
                    <strong>Fila ${rowIdx + 1}:</strong> "${val}"
                    <div style="margin-top: 5px; padding-left: 20px;">
                        ${parts.map((part, idx) => `
                            <div style="color: #667eea;">
                                → Parte ${idx + 1}: "<strong>${part}</strong>"
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('divisionPreview').innerHTML = previewData;
        
        // Detectar número de partes
        const maxParts = Math.max(...divisionState.sourceData.map(val => String(val).split(separator).length));
        
        // Mostrar inputs de nombres
        showDivisionNaming(maxParts);
        
        document.getElementById('divisionApplyBtn').disabled = false;
        document.getElementById('divisionApplyBtn').style.opacity = '1';
    }

    function showDivisionNaming(numParts) {
        const html = Array.from({ length: numParts }, (_, i) => `
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                    Nombre para Parte ${i + 1}:
                </label>
                <input 
                    type="text" 
                    class="division-part-name" 
                    data-index="${i}"
                    placeholder="Ej: apellidos, nombre, etc."
                    style="width: 100%; padding: 10px; border: 2px solid #667eea; border-radius: 5px;">
            </div>
        `).join('');
        
        document.getElementById('divisionNamingInputs').innerHTML = html;
        document.getElementById('divisionNaming').style.display = 'block';
    }

    function applyDivision() {
        // Obtener nombres
        const names = Array.from(document.querySelectorAll('.division-part-name')).map(input => {
            return input.value.trim() || `parte${input.dataset.index}`;
        });
        
        divisionState.columnNames = names;
        
        // Crear nuevas columnas
        const newColumns = names.map(name => `${divisionState.sourceColumn}_${name}`);
        
        // Procesar datos
        state.excelData.forEach(row => {
            const value = row[divisionState.sourceColumn] || '';
            const parts = String(value).split(divisionState.separator);
            
            names.forEach((name, idx) => {
                const newColName = `${divisionState.sourceColumn}_${name}`;
                row[newColName] = parts[idx] || '';
            });
        });
        
        // Agregar a columnas disponibles
        newColumns.forEach(col => {
            if (!state.excelColumns.includes(col)) {
                state.excelColumns.push(col);
            }
        });
        
        // Auto-mapear si coincide
        newColumns.forEach((newCol, idx) => {
            const partName = names[idx];
            const matchingRequired = Object.keys(state.mapping).find(req => 
                req.toLowerCase().includes(partName.toLowerCase()) ||
                partName.toLowerCase().includes(req.toLowerCase())
            );
            
            if (matchingRequired) {
                state.mapping[matchingRequired] = newCol;
            }
        });
        
        // Refrescar tabla
        renderMappingTable();
        
        // Cerrar modal
        closeDivisionModal();
        
        alert(`✅ División exitosa!\n\nColumnas creadas:\n${newColumns.join('\n')}`);
    }

    // Eventos del modal
    window.closeDivisionModal = closeDivisionModal;
    window.setDivisionSeparator = setDivisionSeparator;
    window.updateDivisionPreview = updateDivisionPreview;
    window.applyDivision = applyDivision;

    // ============================================
    // PREVIEW Y GENERACIÓN
    // ============================================
    function generatePreview() {
        const template = getTemplate();
        
        // Generar CSV data
        const csvData = state.excelData.map(row => {
            const csvRow = {};
            template.columns.forEach(col => {
                if (state.mapping[col]) {
                    csvRow[col] = row[state.mapping[col]] || '';
                } else if (template.defaults[col] !== undefined) {
                    csvRow[col] = template.defaults[col];
                } else {
                    csvRow[col] = '';
                }
            });
            return csvRow;
        });
        
        // Mostrar preview
        document.getElementById('previewSection').style.display = 'block';
        
        const previewHTML = `
            <div style="overflow-x: auto;">
                <table class="preview-table">
                    <thead>
                        <tr>
                            ${template.columns.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${csvData.slice(0, 10).map(row => `
                            <tr>
                                ${template.columns.map(col => `<td>${row[col]}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${csvData.length > 10 ? `<p style="margin-top: 10px; color: #666;">Mostrando 10 de ${csvData.length} filas</p>` : ''}
        `;
        
        document.getElementById('previewTable').innerHTML = previewHTML;
        
        // Guardar para descarga
        window.generatedCSVData = csvData;
        
        // Scroll
        document.getElementById('previewSection').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    // ============================================
    // DESCARGA Y RESET
    // ============================================
    function setupDownload() {
        document.getElementById('downloadBtn').onclick = () => {
            if (!window.generatedCSVData) {
                alert('⚠️ Primero genera el preview');
                return;
            }
            
            const template = getTemplate();
            const csvContent = [
                template.columns.join(','),
                ...window.generatedCSVData.map(row => 
                    template.columns.map(col => `"${row[col]}"`).join(',')
                )
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${state.selectedProduct}_${state.selectedCommand}_${Date.now()}.csv`;
            link.click();
        };
    }

    function setupReset() {
        document.getElementById('resetBtn').onclick = () => {
            if (confirm('¿Seguro que quieres reiniciar? Se perderán todos los datos.')) {
                location.reload();
            }
        };
    }

})();
// ============================================
// CSV Generator v5.0.0
// Multi-format + Range config + Transformations
// + Audit Report (KeyController XML → XLSX)
// ============================================

(function() {
    'use strict';

    // ============================================
    // UTILIDADES
    // ============================================
    function sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

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
        customDefaults: {},      // v4.5.1: valores por defecto del usuario
        transformations: {},     // v4.5.1: transformaciones aplicadas por columna
        hasHeaderRow: true,
        // v5.0.0: Audit Report state
        auditRawEntries: [],     // all parsed entries from XML
        auditProcessedData: [],  // entries after filtering + transformation
        auditXmlFileName: ''     // original XML filename for output naming
    };

    // ============================================
    // TEMPLATES (IvSign + IvNeos)
    // ============================================
    const templates = {
        ivsign: {
            'users-add': {
                columns: ['userid', 'email', 'nombre', 'apellidos', 'dni', 'telefono', 'rol', 'password'],
                defaults: {}
            },
            'users-modify': {
                columns: ['userid', 'email', 'nombre', 'apellidos', 'dni', 'telefono', 'rol'],
                defaults: {}
            },
            'users-delete': {
                columns: ['userid'],
                defaults: {}
            },
            'certs-add': {
                columns: ['userid', 'certType', 'p12File', 'p12Pass'],
                defaults: {}
            },
            'certs-modify': {
                columns: ['userid', 'certType', 'p12File', 'p12Pass'],
                defaults: {}
            },
            'certs-delegate': {
                columns: ['userid', 'certType', 'certSerial', 'certOwner'],
                defaults: {}
            },
            'delegs-add': {
                columns: ['userid', 'delegType', 'delegUser', 'delegStart', 'delegEnd'],
                defaults: {}
            },
            'delegs-modify': {
                columns: ['userid', 'delegType', 'delegUser', 'delegStart', 'delegEnd'],
                defaults: {}
            },
            'delegs-delete': {
                columns: ['userid', 'delegUser'],
                defaults: {}
            },
            'rules-add': {
                columns: ['userid', 'ruleType', 'ruleValue'],
                defaults: {}
            },
            'rules-modify': {
                columns: ['userid', 'ruleType', 'ruleValue'],
                defaults: {}
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
                defaults: {}
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
        setupAuditReport();  // v5.0.0
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
        const selectedCard = document.querySelector(`[data-product="${product}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        // v5.0.0: Audit Report has its own flow
        if (product === 'audit') {
            // Hide CSV flow sections
            document.getElementById('commandSelection').style.display = 'none';
            // Hide all step elements that are for CSV flow (steps 2+)
            const steps = document.querySelectorAll('.content > .step');
            steps.forEach((step, idx) => {
                if (idx >= 1 && step.id !== 'auditUploadSection' && step.id !== 'auditFiltersSection' && step.id !== 'auditPreviewSection') {
                    step.style.display = 'none';
                }
            });
            document.getElementById('previewSection').style.display = 'none';
            document.getElementById('mappingSection').style.display = 'none';

            // Show audit upload
            document.getElementById('auditUploadSection').style.display = 'block';
            document.getElementById('auditUploadSection').scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            return;
        }

        // Hide audit sections when switching to CSV products
        document.getElementById('auditUploadSection').style.display = 'none';
        document.getElementById('auditFiltersSection').style.display = 'none';
        document.getElementById('auditStatsSection').style.display = 'none';
        document.getElementById('auditPreviewSection').style.display = 'none';

        // Show command selection
        const commandSelection = document.getElementById('commandSelection');
        if (!commandSelection) {
            console.error('❌ ERROR: commandSelection element not found in HTML');
            alert('Error: Falta el elemento commandSelection en el HTML. Verifica que hayas actualizado index.html correctamente.');
            return;
        }
        commandSelection.style.display = 'block';

        // Re-show CSV flow steps
        const steps = document.querySelectorAll('.content > .step');
        steps.forEach((step, idx) => {
            if (idx >= 1 && step.id !== 'auditUploadSection' && step.id !== 'auditFiltersSection' && step.id !== 'auditPreviewSection') {
                step.style.display = '';
            }
        });

        // Generate command buttons dynamically
        const commandGrid = document.getElementById('commandGrid');
        if (!commandGrid) {
            console.error('❌ ERROR: commandGrid element not found in HTML');
            alert('Error: Falta el elemento commandGrid en el HTML. Verifica que hayas actualizado index.html correctamente.');
            return;
        }
        commandGrid.innerHTML = '';

        const productTemplates = templates[product];
        if (!productTemplates) {
            console.error('❌ ERROR: No templates found for product:', product);
            return;
        }

        Object.keys(productTemplates).forEach(cmdKey => {
            const btn = document.createElement('button');
            btn.className = 'command-item';
            btn.dataset.command = cmdKey;
            btn.textContent = cmdKey;
            btn.onclick = () => selectCommand(cmdKey);
            commandGrid.appendChild(btn);
        });

        // Scroll
        commandSelection.scrollIntoView({
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
        const selectedItem = document.querySelector(`[data-command="${command}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Show columns info
        const template = getTemplate();
        const columnsInfo = document.getElementById('columnsInfo');
        const requiredColumns = document.getElementById('requiredColumns');
        
        if (columnsInfo && requiredColumns) {
            columnsInfo.style.display = 'block';
            requiredColumns.textContent = template.columns.join(', ');
        }
        
        // Show next step (create/load file)
        const steps = document.querySelectorAll('.step');
        if (steps.length >= 3) {
            steps[2].scrollIntoView({
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
        document.getElementById('csvOptions').style.display = 'none';
        document.getElementById('xmlOptions').style.display = 'none';

        if (format === 'csv') {
            document.getElementById('csvOptions').style.display = 'block';
        } else if (format === 'xml') {
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

        // Show upload area
        document.getElementById('uploadArea').style.display = 'block';
    }

    // ============================================
    // CARGA DE ARCHIVOS (MULTI-FORMATO)
    // ============================================
    function setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // Evitar que el click del fileInput burbujee al uploadArea
        // (sino fileInput.click() burbujea → uploadArea.onclick → fileInput.click() → loop)
        fileInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Click en el area abre el selector de archivo
        uploadArea.addEventListener('click', () => {
            fileInput.value = ''; // Reset para permitir re-subir el mismo archivo
            fileInput.click();
        });

        // Drag & drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileUpload(file);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileUpload(file);
            }
        });
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
            
            // v4.5.2: Si result es null, el flujo multi-hoja se encarga solo
            if (!result) return;

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

    // v4.5.3: Cargar XLSX - siempre muestra configurador de rango
    async function loadXLSXFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    state.currentWorkbook = workbook;

                    if (workbook.SheetNames.length > 1) {
                        // Multi-hoja: mostrar selector primero
                        showSheetSelector(workbook);
                    } else {
                        // Una sola hoja: ir directo al configurador de rango
                        showRangeConfigurator(workbook, [0]);
                    }
                    resolve(null); // El flujo continúa desde el configurador de rango
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    // v4.5.2: Selector multi-hoja con checkboxes
    function showSheetSelector(workbook) {
        // Limpiar selector previo si existe
        const prev = document.getElementById('sheetSelectorDiv');
        if (prev) prev.remove();

        const html = `
            <div style="margin: 20px 0; padding: 20px; background: #f8f9ff; border: 2px solid #667eea; border-radius: 10px;">
                <h4 style="color: #667eea; margin-bottom: 15px;">
                    📑 Este archivo tiene ${workbook.SheetNames.length} hojas
                </h4>
                <p style="margin-bottom: 10px; color: #666;">
                    Selecciona una o varias hojas. Si seleccionas varias, las columnas se combinan con prefijo de hoja.
                </p>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
                    ${workbook.SheetNames.map((name, idx) => {
                        const sheet = workbook.Sheets[name];
                        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                        const rowCount = raw.length > 0 ? raw.length - 1 : 0;
                        const colCount = raw.length > 0 ? raw[0].length : 0;
                        return `<label style="display:flex;align-items:center;gap:10px;padding:12px;border:2px solid #e0e0e0;border-radius:8px;cursor:pointer;transition:all 0.3s;" class="sheet-checkbox-label">
                            <input type="checkbox" class="sheet-checkbox" value="${idx}" style="width:18px;height:18px;">
                            <div>
                                <strong>${sanitizeHTML(name)}</strong>
                                <span style="color:#666;font-size:0.85em;margin-left:8px;">${colCount} columnas, ${rowCount} filas</span>
                            </div>
                        </label>`;
                    }).join('')}
                </div>
                <button id="loadSheetsBtn" class="btn btn-primary" style="width: 100%;" disabled>
                    ✅ Cargar Hojas Seleccionadas
                </button>
            </div>
        `;

        const container = document.getElementById('headerOption');
        container.insertAdjacentHTML('beforebegin', `<div id="sheetSelectorDiv">${html}</div>`);

        // Habilitar botón cuando hay al menos un checkbox marcado
        document.querySelectorAll('.sheet-checkbox').forEach(cb => {
            cb.onchange = () => {
                const checked = document.querySelectorAll('.sheet-checkbox:checked').length;
                document.getElementById('loadSheetsBtn').disabled = checked === 0;

                // Highlight labels
                document.querySelectorAll('.sheet-checkbox-label').forEach(label => {
                    const isChecked = label.querySelector('input').checked;
                    label.style.borderColor = isChecked ? '#667eea' : '#e0e0e0';
                    label.style.background = isChecked ? '#f0f2ff' : 'white';
                });
            };
        });

        document.getElementById('loadSheetsBtn').onclick = () => {
            console.log('🟢 loadSheetsBtn clicked');
            const selectedIndexes = Array.from(document.querySelectorAll('.sheet-checkbox:checked')).map(cb => parseInt(cb.value));
            console.log('🟢 selectedIndexes:', selectedIndexes);

            if (selectedIndexes.length === 0) return;

            // Guardar selección y mostrar configurador de rango
            document.getElementById('sheetSelectorDiv').remove();
            showRangeConfigurator(workbook, selectedIndexes);
        };

        // Mostrar y hacer scroll al selector
        document.getElementById('sheetSelectorDiv').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    // v4.5.3: Configurador de rango - muestra preview crudo y deja elegir header y rango
    function showRangeConfigurator(workbook, selectedIndexes) {
        // Limpiar previo
        const prev = document.getElementById('rangeConfigDiv');
        if (prev) prev.remove();

        // Obtener raw data de la primera hoja seleccionada para preview
        const firstSheetName = workbook.SheetNames[selectedIndexes[0]];
        const firstSheet = workbook.Sheets[firstSheetName];
        const rawPreview = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

        // Auto-detectar: buscar la primera fila donde la mayoría de celdas tienen contenido
        let autoHeaderRow = 0;
        for (let i = 0; i < Math.min(rawPreview.length, 30); i++) {
            const filledCells = rawPreview[i].filter(cell => String(cell).trim() !== '').length;
            if (filledCells >= 2) {
                autoHeaderRow = i;
                break;
            }
        }

        // Generar tabla preview (primeras 25 filas)
        const previewRows = rawPreview.slice(0, 25);
        const maxCols = Math.max(...previewRows.map(r => r.length), 1);

        const tableHTML = previewRows.map((row, idx) => {
            const isHeader = idx === autoHeaderRow;
            const rowStyle = isHeader
                ? 'background:#667eea;color:white;font-weight:bold;'
                : (idx % 2 === 0 ? 'background:#f8f9ff;' : 'background:white;');
            const cells = Array.from({ length: maxCols }, (_, c) => {
                const val = row[c] !== undefined ? String(row[c]).trim() : '';
                return `<td style="padding:4px 8px;border:1px solid #e0e0e0;font-size:0.85em;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${sanitizeHTML(val) || '<span style="color:#ccc;">-</span>'}</td>`;
            }).join('');
            return `<tr style="${rowStyle}" data-row-idx="${idx}">
                <td style="padding:4px 8px;border:1px solid #e0e0e0;font-weight:bold;color:#667eea;text-align:center;min-width:40px;cursor:pointer;" class="row-number-cell" title="Click para marcar como encabezado">${idx + 1}</td>
                ${cells}
            </tr>`;
        }).join('');

        const html = `
            <div style="margin: 20px 0; padding: 20px; background: #f8f9ff; border: 2px solid #667eea; border-radius: 10px;">
                <h4 style="color: #667eea; margin-bottom: 10px;">
                    📋 Configurar rango de datos ${selectedIndexes.length > 1 ? '(preview de: ' + sanitizeHTML(firstSheetName) + ')' : ''}
                </h4>
                <p style="margin-bottom: 15px; color: #666;">
                    Hacé click en el número de fila para marcarla como <strong>encabezado</strong>. Los datos se tomarán desde la fila siguiente.
                </p>

                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:15px;">
                    <div>
                        <label style="display:block;margin-bottom:5px;font-weight:600;font-size:0.9em;">Fila de encabezados:</label>
                        <input type="number" id="headerRowInput" value="${autoHeaderRow + 1}" min="1" max="${rawPreview.length}"
                            style="width:100%;padding:10px;border:2px solid #667eea;border-radius:8px;font-size:1em;text-align:center;">
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:5px;font-weight:600;font-size:0.9em;">Datos desde fila:</label>
                        <input type="number" id="dataStartInput" value="${autoHeaderRow + 2}" min="1" max="${rawPreview.length}"
                            style="width:100%;padding:10px;border:2px solid #667eea;border-radius:8px;font-size:1em;text-align:center;">
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:5px;font-weight:600;font-size:0.9em;">Datos hasta fila: <span style="color:#999;">(vacío = todas)</span></label>
                        <input type="number" id="dataEndInput" value="" min="1" max="${rawPreview.length}" placeholder="Última"
                            style="width:100%;padding:10px;border:2px solid #667eea;border-radius:8px;font-size:1em;text-align:center;">
                    </div>
                </div>

                <div style="overflow-x:auto;max-height:400px;overflow-y:auto;border:2px solid #e0e0e0;border-radius:8px;margin-bottom:15px;">
                    <table style="border-collapse:collapse;width:100%;">
                        <tbody id="rangePreviewBody">
                            ${tableHTML}
                        </tbody>
                    </table>
                </div>
                ${rawPreview.length > 25 ? `<p style="color:#666;font-size:0.85em;margin-bottom:10px;">Mostrando 25 de ${rawPreview.length} filas</p>` : ''}

                <button id="applyRangeBtn" class="btn btn-primary" style="width: 100%;">
                    ✅ Aplicar y Continuar al Mapeo
                </button>
            </div>
        `;

        const container = document.getElementById('headerOption');
        container.insertAdjacentHTML('beforebegin', `<div id="rangeConfigDiv">${html}</div>`);

        // Click en número de fila = marcar como header
        document.querySelectorAll('.row-number-cell').forEach(cell => {
            cell.onclick = () => {
                const rowIdx = parseInt(cell.parentElement.dataset.rowIdx);
                document.getElementById('headerRowInput').value = rowIdx + 1;
                document.getElementById('dataStartInput').value = rowIdx + 2;
                highlightHeaderRow(rowIdx);
            };
        });

        // Cambio manual del input de header
        document.getElementById('headerRowInput').oninput = () => {
            const val = parseInt(document.getElementById('headerRowInput').value);
            if (val >= 1) {
                document.getElementById('dataStartInput').value = val + 1;
                highlightHeaderRow(val - 1);
            }
        };

        function highlightHeaderRow(rowIdx) {
            document.querySelectorAll('#rangePreviewBody tr').forEach(tr => {
                const idx = parseInt(tr.dataset.rowIdx);
                if (idx === rowIdx) {
                    tr.style.background = '#667eea';
                    tr.style.color = 'white';
                    tr.style.fontWeight = 'bold';
                } else {
                    tr.style.background = idx % 2 === 0 ? '#f8f9ff' : 'white';
                    tr.style.color = '';
                    tr.style.fontWeight = '';
                }
            });
        }

        // Botón aplicar
        document.getElementById('applyRangeBtn').onclick = () => {
            const headerRow = parseInt(document.getElementById('headerRowInput').value) - 1;
            const dataStart = parseInt(document.getElementById('dataStartInput').value) - 1;
            const dataEndVal = document.getElementById('dataEndInput').value;
            const dataEnd = dataEndVal ? parseInt(dataEndVal) : null; // null = hasta el final

            console.log('🟢 Range config: headerRow=', headerRow, 'dataStart=', dataStart, 'dataEnd=', dataEnd);

            const rangeConfig = { headerRow, dataStart, dataEnd };

            try {
                if (selectedIndexes.length === 1) {
                    const sheetName = workbook.SheetNames[selectedIndexes[0]];
                    const result = processSheet(workbook, sheetName, rangeConfig);
                    console.log('🟢 Sheet result - columns:', result.columns, 'rows:', result.data.length);
                    state.excelColumns = result.columns;
                    state.excelData = result.data;
                } else {
                    const merged = mergeSheets(workbook, selectedIndexes, rangeConfig);
                    console.log('🟢 Merged result - columns:', merged.columns, 'rows:', merged.data.length);
                    state.excelColumns = merged.columns;
                    state.excelData = merged.data;
                }

                document.getElementById('rangeConfigDiv').remove();
                console.log('🟢 Calling setupMapping...');
                setupMapping();
                console.log('🟢 setupMapping completed');
            } catch (err) {
                console.error('🔴 Error processing sheets:', err);
                alert('Error al procesar: ' + err.message);
            }
        };

        document.getElementById('rangeConfigDiv').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // v4.5.3: Mergear columnas de múltiples hojas
    function mergeSheets(workbook, sheetIndexes, rangeConfig) {
        const sheetsData = sheetIndexes.map(idx => {
            const name = workbook.SheetNames[idx];
            const result = processSheet(workbook, name, rangeConfig);
            return { name, ...result };
        });

        const allColumns = [];
        sheetsData.forEach(sheet => {
            sheet.columns.forEach(col => {
                const prefixed = `[${sheet.name}] ${col}`;
                allColumns.push(prefixed);
            });
        });

        const maxRows = Math.max(...sheetsData.map(s => s.data.length));
        const mergedData = [];
        for (let i = 0; i < maxRows; i++) {
            const row = {};
            sheetsData.forEach(sheet => {
                const sourceRow = sheet.data[i] || {};
                sheet.columns.forEach(col => {
                    const prefixed = `[${sheet.name}] ${col}`;
                    row[prefixed] = sourceRow[col] || '';
                });
            });
            mergedData.push(row);
        }

        return { columns: allColumns, data: mergedData };
    }

    // v4.5.3: processSheet con rango configurable
    function processSheet(workbook, sheetName, rangeConfig) {
        console.log('🟡 processSheet called for:', sheetName, 'rangeConfig:', rangeConfig);
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        console.log('🟡 rawData rows:', rawData.length);

        if (rawData.length === 0) {
            throw new Error('La hoja "' + sheetName + '" está vacía');
        }

        let headerRow, dataStart, dataEnd;

        if (rangeConfig) {
            headerRow = rangeConfig.headerRow;
            dataStart = rangeConfig.dataStart;
            dataEnd = rangeConfig.dataEnd || rawData.length;
        } else {
            // Auto-detect: primera fila con al menos 2 celdas con contenido
            headerRow = 0;
            for (let i = 0; i < Math.min(rawData.length, 30); i++) {
                const filled = rawData[i].filter(cell => String(cell).trim() !== '').length;
                if (filled >= 2) {
                    headerRow = i;
                    break;
                }
            }
            dataStart = headerRow + 1;
            dataEnd = rawData.length;
        }

        console.log('🟡 Using headerRow:', headerRow, 'dataStart:', dataStart, 'dataEnd:', dataEnd);

        // Extraer columnas del header row
        const columns = rawData[headerRow].map(h => {
            const val = String(h).trim();
            return val || null;
        });

        // Filtrar columnas vacías y generar nombres para las que no tienen
        const finalColumns = columns.map((col, idx) => {
            if (col) return col;
            let letter = '';
            let n = idx;
            while (n >= 0) {
                letter = String.fromCharCode(65 + (n % 26)) + letter;
                n = Math.floor(n / 26) - 1;
            }
            return `Columna ${letter}`;
        });

        console.log('🟡 final columns:', finalColumns);

        // Extraer datos del rango
        const dataRows = rawData.slice(dataStart, dataEnd);
        const data = dataRows.map(row => {
            const obj = {};
            finalColumns.forEach((col, idx) => {
                obj[col] = row[idx] !== undefined ? String(row[idx]).trim() : '';
            });
            return obj;
        });

        console.log('🟡 Processed', data.length, 'data rows');
        return { columns: finalColumns, data };
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
        console.log('🔵 setupMapping called');
        console.log('🔵 state.excelColumns:', state.excelColumns);
        console.log('🔵 state.excelData length:', state.excelData.length);
        const template = getTemplate();
        console.log('🔵 template columns:', template.columns);

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
        
        // Setup manual mapping toggle button
        document.getElementById('manualMappingBtn').onclick = () => {
            const details = document.getElementById('mappingDetails');
            if (details.style.display === 'none') {
                details.style.display = 'block';
            } else {
                details.style.display = 'none';
            }
        };

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

            // Botón transformar (reemplaza "Dividir")
            const tdAction = document.createElement('td');
            const btnTransform = document.createElement('button');
            btnTransform.textContent = '🔧 Transformar';
            btnTransform.className = 'btn btn-secondary';
            btnTransform.style.padding = '5px 10px';
            btnTransform.style.fontSize = '0.9em';
            btnTransform.onclick = () => openTransformModal(reqCol);
            tdAction.appendChild(btnTransform);

            // Mostrar badge de transformaciones aplicadas
            if (state.transformations[reqCol] && state.transformations[reqCol].length > 0) {
                const badge = document.createElement('span');
                badge.style.cssText = 'display:inline-block;margin-left:8px;background:#28a745;color:white;padding:2px 8px;border-radius:10px;font-size:0.8em;';
                badge.textContent = state.transformations[reqCol].length + ' aplicada(s)';
                tdAction.appendChild(badge);
            }

            tr.appendChild(tdAction);

            // Valor por defecto (editable)
            const tdDefault = document.createElement('td');
            const defaultInput = document.createElement('input');
            defaultInput.type = 'text';
            defaultInput.className = 'default-value-input';
            defaultInput.dataset.column = reqCol;
            defaultInput.placeholder = '';
            defaultInput.value = state.customDefaults[reqCol] || '';
            defaultInput.style.cssText = 'width:100%;padding:8px;border:1px solid #e0e0e0;border-radius:5px;font-size:0.9em;';

            defaultInput.oninput = function() {
                state.customDefaults[reqCol] = this.value;
            };

            tdDefault.appendChild(defaultInput);
            tr.appendChild(tdDefault);

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

        // v4.5.1: Recoger valores por defecto del usuario
        document.querySelectorAll('.default-value-input').forEach(input => {
            const reqCol = input.dataset.column;
            state.customDefaults[reqCol] = input.value.trim();
        });

        updateMappingStatus();
    }

    function updateMappingStatus() {
        const template = getTemplate();
        const mapped = template.columns.filter(col => state.mapping[col]).length;
        const withDefault = template.columns.filter(col =>
            !state.mapping[col] && (state.customDefaults[col] || template.defaults[col] !== undefined)
        ).length;
        const unmapped = template.columns.filter(col =>
            !state.mapping[col] && !state.customDefaults[col] && template.defaults[col] === undefined
        ).length;
        const withTransform = template.columns.filter(col =>
            state.transformations[col] && state.transformations[col].length > 0
        ).length;

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
                    ${withTransform > 0 ? `<span style="color: #667eea;">🔄 Con transformaciones: ${withTransform}</span>` : ''}
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
        document.getElementById('divisionColumnName').textContent = divisionState.sourceColumn;

        // Mostrar datos originales
        const previewHTML = divisionState.sourceData.slice(0, 5).map((val, idx) =>
            `<div style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
                <strong>Fila ${idx + 1}:</strong> "${sanitizeHTML(val)}"
            </div>`
        ).join('');

        document.getElementById('originalData').innerHTML = previewHTML;

        // Limpiar
        document.getElementById('separatorInput').value = '';
        document.getElementById('livePreview').innerHTML = '<span style="color: #999;">Ingresa un separador para ver el preview...</span>';
        document.getElementById('namingSection').style.display = 'none';
    }

    function closeDivisionModal() {
        document.getElementById('divisionModal').style.display = 'none';
    }

    function setDivisionSeparator(sep) {
        document.getElementById('separatorInput').value = sep;
        updateDivisionPreview();
    }

    function updateDivisionPreview() {
        const separator = document.getElementById('separatorInput').value;

        if (!separator) {
            document.getElementById('livePreview').innerHTML = '<span style="color: #999;">Ingresa un separador...</span>';
            document.getElementById('namingSection').style.display = 'none';
            document.getElementById('applyBtn').disabled = true;
            return;
        }
        
        divisionState.separator = separator;
        
        // Preview
        const previewData = divisionState.sourceData.slice(0, 5).map((val, rowIdx) => {
            const parts = String(val).split(separator);
            return `
                <div style="padding: 10px; border: 1px solid #28a745; border-radius: 5px; margin-bottom: 10px; background: white;">
                    <strong>Fila ${rowIdx + 1}:</strong> "${sanitizeHTML(val)}"
                    <div style="margin-top: 5px; padding-left: 20px;">
                        ${parts.map((part, idx) => `
                            <div style="color: #667eea;">
                                → Parte ${idx + 1}: "<strong>${sanitizeHTML(part)}</strong>"
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('livePreview').innerHTML = previewData;

        // Detectar número de partes
        const maxParts = Math.max(...divisionState.sourceData.map(val => String(val).split(separator).length));

        // Mostrar inputs de nombres
        showDivisionNaming(maxParts);

        document.getElementById('applyBtn').disabled = false;
        document.getElementById('applyBtn').style.opacity = '1';
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
        
        document.getElementById('namingInputs').innerHTML = html;
        document.getElementById('namingSection').style.display = 'block';
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

    // Eventos del modal de división
    window.closeDivisionModal = closeDivisionModal;
    window.setDivisionSeparator = setDivisionSeparator;
    window.updateDivisionPreview = updateDivisionPreview;
    window.applyDivision = applyDivision;

    // ============================================
    // MODAL DE TRANSFORMACIONES v4.5.1
    // ============================================
    let transformState = {
        currentColumn: null,       // columna requerida
        sourceColumn: null,        // columna del archivo mapeada
        sourceData: [],            // datos originales
        selectedTransform: null,   // tipo de transformación seleccionada
        config: {}                 // configuración de la transformación
    };

    function openTransformModal(columnName) {
        transformState.currentColumn = columnName;
        transformState.sourceColumn = state.mapping[columnName];
        transformState.selectedTransform = null;
        transformState.config = {};

        if (!transformState.sourceColumn) {
            alert('⚠️ Primero mapea esta columna a una columna de tu archivo');
            return;
        }

        // Obtener datos
        transformState.sourceData = state.excelData.map(row => row[transformState.sourceColumn] || '');

        // Mostrar modal
        document.getElementById('transformModal').style.display = 'flex';
        document.getElementById('transformColumnName').textContent = transformState.sourceColumn;

        // Mostrar datos originales
        const previewHTML = transformState.sourceData.slice(0, 5).map((val, idx) =>
            `<div style="padding: 6px; border-bottom: 1px solid #e0e0e0;">
                <strong>Fila ${idx + 1}:</strong> "${sanitizeHTML(String(val))}"
            </div>`
        ).join('');
        document.getElementById('transformOriginalData').innerHTML = previewHTML;

        // Mostrar transformaciones aplicadas si hay
        renderAppliedTransforms();

        // Resetear áreas
        document.getElementById('transformConfigArea').style.display = 'none';
        document.getElementById('transformPreviewArea').style.display = 'none';
        document.getElementById('transformNamingSection').style.display = 'none';
        document.getElementById('applyTransformBtn').disabled = true;
        document.getElementById('applyTransformBtn').style.opacity = '0.5';

        // Deseleccionar botones
        document.querySelectorAll('.transform-option-btn').forEach(b => b.classList.remove('selected'));
    }

    function closeTransformModal() {
        document.getElementById('transformModal').style.display = 'none';
    }

    function renderAppliedTransforms() {
        const col = transformState.currentColumn;
        const transforms = state.transformations[col] || [];

        const listDiv = document.getElementById('appliedTransformsList');
        const contentDiv = document.getElementById('appliedTransformsContent');
        const clearBtn = document.getElementById('clearTransformsBtn');

        if (transforms.length === 0) {
            listDiv.style.display = 'none';
            clearBtn.style.display = 'none';
            return;
        }

        listDiv.style.display = 'block';
        clearBtn.style.display = 'inline-block';

        const labels = {
            uppercase: '🔠 MAYÚSCULAS',
            lowercase: '🔡 minúsculas',
            titlecase: '🔤 Título',
            trim: '🧹 Limpiar espacios',
            prefix: '➡️ Prefijo',
            suffix: '⬅️ Sufijo',
            replace: '🔄 Reemplazar',
            removeSpecial: '🚫 Quitar especiales',
            removeTildes: '🔤 Quitar tildes'
        };

        contentDiv.innerHTML = transforms.map((t, idx) => {
            let detail = '';
            if (t.type === 'prefix') detail = ` → "${sanitizeHTML(t.value)}"`;
            if (t.type === 'suffix') detail = ` → "${sanitizeHTML(t.value)}"`;
            if (t.type === 'replace') detail = ` → "${sanitizeHTML(t.find)}" → "${sanitizeHTML(t.replaceWith)}"`;
            return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #c8e6c9;">
                <span>${labels[t.type] || t.type}${detail}</span>
                <button onclick="removeTransform(${idx})" style="background:#dc3545;color:white;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:0.8em;">✖</button>
            </div>`;
        }).join('');
    }

    function removeTransform(idx) {
        const col = transformState.currentColumn;
        state.transformations[col].splice(idx, 1);
        renderAppliedTransforms();
        renderMappingTable();
    }

    function clearTransformations() {
        const col = transformState.currentColumn;
        state.transformations[col] = [];
        renderAppliedTransforms();
        renderMappingTable();
    }

    function selectTransform(type) {
        transformState.selectedTransform = type;

        // Marcar botón seleccionado
        document.querySelectorAll('.transform-option-btn').forEach(b => b.classList.remove('selected'));
        event.currentTarget.classList.add('selected');

        // Si es "divide", abrir el modal de división directamente
        if (type === 'divide') {
            closeTransformModal();
            openDivisionModal(transformState.currentColumn);
            return;
        }

        // Mostrar configuración según tipo
        const configArea = document.getElementById('transformConfigArea');
        const configTitle = document.getElementById('transformConfigTitle');
        const configContent = document.getElementById('transformConfigContent');
        configArea.style.display = 'block';

        switch (type) {
            case 'uppercase':
                configTitle.textContent = '🔠 Convertir a MAYÚSCULAS';
                configContent.innerHTML = '<p style="color:#666;">Se convertirá todo el texto a mayúsculas.</p>';
                enableTransformApply();
                showTransformPreview(type);
                break;

            case 'lowercase':
                configTitle.textContent = '🔡 Convertir a minúsculas';
                configContent.innerHTML = '<p style="color:#666;">Se convertirá todo el texto a minúsculas.</p>';
                enableTransformApply();
                showTransformPreview(type);
                break;

            case 'titlecase':
                configTitle.textContent = '🔤 Convertir a Título';
                configContent.innerHTML = '<p style="color:#666;">Primera letra de cada palabra en mayúscula.</p>';
                enableTransformApply();
                showTransformPreview(type);
                break;

            case 'trim':
                configTitle.textContent = '🧹 Limpiar espacios';
                configContent.innerHTML = '<p style="color:#666;">Se eliminarán espacios al inicio, al final y espacios dobles internos.</p>';
                enableTransformApply();
                showTransformPreview(type);
                break;

            case 'prefix':
                configTitle.textContent = '➡️ Agregar Prefijo';
                configContent.innerHTML = `
                    <input type="text" id="transformPrefixInput" placeholder="Texto a agregar al inicio..."
                        style="width:100%;padding:12px;border:2px solid #667eea;border-radius:8px;font-size:1.1em;font-family:monospace;"
                        oninput="onTransformConfigChange('prefix')">
                `;
                disableTransformApply();
                break;

            case 'suffix':
                configTitle.textContent = '⬅️ Agregar Sufijo';
                configContent.innerHTML = `
                    <input type="text" id="transformSuffixInput" placeholder="Texto a agregar al final..."
                        style="width:100%;padding:12px;border:2px solid #667eea;border-radius:8px;font-size:1.1em;font-family:monospace;"
                        oninput="onTransformConfigChange('suffix')">
                `;
                disableTransformApply();
                break;

            case 'replace':
                configTitle.textContent = '🔄 Buscar y Reemplazar';
                configContent.innerHTML = `
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <label style="display:block;margin-bottom:5px;font-weight:600;">Buscar:</label>
                            <input type="text" id="transformFindInput" placeholder="Texto a buscar..."
                                style="width:100%;padding:10px;border:2px solid #667eea;border-radius:8px;font-family:monospace;"
                                oninput="onTransformConfigChange('replace')">
                        </div>
                        <div>
                            <label style="display:block;margin-bottom:5px;font-weight:600;">Reemplazar con:</label>
                            <input type="text" id="transformReplaceInput" placeholder="Texto de reemplazo..."
                                style="width:100%;padding:10px;border:2px solid #667eea;border-radius:8px;font-family:monospace;"
                                oninput="onTransformConfigChange('replace')">
                        </div>
                    </div>
                `;
                disableTransformApply();
                break;

            case 'removeSpecial':
                configTitle.textContent = '🚫 Quitar caracteres especiales';
                configContent.innerHTML = '<p style="color:#666;">Se eliminarán todos los caracteres que no sean letras, números o espacios.</p>';
                enableTransformApply();
                showTransformPreview(type);
                break;

            case 'removeTildes':
                configTitle.textContent = '🔤 Quitar tildes';
                configContent.innerHTML = '<p style="color:#666;">Se reemplazarán todas las vocales acentuadas por sus equivalentes sin tilde (á→a, é→e, í→i, ó→o, ú→u, ñ se mantiene).</p>';
                enableTransformApply();
                showTransformPreview(type);
                break;
        }
    }

    function onTransformConfigChange(type) {
        switch (type) {
            case 'prefix': {
                const val = document.getElementById('transformPrefixInput').value;
                if (val) {
                    transformState.config = { value: val };
                    enableTransformApply();
                    showTransformPreview('prefix');
                } else {
                    disableTransformApply();
                    document.getElementById('transformPreviewArea').style.display = 'none';
                }
                break;
            }
            case 'suffix': {
                const val = document.getElementById('transformSuffixInput').value;
                if (val) {
                    transformState.config = { value: val };
                    enableTransformApply();
                    showTransformPreview('suffix');
                } else {
                    disableTransformApply();
                    document.getElementById('transformPreviewArea').style.display = 'none';
                }
                break;
            }
            case 'replace': {
                const find = document.getElementById('transformFindInput').value;
                const replaceWith = document.getElementById('transformReplaceInput').value;
                if (find) {
                    transformState.config = { find, replaceWith: replaceWith || '' };
                    enableTransformApply();
                    showTransformPreview('replace');
                } else {
                    disableTransformApply();
                    document.getElementById('transformPreviewArea').style.display = 'none';
                }
                break;
            }
        }
    }

    function applyTransformToValue(value, transform) {
        let v = String(value);
        switch (transform.type) {
            case 'uppercase':
                return v.toUpperCase();
            case 'lowercase':
                return v.toLowerCase();
            case 'titlecase':
                return v.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            case 'trim':
                return v.trim().replace(/\s+/g, ' ');
            case 'prefix':
                return transform.value + v;
            case 'suffix':
                return v + transform.value;
            case 'replace':
                return v.split(transform.find).join(transform.replaceWith);
            case 'removeSpecial':
                return v.replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑüÜ]/g, '');
            case 'removeTildes':
                return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            default:
                return v;
        }
    }

    function showTransformPreview(type) {
        const previewArea = document.getElementById('transformPreviewArea');
        const previewContent = document.getElementById('transformLivePreview');
        previewArea.style.display = 'block';

        const transform = { type, ...transformState.config };

        // Calcular el valor acumulado con transformaciones previas + la nueva
        const col = transformState.currentColumn;
        const existingTransforms = state.transformations[col] || [];

        const previewHTML = transformState.sourceData.slice(0, 5).map((val, idx) => {
            // Aplicar transformaciones existentes primero
            let current = String(val);
            existingTransforms.forEach(t => {
                current = applyTransformToValue(current, t);
            });
            const before = current;
            // Aplicar la nueva transformación
            const after = applyTransformToValue(current, transform);

            return `<div style="padding:8px;border-bottom:1px solid #c8e6c9;">
                <strong>Fila ${idx + 1}:</strong> "${sanitizeHTML(before)}" → "<strong style="color:#28a745;">${sanitizeHTML(after)}</strong>"
            </div>`;
        }).join('');

        previewContent.innerHTML = previewHTML;
    }

    function enableTransformApply() {
        document.getElementById('applyTransformBtn').disabled = false;
        document.getElementById('applyTransformBtn').style.opacity = '1';
    }

    function disableTransformApply() {
        document.getElementById('applyTransformBtn').disabled = true;
        document.getElementById('applyTransformBtn').style.opacity = '0.5';
    }

    function applyCurrentTransform() {
        const type = transformState.selectedTransform;
        if (!type) return;

        const col = transformState.currentColumn;
        if (!state.transformations[col]) {
            state.transformations[col] = [];
        }

        const transform = { type, ...transformState.config };
        state.transformations[col].push(transform);

        // Resetear UI del modal
        transformState.selectedTransform = null;
        transformState.config = {};
        document.querySelectorAll('.transform-option-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('transformConfigArea').style.display = 'none';
        document.getElementById('transformPreviewArea').style.display = 'none';
        disableTransformApply();

        // Refrescar lista de aplicadas
        renderAppliedTransforms();
        renderMappingTable();
    }

    // Eventos del modal de transformaciones
    window.openTransformModal = openTransformModal;
    window.closeTransformModal = closeTransformModal;
    window.selectTransform = selectTransform;
    window.onTransformConfigChange = onTransformConfigChange;
    window.applyCurrentTransform = applyCurrentTransform;
    window.removeTransform = removeTransform;
    window.clearTransformations = clearTransformations;

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
                } else if (state.customDefaults[col]) {
                    // v4.5.1: Prioridad a custom defaults del usuario
                    csvRow[col] = state.customDefaults[col];
                } else if (template.defaults[col] !== undefined) {
                    csvRow[col] = template.defaults[col];
                } else {
                    csvRow[col] = '';
                }

                // v4.5.1: Aplicar transformaciones
                if (state.transformations[col] && state.transformations[col].length > 0) {
                    state.transformations[col].forEach(t => {
                        csvRow[col] = applyTransformToValue(csvRow[col], t);
                    });
                }
            });
            return csvRow;
        });
        
        // Mostrar preview
        document.getElementById('previewSection').style.display = 'block';
        
        const previewHTML = `
            <p style="margin-bottom: 10px; color: #333; font-weight: 600;">
                Total: ${csvData.length} filas
            </p>
            <div style="overflow-x: auto; max-height: 500px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                <table class="preview-table" style="margin:0;">
                    <thead style="position: sticky; top: 0; z-index: 1;">
                        <tr>
                            <th style="background:#667eea;color:white;padding:8px;text-align:center;min-width:40px;">#</th>
                            ${template.columns.map(col => `<th style="background:#667eea;color:white;padding:8px;">${sanitizeHTML(col)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${csvData.map((row, idx) => `
                            <tr style="background:${idx % 2 === 0 ? '#f8f9ff' : 'white'};">
                                <td style="padding:6px 8px;text-align:center;color:#999;font-size:0.85em;border-right:1px solid #e0e0e0;">${idx + 1}</td>
                                ${template.columns.map(col => `<td style="padding:6px 8px;">${sanitizeHTML(row[col])}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
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
    // AUDIT REPORT v5.0.0
    // ============================================
    const AUDIT_COLUMNS = ['date', 'date_utc', 'oper', 'userid', 'host', 'app', 'domain', 'certnameorig', 'subjectcn', 'data'];
    const AUDIT_COL_WIDTHS = [26, 26, 12, 12, 18, 20, 30, 60, 40, 80];

    function setupAuditReport() {
        // Audit file upload
        const auditUploadArea = document.getElementById('auditUploadArea');
        const auditFileInput = document.getElementById('auditFileInput');

        auditFileInput.addEventListener('click', (e) => e.stopPropagation());

        auditUploadArea.addEventListener('click', () => {
            auditFileInput.value = '';
            auditFileInput.click();
        });

        auditUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            auditUploadArea.classList.add('dragover');
        });

        auditUploadArea.addEventListener('dragleave', () => {
            auditUploadArea.classList.remove('dragover');
        });

        auditUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            auditUploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                if (!file.name.toLowerCase().endsWith('.xml')) {
                    alert('⚠️ Solo se aceptan archivos .xml');
                    return;
                }
                handleAuditFileUpload(file);
            }
        });

        auditFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleAuditFileUpload(file);
        });

        // Apply filters button
        document.getElementById('auditApplyFiltersBtn').onclick = () => {
            applyAuditFilters();
        };

        // Download XLSX
        document.getElementById('auditDownloadBtn').onclick = () => {
            downloadAuditXLSX();
        };

        // Reset
        document.getElementById('auditResetBtn').onclick = () => {
            if (confirm('¿Seguro que quieres reiniciar? Se perderán todos los datos.')) {
                location.reload();
            }
        };

        // XLSX name preview
        const auditNameInput = document.getElementById('auditXlsxNameInput');
        auditNameInput.addEventListener('input', () => {
            document.getElementById('auditXlsxNamePreview').textContent =
                auditNameInput.value.trim() || state.auditXmlFileName + '_converted';
        });
    }

    function handleAuditFileUpload(file) {
        state.auditXmlFileName = file.name.replace(/\.xml$/i, '');
        const progressDiv = document.getElementById('auditProgress');
        const progressBar = document.getElementById('auditProgressBar');
        const progressText = document.getElementById('auditProgressText');

        progressDiv.style.display = 'block';
        progressBar.style.width = '10%';
        progressText.textContent = 'Leyendo archivo... ' + (file.size / (1024 * 1024)).toFixed(1) + ' MB';

        const reader = new FileReader();

        reader.onload = (e) => {
            progressBar.style.width = '40%';
            progressText.textContent = 'Parseando entries...';

            // Use setTimeout to let UI update
            setTimeout(() => {
                try {
                    const xmlText = e.target.result;
                    const entries = parseAuditXML(xmlText, progressBar, progressText);
                    state.auditRawEntries = entries;

                    progressBar.style.width = '100%';
                    progressText.textContent = 'Encontrados ' + entries.length + ' entries';

                    // Show filters section
                    document.getElementById('auditFiltersSection').style.display = 'block';
                    document.getElementById('auditFiltersSection').scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });

                    // Set default XLSX name
                    document.getElementById('auditXlsxNameInput').value = state.auditXmlFileName + '_converted';
                    document.getElementById('auditXlsxNamePreview').textContent = state.auditXmlFileName + '_converted';

                } catch (err) {
                    alert('❌ Error al parsear XML: ' + err.message);
                    console.error(err);
                    progressDiv.style.display = 'none';
                }
            }, 50);
        };

        reader.onerror = () => {
            alert('❌ Error al leer el archivo');
            progressDiv.style.display = 'none';
        };

        reader.readAsText(file, 'UTF-8');
    }

    function parseAuditXML(xmlText, progressBar, progressText) {
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        const entries = [];
        let match;
        let count = 0;

        // First pass: count approximate entries
        const approxCount = (xmlText.match(/<entry>/g) || []).length;
        if (progressText) progressText.textContent = 'Encontrados ~' + approxCount + ' entries. Procesando...';

        while ((match = entryRegex.exec(xmlText)) !== null) {
            const entryXml = match[1];
            entries.push(parseAuditEntry(entryXml));
            count++;

            if (count % 5000 === 0 && progressBar && progressText) {
                const pct = 40 + Math.round((count / approxCount) * 50);
                progressBar.style.width = Math.min(pct, 90) + '%';
                progressText.textContent = 'Procesando ' + count + ' / ' + approxCount + ' entries...';
            }
        }

        return entries;
    }

    function parseAuditEntry(entryXml) {
        // Extract <data>...</data> block first (critical for disambiguating fields)
        const dataMatch = entryXml.match(/<data>([\s\S]*?)<\/data>/);
        const dataContent = dataMatch ? dataMatch[1] : '';

        // For root-level fields, search in the part BEFORE <data>
        const beforeData = dataMatch ? entryXml.substring(0, dataMatch.index) : entryXml;

        // Helper to extract a tag value from a specific string
        function getTag(str, tagName) {
            const m = str.match(new RegExp('<' + tagName + '>([\\s\\S]*?)<\\/' + tagName + '>'));
            return m ? m[1] : '';
        }

        // Check for self-closing tags too
        function getTagOrEmpty(str, tagName) {
            // First try normal tag
            const m = str.match(new RegExp('<' + tagName + '>([\\s\\S]*?)<\\/' + tagName + '>'));
            if (m) return m[1];
            // Check self-closing
            const selfClose = str.match(new RegExp('<' + tagName + '\\s*/>'));
            if (selfClose) return '';
            return '';
        }

        // Root-level fields (from beforeData to avoid <data> duplicates)
        const date = getTag(beforeData, 'date');
        const oper = getTag(beforeData, 'oper');
        const userid = getTag(beforeData, 'userid');
        const host = getTag(beforeData, 'host');
        const app = getTag(beforeData, 'app');
        const orgaid = getTag(beforeData, 'orgaid');

        // Info field (always at root level, after <data>)
        const info = getTag(entryXml, 'info');

        // Data-level fields
        const dataLocation = getTagOrEmpty(dataContent, 'location');
        const dataCertname = getTag(dataContent, 'certname');
        const dataCertnameorig = getTag(dataContent, 'certnameorig');
        const dataUserid = getTag(dataContent, 'userid');

        return {
            date,
            oper,
            userid,
            host,
            app,
            orgaid,
            info,
            dataContent,        // raw inner content of <data>
            dataLocation,       // location from inside <data>
            dataCertname,
            dataCertnameorig,
            dataUserid
        };
    }

    // Timezone: determine CET (+1) or CEST (+2) for a given date
    function getSpainOffset(dateStr, tzMode) {
        if (tzMode === 'cet') return 1;
        if (tzMode === 'cest') return 2;

        // Auto: CEST is from last Sunday of March to last Sunday of October
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 1; // fallback CET

        const year = d.getFullYear();
        const month = d.getMonth(); // 0-indexed

        // Last Sunday of March
        const marchLast = new Date(year, 2, 31);
        while (marchLast.getDay() !== 0) marchLast.setDate(marchLast.getDate() - 1);
        marchLast.setHours(2, 0, 0, 0); // transition at 02:00 UTC

        // Last Sunday of October
        const octLast = new Date(year, 9, 31);
        while (octLast.getDay() !== 0) octLast.setDate(octLast.getDate() - 1);
        octLast.setHours(3, 0, 0, 0); // transition at 03:00 CEST = 01:00 UTC

        if (d >= marchLast && d < octLast) return 2; // CEST
        return 1; // CET
    }

    function formatAuditDate(dateStr) {
        // Input: 2026-01-10T23:57:22.9607760
        // Output: 2026-01-10 23:57:22.960000 (6 digits microseconds, padded)
        if (!dateStr) return '';

        const tMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})\.?(\d*)$/);
        if (!tMatch) return dateStr;

        const datePart = tMatch[1];
        const timePart = tMatch[2];
        let fracPart = tMatch[3] || '0';

        // Take first 6 digits, pad to 6
        fracPart = fracPart.substring(0, 6).padEnd(6, '0');

        return datePart + ' ' + timePart + '.' + fracPart;
    }

    function addOffsetToDate(dateStr, offsetHours) {
        // Parse the date string and add offset hours
        if (!dateStr) return '';

        const tMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.?(\d*)$/);
        if (!tMatch) return dateStr;

        const year = parseInt(tMatch[1]);
        const month = parseInt(tMatch[2]) - 1;
        const day = parseInt(tMatch[3]);
        const hours = parseInt(tMatch[4]);
        const minutes = parseInt(tMatch[5]);
        const seconds = parseInt(tMatch[6]);
        let fracPart = tMatch[7] || '0';

        // Preserve original fractional part (up to 6 digits)
        fracPart = fracPart.substring(0, 6).padEnd(6, '0');

        const d = new Date(year, month, day, hours + offsetHours, minutes, seconds);

        const pad = (n, len) => String(n).padStart(len || 2, '0');
        return pad(d.getFullYear(), 4) + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
            '.' + fracPart;
    }

    function extractDomain(locationStr) {
        if (!locationStr || !locationStr.trim()) return '';

        // Decode XML entities
        let url = locationStr.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        try {
            // Try to parse as URL
            if (url.startsWith('http://') || url.startsWith('https://')) {
                const parsed = new URL(url);
                return parsed.hostname;
            }
        } catch (e) {
            // Not a valid URL
        }
        return '';
    }

    function extractSubjectCN(infoStr) {
        if (!infoStr) return '';
        const m = infoStr.match(/subjectcn='(.*?)'/);
        return m ? m[1] : '';
    }

    function buildCertnameorig(entry) {
        // Concatenate raw XML tags from <data>
        const parts = [];
        if (entry.dataCertname) parts.push('<certname>' + entry.dataCertname + '</certname>');
        if (entry.dataCertnameorig) parts.push('<certnameorig>' + entry.dataCertnameorig + '</certnameorig>');
        if (entry.dataUserid) parts.push('<userid>' + entry.dataUserid + '</userid>');
        return parts.join('');
    }

    function applyAuditFilters() {
        const dateFrom = document.getElementById('auditDateFrom').value;
        const dateTo = document.getElementById('auditDateTo').value;
        const userIdFilter = document.getElementById('auditUserIdFilter').value.trim();
        const orgaIdFilter = document.getElementById('auditOrgaIdFilter').value.trim().toLowerCase();
        const tzMode = document.getElementById('auditTimezone').value;

        const totalEntries = state.auditRawEntries.length;
        let filtered = state.auditRawEntries;

        // Apply date filter
        if (dateFrom) {
            const fromStr = dateFrom.replace('T', ' ');
            filtered = filtered.filter(e => {
                const entryDate = e.date.replace('T', ' ');
                return entryDate >= fromStr;
            });
        }
        if (dateTo) {
            const toStr = dateTo.replace('T', ' ');
            filtered = filtered.filter(e => {
                const entryDate = e.date.replace('T', ' ');
                return entryDate <= toStr;
            });
        }

        // Apply userid filter (exact match)
        if (userIdFilter) {
            filtered = filtered.filter(e => e.userid === userIdFilter);
        }

        // Apply orgaid filter (case-insensitive)
        if (orgaIdFilter) {
            filtered = filtered.filter(e => e.orgaid.toLowerCase() === orgaIdFilter);
        }

        // Transform to output rows
        const processedData = filtered.map(entry => {
            const offset = getSpainOffset(entry.date, tzMode);
            return {
                date: formatAuditDate(entry.date),
                date_utc: addOffsetToDate(entry.date, offset),
                oper: entry.oper,
                userid: entry.userid,
                host: entry.host,
                app: entry.app,
                domain: extractDomain(entry.dataLocation),
                certnameorig: buildCertnameorig(entry),
                subjectcn: extractSubjectCN(entry.info),
                data: entry.dataContent.trim()
            };
        });

        state.auditProcessedData = processedData;

        // Stats
        const uniqueUsers = new Set(filtered.map(e => e.userid)).size;
        const uniqueOrgas = new Set(filtered.map(e => e.orgaid)).size;

        document.getElementById('statTotalEntries').textContent = totalEntries.toLocaleString();
        document.getElementById('statFilteredEntries').textContent = processedData.length.toLocaleString();
        document.getElementById('statUniqueUsers').textContent = uniqueUsers.toLocaleString();
        document.getElementById('statUniqueOrgas').textContent = uniqueOrgas.toLocaleString();

        document.getElementById('auditStatsSection').style.display = 'block';

        // Generate preview
        generateAuditPreview(processedData);
    }

    function generateAuditPreview(data) {
        const previewData = data.slice(0, 50);

        // Header
        const thead = document.getElementById('auditPreviewHead');
        thead.innerHTML = '<tr>' +
            '<th style="background:#667eea;color:white;padding:8px;text-align:center;min-width:40px;">#</th>' +
            AUDIT_COLUMNS.map(col =>
                '<th style="background:#667eea;color:white;padding:8px;white-space:nowrap;">' + sanitizeHTML(col) + '</th>'
            ).join('') +
            '</tr>';

        // Body
        const tbody = document.getElementById('auditPreviewBody');
        const longCols = ['certnameorig', 'data'];

        tbody.innerHTML = previewData.map((row, idx) => {
            return '<tr style="background:' + (idx % 2 === 0 ? '#f8f9ff' : 'white') + ';">' +
                '<td style="padding:6px 8px;text-align:center;color:#999;font-size:0.85em;border-right:1px solid #e0e0e0;">' + (idx + 1) + '</td>' +
                AUDIT_COLUMNS.map(col => {
                    const val = row[col] || '';
                    const isLong = longCols.includes(col);
                    const style = isLong
                        ? 'padding:6px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
                        : 'padding:6px 8px;white-space:nowrap;';
                    const title = isLong ? ' title="' + sanitizeHTML(val).replace(/"/g, '&quot;') + '"' : '';
                    return '<td style="' + style + '"' + title + '>' + sanitizeHTML(val) + '</td>';
                }).join('') +
                '</tr>';
        }).join('');

        // Row count
        document.getElementById('auditRowCount').textContent = data.length + ' filas procesadas' +
            (data.length > 50 ? ' (mostrando primeras 50)' : '');

        // Show preview section
        document.getElementById('auditPreviewSection').style.display = 'block';
        document.getElementById('auditPreviewSection').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    function downloadAuditXLSX() {
        const data = state.auditProcessedData;
        if (!data || data.length === 0) {
            alert('⚠️ No hay datos para descargar');
            return;
        }

        // Build AOA (array of arrays)
        const aoa = [AUDIT_COLUMNS]; // header row
        data.forEach(row => {
            aoa.push(AUDIT_COLUMNS.map(col => row[col] || ''));
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Set column widths
        ws['!cols'] = AUDIT_COL_WIDTHS.map(w => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, ws, 'Resultado consulta');

        const customName = document.getElementById('auditXlsxNameInput').value.trim();
        const fileName = customName
            ? customName + '.xlsx'
            : state.auditXmlFileName + '_converted.xlsx';

        XLSX.writeFile(wb, fileName);
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
            const includeHeaders = document.getElementById('includeHeadersCheckbox').checked;
            const dataRows = window.generatedCSVData.map(row =>
                template.columns.map(col => {
                    const val = String(row[col] || '').replace(/"/g, '""');
                    return `"${val}"`;
                }).join(',')
            );
            const csvContent = includeHeaders
                ? [template.columns.join(','), ...dataRows].join('\n')
                : dataRows.join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const customName = document.getElementById('csvNameInput').value.trim();
            link.download = customName
                ? `${customName}.csv`
                : `${state.selectedProduct}_${state.selectedCommand}_${Date.now()}.csv`;
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
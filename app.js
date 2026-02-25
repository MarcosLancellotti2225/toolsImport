const COMMAND_TEMPLATES = {
            // IvSign Commands
            'users-add': {
                product: 'ivsign',
                category: 'Users',
                columns: ['userid', 'email', 'nombre', 'apellidos', 'dni', 'telefono', 'rol', 'password']
            },
            'users-set': {
                product: 'ivsign',
                category: 'Users',
                columns: ['userid', 'nombre', 'apellidos', 'dni', 'email']
            },
            'users-remove': {
                product: 'ivsign',
                category: 'Users',
                columns: ['orgaid', 'userid']
            },
            'certs-import': {
                product: 'ivsign',
                category: 'Certs',
                columns: ['cert_pfx', 'cert_password', 'cert_name', 'descr', 'cert_pin', 'userid', 'orgaid', 'cargo', 'departamento', 'personalizado']
            },
            'certs-del': {
                product: 'ivsign',
                category: 'Certs',
                columns: ['certid']
            },
            'certs-pinset': {
                product: 'ivsign',
                category: 'Certs',
                columns: ['certid', 'pin_antiguo', 'pin_nuevo']
            },
            'delegs-add': {
                product: 'ivsign',
                category: 'Delegs',
                columns: ['certid', 'delegate_name', 'description', 'Ignorecertrules', 'needauth']
            },
            'delegs-usersadd': {
                product: 'ivsign',
                category: 'Delegs',
                columns: ['delegid', 'orgaid', 'cert_userid', 'cert_pin', 'cert_deleg_pin', 'notify']
            },
            'delegs-del': {
                product: 'ivsign',
                category: 'Delegs',
                columns: ['delegid']
            },
            'delegs-usersdel': {
                product: 'ivsign',
                category: 'Delegs',
                columns: ['delegid', 'userid']
            },
            'rules-add': {
                product: 'ivsign',
                category: 'Rules',
                columns: ['certid']
            },
            
            // IvNeos Commands
            'clientes-import': {
                product: 'ivneos',
                category: 'Clientes',
                columns: ['nombre', 'cif', 'direccion', 'cp', 'poblacion', 'provincia', 'pais', 'telefono', 'email']
            },
            'grupos-import': {
                product: 'ivneos',
                category: 'Grupos',
                columns: ['nombre', 'descripcion']
            },
            'usuarios-import': {
                product: 'ivneos',
                category: 'Usuarios',
                columns: ['nombre', 'apellidos', 'email', 'telefono', 'grupo']
            }
        };

        // Estado global
        let state = {
            selectedProduct: null,
            selectedCommand: null,
            excelData: null,
            excelColumns: [],
            mapping: {},
            defaultValues: {},
            mode: null // 'create' o 'convert'
        };

        // Renderizar botones de comandos
        function renderCommandButtons() {
            const grid = document.getElementById('commandGrid');
            grid.innerHTML = '';

            // Filtrar comandos por producto seleccionado
            const filteredCommands = Object.keys(COMMAND_TEMPLATES).filter(cmd => {
                return state.selectedProduct && COMMAND_TEMPLATES[cmd].product === state.selectedProduct;
            });

            filteredCommands.forEach(cmd => {
                const template = COMMAND_TEMPLATES[cmd];
                const btn = document.createElement('button');
                btn.className = 'command-btn';
                btn.innerHTML = `
                    <div class="command-category">${template.category}</div>
                    <div class="command-name">${cmd}</div>
                `;
                btn.onclick = () => selectCommand(cmd);
                grid.appendChild(btn);
            });
        }

        // Seleccionar comando
        function selectCommand(cmd) {
            state.selectedCommand = cmd;
            
            // Update UI
            document.querySelectorAll('.command-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.closest('.command-btn').classList.add('active');

            // Mostrar columnas requeridas
            const template = COMMAND_TEMPLATES[cmd];
            const columnsInfo = document.getElementById('columnsInfo');
            const requiredColumns = document.getElementById('requiredColumns');
            
            requiredColumns.innerHTML = template.columns.map(col => 
                `<span style="display: inline-block; background: #667eea; color: white; padding: 5px 10px; margin: 5px; border-radius: 5px; font-size: 0.9em;">${col}</span>`
            ).join('');
            
            columnsInfo.style.display = 'block';
        }

        // Configurar zona de carga
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // Botones de modo
        document.getElementById('createTemplateBtn').onclick = () => {
            if (!state.selectedCommand) {
                alert('⚠️ Primero selecciona un comando');
                return;
            }
            createTemplateMode();
        };

        document.getElementById('loadExcelBtn').onclick = () => {
            if (!state.selectedCommand) {
                alert('⚠️ Primero selecciona un comando');
                return;
            }
            loadExcelMode();
        };

        // Modo: Crear Template
        function createTemplateMode() {
            state.mode = 'create';
            document.getElementById('modeInfo').style.display = 'block';
            document.getElementById('modeInfoText').innerHTML = '📄 <strong>Modo: Crear Template</strong> - Se generará un Excel vacío con las columnas correctas';
            document.getElementById('uploadArea').style.display = 'none';
            document.getElementById('templateCreated').style.display = 'block';
            document.getElementById('headerOption').style.display = 'none';
        }

        // Modo: Cargar Excel
        function loadExcelMode() {
            state.mode = 'convert';
            document.getElementById('modeInfo').style.display = 'block';
            document.getElementById('modeInfoText').innerHTML = '📁 <strong>Modo: Convertir Excel</strong> - Carga tu Excel desordenado y lo convertiremos';
            document.getElementById('uploadArea').style.display = 'block';
            document.getElementById('templateCreated').style.display = 'none';
            document.getElementById('headerOption').style.display = 'none'; // Se mostrará después de cargar el archivo
        }

        // Crear y descargar template Excel vacío
        document.getElementById('downloadTemplateBtn').onclick = () => {
            const template = COMMAND_TEMPLATES[state.selectedCommand];
            
            // Crear workbook vacío con las columnas correctas
            const ws_data = [template.columns]; // Solo el header
            
            // Agregar algunas filas de ejemplo vacías (10 filas)
            for (let i = 0; i < 10; i++) {
                ws_data.push(new Array(template.columns.length).fill(''));
            }
            
            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            
            // Dar formato a las columnas (ancho automático)
            const colWidths = template.columns.map(col => ({wch: Math.max(col.length + 2, 15)}));
            ws['!cols'] = colWidths;
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Datos");
            
            // Obtener nombre personalizado o usar el default
            const customName = document.getElementById('templateNameInput').value.trim();
            const fileName = customName 
                ? `${customName}.xlsx`
                : `template_${state.selectedCommand}.xlsx`;
            
            // Descargar
            XLSX.writeFile(wb, fileName);
            
            alert(`✅ Template descargado!\n\n📄 Archivo: ${fileName}\n\n📝 Instrucciones:\n1. Abre el archivo Excel\n2. Complétalo con tus datos\n3. Vuelve aquí y usa "Cargar Excel Existente"\n4. El sistema lo detectará automáticamente y podrás procesarlo`);
        };

        uploadArea.onclick = () => fileInput.click();

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
                handleFile(file);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFile(file);
            }
        });

        // Procesar archivo
        let rawExcelData = null; // Para guardar los datos sin procesar

        function handleFile(file) {
            if (!state.selectedCommand) {
                alert('⚠️ Primero selecciona un comando');
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    
                    // Leer como array de arrays para tener control total
                    rawExcelData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
                    
                    if (rawExcelData.length === 0) {
                        alert('⚠️ El archivo está vacío');
                        return;
                    }

                    // Mostrar opción de header
                    document.getElementById('headerOption').style.display = 'block';
                    
                } catch (error) {
                    alert('❌ Error al leer el archivo: ' + error.message);
                }
            };
            
            reader.readAsArrayBuffer(file);
        }

        // Procesar archivo según opción de header
        document.getElementById('processFileBtn').onclick = () => {
            const hasHeader = document.getElementById('hasHeaderRow').value === 'true';
            processExcelData(rawExcelData, hasHeader);
        };

        // Manejar selección de opciones de header
        document.getElementById('optionWithHeader').onclick = function() {
            document.getElementById('hasHeaderRow').value = 'true';
            
            // Estilos activo
            this.style.background = '#f8f9ff';
            this.style.borderColor = '#667eea';
            this.querySelector('h4').style.color = '#667eea';
            
            // Estilos inactivo
            document.getElementById('optionWithoutHeader').style.background = 'white';
            document.getElementById('optionWithoutHeader').style.borderColor = '#e0e0e0';
            document.getElementById('optionWithoutHeader').querySelector('h4').style.color = '#666';
        };

        document.getElementById('optionWithoutHeader').onclick = function() {
            document.getElementById('hasHeaderRow').value = 'false';
            
            // Estilos activo
            this.style.background = '#fff8e1';
            this.style.borderColor = '#ffc107';
            this.querySelector('h4').style.color = '#f57c00';
            
            // Estilos inactivo
            document.getElementById('optionWithHeader').style.background = 'white';
            document.getElementById('optionWithHeader').style.borderColor = '#e0e0e0';
            document.getElementById('optionWithHeader').querySelector('h4').style.color = '#666';
        };

        function processExcelData(rawData, hasHeader) {
            const template = COMMAND_TEMPLATES[state.selectedCommand];

            if (hasHeader) {
                // Modo normal: primera fila son headers
                const headers = rawData[0];
                const dataRows = rawData.slice(1);
                
                state.excelColumns = headers.map(h => String(h).trim());
                state.excelData = dataRows.map(row => {
                    const obj = {};
                    headers.forEach((header, idx) => {
                        obj[String(header).trim()] = row[idx] || '';
                    });
                    return obj;
                });
            } else {
                // Sin headers: generar nombres como Columna A, B, C... Z, AA, AB, etc.
                const numColumns = rawData[0].length;
                state.excelColumns = Array.from({ length: numColumns }, (_, i) => {
                    // Convertir índice a letra estilo Excel: 0=A, 1=B, 25=Z, 26=AA, 27=AB...
                    let columnLetter = '';
                    let num = i;
                    while (num >= 0) {
                        columnLetter = String.fromCharCode(65 + (num % 26)) + columnLetter;
                        num = Math.floor(num / 26) - 1;
                    }
                    return `Columna ${columnLetter}`;
                });
                
                state.excelData = rawData.map(row => {
                    const obj = {};
                    state.excelColumns.forEach((colName, idx) => {
                        obj[colName] = row[idx] || '';
                    });
                    return obj;
                });
            }

            if (state.excelData.length === 0) {
                alert('⚠️ No hay datos para procesar');
                return;
            }

            // Verificar si el Excel cargado ya tiene las columnas correctas (modo create)
            const hasCorrectColumns = template.columns.every(col => 
                state.excelColumns.includes(col)
            );

            if (hasCorrectColumns && state.excelColumns.length === template.columns.length) {
                // Excel ya tiene formato correcto, mapeo directo
                state.mapping = {};
                template.columns.forEach(col => {
                    state.mapping[col] = col;
                });
                document.getElementById('mappingSection').style.display = 'none';
                generatePreview();
                alert('✅ Excel con formato correcto detectado! Generando preview...');
            } else {
                // Excel desordenado, necesita mapeo
                setupMapping();
            }
        }

        // Configurar mapeo de columnas
        function setupMapping() {
            const template = COMMAND_TEMPLATES[state.selectedCommand];
            const mappingBody = document.getElementById('mappingBody');
            mappingBody.innerHTML = '';

            // Auto-mapear columnas similares
            let autoMappedCount = 0;
            template.columns.forEach(requiredCol => {
                const normalizedRequired = requiredCol.toLowerCase().replace(/[_-]/g, '');
                
                let matchedCol = null;
                for (let excelCol of state.excelColumns) {
                    const normalizedExcel = excelCol.toLowerCase().replace(/[_-]/g, '');
                    if (normalizedExcel === normalizedRequired || 
                        normalizedExcel.includes(normalizedRequired) ||
                        normalizedRequired.includes(normalizedExcel)) {
                        matchedCol = excelCol;
                        autoMappedCount++;
                        break;
                    }
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${requiredCol}</strong></td>
                    <td>
                        <select class="column-mapping" data-required="${requiredCol}">
                            <option value="">-- No mapear --</option>
                            ${state.excelColumns.map(col => 
                                `<option value="${col}" ${col === matchedCol ? 'selected' : ''}>${col}</option>`
                            ).join('')}
                        </select>
                    </td>
                    <td style="text-align: center;">
                        <button class="btn btn-primary" onclick="openDivisionModal('${requiredCol}')" 
                                style="padding: 6px 12px; font-size: 0.9em; background: #28a745;">
                            🔀 Dividir
                        </button>
                    </td>
                    <td>
                        <input type="text" 
                               class="default-value" 
                               data-required="${requiredCol}"
                               placeholder="Valor fijo (opcional)"
                               style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    </td>
                `;
                mappingBody.appendChild(row);

                // Inicializar mapping
                if (matchedCol) {
                    state.mapping[requiredCol] = matchedCol;
                }
            });

            // Mostrar sección de mapeo
            document.getElementById('mappingSection').classList.add('active');

            // Event listeners para actualización de mapeo
            document.querySelectorAll('.column-mapping').forEach(select => {
                select.addEventListener('change', updateMapping);
            });

            document.querySelectorAll('.default-value').forEach(input => {
                input.addEventListener('input', updateMapping);
            });

            // Configurar botones
            const autoMappingSuccess = autoMappedCount === template.columns.length;
            
            document.getElementById('autoProcessBtn').onclick = () => {
                updateMapping();
                generatePreview();
                alert(`⚡ Auto-procesamiento completado!\n\n✅ ${autoMappedCount}/${template.columns.length} columnas mapeadas automáticamente\n\nRevisa el preview y descarga tu CSV.`);
            };

            document.getElementById('manualMappingBtn').onclick = () => {
                document.getElementById('mappingDetails').style.display = 'block';
                document.getElementById('autoProcessBtn').style.display = 'none';
                document.getElementById('manualMappingBtn').style.display = 'none';
            };

            document.getElementById('applyMappingBtn').onclick = () => {
                updateMapping();
                generatePreview();
            };

            // Si el mapeo automático es perfecto, sugerirlo
            if (autoMappingSuccess) {
                setTimeout(() => {
                    if (confirm(`🎯 ¡Mapeo automático perfecto!\n\n✅ Todas las columnas (${autoMappedCount}) fueron mapeadas correctamente.\n\n¿Quieres procesar directamente?`)) {
                        updateMapping();
                        generatePreview();
                    }
                }, 500);
            }

            // Generar preview inicial
            updateMapping();
        }

        // Actualizar mapeo
        function updateMapping() {
            state.mapping = {};
            state.defaultValues = {};

            document.querySelectorAll('.column-mapping').forEach(select => {
                const required = select.dataset.required;
                const selected = select.value;
                if (selected) {
                    state.mapping[required] = selected;
                }
            });

            document.querySelectorAll('.default-value').forEach(input => {
                const required = input.dataset.required;
                const value = input.value.trim();
                if (value) {
                    state.defaultValues[required] = value;
                }
            });

            // Mostrar resumen del mapeo
            showMappingSummary();

            generatePreview();
        }

        // Mostrar resumen del mapeo
        function showMappingSummary() {
            const template = COMMAND_TEMPLATES[state.selectedCommand];
            const mappedCount = Object.keys(state.mapping).length;
            const defaultCount = Object.keys(state.defaultValues).length;
            const totalRequired = template.columns.length;
            const unmappedCount = totalRequired - mappedCount - defaultCount;

            // Crear o actualizar el resumen
            let summaryDiv = document.getElementById('mappingSummary');
            if (!summaryDiv) {
                summaryDiv = document.createElement('div');
                summaryDiv.id = 'mappingSummary';
                summaryDiv.className = 'mapping-summary';
                const mappingSection = document.getElementById('mappingSection');
                mappingSection.insertBefore(summaryDiv, document.getElementById('mappingDetails'));
            }

            summaryDiv.innerHTML = `
                <strong>📊 Estado del mapeo:</strong><br>
                ✅ Mapeadas: ${mappedCount}/${totalRequired} columnas<br>
                🔧 Con valor por defecto: ${defaultCount}<br>
                ${unmappedCount > 0 ? `⚠️ Sin mapear: ${unmappedCount} (quedarán vacías)` : '✨ ¡Mapeo completo!'}
            `;
        }

        // Generar preview
        function generatePreview() {
            const template = COMMAND_TEMPLATES[state.selectedCommand];
            const previewHead = document.getElementById('previewHead');
            const previewBody = document.getElementById('previewBody');

            // Header
            previewHead.innerHTML = `
                <tr>
                    ${template.columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
            `;

            // Body (primeras 10 filas)
            previewBody.innerHTML = '';
            const previewRows = state.excelData.slice(0, 10);

            previewRows.forEach(row => {
                const tr = document.createElement('tr');
                template.columns.forEach(col => {
                    const td = document.createElement('td');
                    
                    // Obtener valor: primero default, luego mapeado, luego vacío
                    let value = '';
                    if (state.defaultValues[col]) {
                        value = state.defaultValues[col];
                    } else if (state.mapping[col]) {
                        value = row[state.mapping[col]] || '';
                    }
                    
                    td.textContent = value;
                    tr.appendChild(td);
                });
                previewBody.appendChild(tr);
            });

            // Actualizar contador de filas
            const totalRows = state.excelData.length;
            document.getElementById('rowCount').textContent = 
                `Se procesarán ${totalRows} fila${totalRows !== 1 ? 's' : ''}.`;

            // Inicializar nombre del CSV
            const csvNameInput = document.getElementById('csvNameInput');
            if (!csvNameInput.value) {
                csvNameInput.value = state.selectedCommand;
            }
            updateCSVNamePreview();

            // Event listener para actualizar preview del nombre
            csvNameInput.oninput = updateCSVNamePreview;

            // Mostrar sección de preview
            document.getElementById('previewSection').classList.add('active');
        }

        // Actualizar preview del nombre del CSV
        function updateCSVNamePreview() {
            const csvNameInput = document.getElementById('csvNameInput');
            const csvNamePreview = document.getElementById('csvNamePreview');
            const name = csvNameInput.value.trim() || state.selectedCommand;
            csvNamePreview.textContent = name;
        }

        // Generar CSV
        function generateCSV() {
            const template = COMMAND_TEMPLATES[state.selectedCommand];
            const rows = [];

            // Header
            rows.push(template.columns.join(';'));

            // Data
            state.excelData.forEach(row => {
                const csvRow = template.columns.map(col => {
                    let value = '';
                    
                    // Obtener valor: primero default, luego mapeado
                    if (state.defaultValues[col]) {
                        value = state.defaultValues[col];
                    } else if (state.mapping[col]) {
                        value = row[state.mapping[col]] || '';
                    }
                    
                    // Escapar punto y coma y comillas
                    value = String(value).replace(/"/g, '""');
                    if (value.includes(';') || value.includes('\n') || value.includes('"')) {
                        value = `"${value}"`;
                    }
                    
                    return value;
                }).join(';');
                
                rows.push(csvRow);
            });

            return rows.join('\r\n');
        }

        // Descargar CSV
        document.getElementById('downloadBtn').onclick = () => {
            const csv = generateCSV();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            // Obtener nombre personalizado del CSV
            const csvNameInput = document.getElementById('csvNameInput');
            const fileName = csvNameInput.value.trim() || state.selectedCommand;
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${fileName}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Mostrar mensaje de éxito
            const totalRows = state.excelData.length;
            alert(`✅ CSV generado con éxito!\n\n📊 Estadísticas:\n- Comando: ${state.selectedCommand}\n- Filas procesadas: ${totalRows}\n- Columnas: ${COMMAND_TEMPLATES[state.selectedCommand].columns.length}\n\n💾 Archivo: ${fileName}.csv`);
        };

        // Reset
        document.getElementById('resetBtn').onclick = () => {
            location.reload();
        };

        // Selector de productos
        function selectProduct(product) {
            state.selectedProduct = product;
            
            // Actualizar UI de las tarjetas
            document.querySelectorAll('.product-card').forEach(card => {
                card.classList.remove('selected');
            });
            document.getElementById('product' + (product === 'ivsign' ? 'IvSign' : 'IvNeos')).classList.add('selected');
            
            // Mostrar sección de comandos
            document.getElementById('commandSelection').style.display = 'block';
            
            // Renderizar comandos filtrados
            renderCommandButtons();
            
            // Scroll suave a comandos
            document.getElementById('commandSelection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Event listeners para tarjetas de productos
        document.getElementById('productIvSign').onclick = () => selectProduct('ivsign');
        document.getElementById('productIvNeos').onclick = () => selectProduct('ivneos');

// ==========================================
// DIVISIÓN SIMPLE v3.1.0
// ==========================================

let divisionState = {
    currentColumn: null,
    sourceColumn: null,
    sourceData: [],
    separator: '',
    parts: [],
    columnNames: []
};

// Abrir modal de división
window.openDivisionModal = function(columnName) {
    // Actualizar mapeo primero
    updateMapping();
    
    // Obtener columna mapeada
    const excelColumn = state.mapping[columnName];
    
    if (!excelColumn) {
        alert('⚠️ Primero selecciona una columna de tu Excel en el dropdown');
        return;
    }
    
    if (!state.excelData || state.excelData.length === 0) {
        alert('⚠️ No hay datos cargados');
        return;
    }
    
    // Resetear estado
    divisionState.currentColumn = columnName;
    divisionState.sourceColumn = excelColumn;
    divisionState.separator = '';
    divisionState.parts = [];
    divisionState.columnNames = [];
    
    // Obtener datos de muestra (primeras 3 filas)
    const colIndex = state.excelColumns.indexOf(excelColumn);
    divisionState.sourceData = state.excelData.slice(0, 3).map(row => row[colIndex] || '');
    
    // Actualizar UI
    document.getElementById('divisionColumnName').textContent = columnName;
    
    // Mostrar datos originales
    const originalDataDiv = document.getElementById('originalData');
    originalDataDiv.innerHTML = divisionState.sourceData.map((val, idx) => 
        `<div style="padding: 5px 0; border-bottom: 1px solid #ddd;">
            Fila ${idx + 1}: <strong style="color: #667eea;">"${val}"</strong>
        </div>`
    ).join('');
    
    // Resetear inputs
    document.getElementById('separatorInput').value = '';
    document.getElementById('livePreview').innerHTML = '<span style="color: #999;">Haz click en un separador común o escribe el tuyo...</span>';
    document.getElementById('namingSection').style.display = 'none';
    document.getElementById('newColumnsSection').style.display = 'none';
    document.getElementById('applyBtn').disabled = true;
    document.getElementById('applyBtn').style.opacity = '0.5';
    
    // Auto-detectar separador más probable
    const sampleData = divisionState.sourceData[0] || '';
    let suggestedSeparator = '';
    
    if (sampleData.includes(', ')) {
        suggestedSeparator = ', ';
    } else if (sampleData.includes(',')) {
        suggestedSeparator = ',';
    } else if (sampleData.includes(';')) {
        suggestedSeparator = ';';
    } else if (sampleData.includes('-')) {
        suggestedSeparator = '-';
    }
    
    // Si se detectó un separador, sugerirlo visualmente
    if (suggestedSeparator) {
        document.getElementById('livePreview').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 1.2em; color: #28a745; margin-bottom: 10px;">
                    💡 <strong>Separador detectado automáticamente</strong>
                </div>
                <div style="margin-bottom: 15px;">
                    Parece que tus datos usan: <code style="background: #e8f5e9; padding: 5px 15px; border-radius: 5px; font-size: 1.3em; color: #2e7d32;">${suggestedSeparator === ' ' ? '(espacio)' : suggestedSeparator}</code>
                </div>
                <button onclick="setSeparator('${suggestedSeparator.replace(/'/g, "\\'")}')" class="btn btn-primary" style="background: #28a745;">
                    ✅ Usar este separador
                </button>
            </div>
        `;
    }
    
    // Mostrar modal
    document.getElementById('divisionModal').style.display = 'flex';
};

// Cerrar modal
function closeDivisionModal() {
    document.getElementById('divisionModal').style.display = 'none';
}

// Función para setear separador rápidamente
window.setSeparator = function(separator) {
    document.getElementById('separatorInput').value = separator;
    updateLivePreview();
};

// Actualizar preview en vivo
function updateLivePreview() {
    const separator = document.getElementById('separatorInput').value;
    
    if (!separator) {
        document.getElementById('livePreview').innerHTML = '<span style="color: #999;">Escribe un separador arriba para ver el preview...</span>';
        document.getElementById('namingSection').style.display = 'none';
        document.getElementById('newColumnsSection').style.display = 'none';
        document.getElementById('applyBtn').disabled = true;
        document.getElementById('applyBtn').style.opacity = '0.5';
        return;
    }
    
    divisionState.separator = separator;
    
    // Dividir datos
    divisionState.parts = divisionState.sourceData.map(value => {
        if (!value) return [];
        return String(value).split(separator);
    });
    
    // Encontrar número máximo de partes
    const maxParts = Math.max(...divisionState.parts.map(p => p.length), 0);
    
    if (maxParts === 0) {
        document.getElementById('livePreview').innerHTML = '<span style="color: #dc3545;">❌ No se encontró ese separador en los datos</span>';
        document.getElementById('namingSection').style.display = 'none';
        document.getElementById('newColumnsSection').style.display = 'none';
        document.getElementById('applyBtn').disabled = true;
        document.getElementById('applyBtn').style.opacity = '0.5';
        return;
    }
    
    // Mostrar preview como tabla
    let previewHTML = '<table style="width: 100%; border-collapse: collapse;">';
    
    // Header
    previewHTML += '<tr>';
    for (let i = 0; i < maxParts; i++) {
        previewHTML += `<th style="padding: 8px; border: 1px solid #28a745; background: #c8e6c9; text-align: left;">Parte ${i + 1}</th>`;
    }
    previewHTML += '</tr>';
    
    // Datos
    divisionState.parts.forEach((parts, idx) => {
        previewHTML += '<tr>';
        for (let i = 0; i < maxParts; i++) {
            const value = parts[i] || '';
            previewHTML += `<td style="padding: 8px; border: 1px solid #28a745; background: white;"><strong>${value}</strong></td>`;
        }
        previewHTML += '</tr>';
    });
    
    previewHTML += '</table>';
    document.getElementById('livePreview').innerHTML = previewHTML;
    
    // Mostrar sección de nombrado
    showNamingInputs(maxParts);
}

// Mostrar inputs para nombrar partes
function showNamingInputs(numParts) {
    const namingDiv = document.getElementById('namingInputs');
    namingDiv.innerHTML = '';
    
    for (let i = 0; i < numParts; i++) {
        const input = document.createElement('div');
        input.innerHTML = `
            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #667eea;">
                Parte ${i + 1}:
            </label>
            <input 
                type="text" 
                class="column-name-input" 
                data-part="${i}"
                placeholder="Ej: apellidos, nombre, dni..."
                style="width: 100%; padding: 10px; border: 2px solid #667eea; border-radius: 5px; font-size: 1em;"
                oninput="updateColumnNames()">
        `;
        namingDiv.appendChild(input);
    }
    
    document.getElementById('namingSection').style.display = 'block';
    divisionState.columnNames = new Array(numParts).fill('');
}

// Actualizar nombres de columnas
function updateColumnNames() {
    const inputs = document.querySelectorAll('.column-name-input');
    divisionState.columnNames = Array.from(inputs).map(input => input.value.trim());
    
    // Verificar si todos tienen nombre
    const allNamed = divisionState.columnNames.every(name => name.length > 0);
    
    if (allNamed) {
        // Mostrar columnas que se crearán
        const newColsList = document.getElementById('newColumnsList');
        newColsList.innerHTML = divisionState.columnNames.map(name => 
            `<div style="display: inline-block; background: #2196f3; color: white; padding: 8px 15px; margin: 5px; border-radius: 20px; font-weight: 600;">
                📊 ${divisionState.sourceColumn}_${name}
            </div>`
        ).join('');
        
        document.getElementById('newColumnsSection').style.display = 'block';
        
        // Habilitar botón
        document.getElementById('applyBtn').disabled = false;
        document.getElementById('applyBtn').style.opacity = '1';
    } else {
        document.getElementById('newColumnsSection').style.display = 'none';
        document.getElementById('applyBtn').disabled = true;
        document.getElementById('applyBtn').style.opacity = '0.5';
    }
}

// Aplicar división
function applyDivision() {
    if (!divisionState.separator) {
        alert('⚠️ Debes especificar un separador');
        return;
    }
    
    if (divisionState.columnNames.some(name => !name)) {
        alert('⚠️ Debes nombrar todas las partes');
        return;
    }
    
    // Obtener columna origen
    const sourceCol = divisionState.sourceColumn;
    const colIndex = state.excelColumns.indexOf(sourceCol);
    
    if (colIndex === -1) {
        alert('❌ Error: No se encontró la columna origen');
        return;
    }
    
    // Procesar TODOS los datos
    const allParts = state.excelData.map(row => {
        const value = row[colIndex] || '';
        return String(value).split(divisionState.separator);
    });
    
    // Crear nuevas columnas
    divisionState.columnNames.forEach((colName, partIndex) => {
        const newColName = `${sourceCol}_${colName}`;
        
        // Agregar columna si no existe
        if (!state.excelColumns.includes(newColName)) {
            state.excelColumns.push(newColName);
        }
        
        // Agregar datos
        const newColIndex = state.excelColumns.indexOf(newColName);
        allParts.forEach((parts, rowIndex) => {
            const value = parts[partIndex] || '';
            if (state.excelData[rowIndex].length <= newColIndex) {
                state.excelData[rowIndex].push(value);
            } else {
                state.excelData[rowIndex][newColIndex] = value;
            }
        });
        
        // Actualizar mapeo automático si coincide
        const template = COMMAND_TEMPLATES[state.selectedCommand];
        const requiredCols = template.columns;
        const matchingRequired = requiredCols.find(req => 
            req.toLowerCase() === colName.toLowerCase()
        );
        if (matchingRequired && !state.mapping[matchingRequired]) {
            state.mapping[matchingRequired] = newColName;
        }
    });
    
    // Cerrar modal
    closeDivisionModal();
    
    // Actualizar preview
    generatePreview();
    
    // Mensaje de éxito
    const createdCols = divisionState.columnNames.map(name => `• ${sourceCol}_${name}`).join('\n');
    alert(`✅ División aplicada!\n\nColumnas creadas:\n${createdCols}`);
}
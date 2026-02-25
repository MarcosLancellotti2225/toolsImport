// Definición de templates de comandos
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
                category: 'Importación',
                columns: ['NIF/CIF', 'NOMBRE', 'APELLIDOS', 'TEU', 'PERMITIR CERT. REPRESENTACIÓN', 'SS - CCC/NAF', 'CCC', 'NAF', 'ID GRUPO']
            },
            'grupos-import': {
                product: 'ivneos',
                category: 'Importación',
                columns: ['nombre grupo', 'id usuario', 'cif/nif cliente']
            },
            'usuarios-import': {
                product: 'ivneos',
                category: 'Importación',
                columns: ['TIPO']
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
            const filteredCommands = Object.keys(COMMAND_TEMPLATES).filter(cmd => 
                COMMAND_TEMPLATES[cmd].product === state.selectedProduct
            );

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

        // Cargar logos como base64 (se cargarán dinámicamente desde los archivos subidos)
        async function loadLogos() {
            const ivSignImg = document.getElementById('ivSignLogo');
            const ivNeosImg = document.getElementById('ivNeosLogo');
            
            // Cargar logos desde la carpeta images
            ivSignImg.src = 'images/ivsign-logo.png';
            ivNeosImg.src = 'images/ivneos-logo.png';
            
            ivSignImg.style.width = '100%';
            ivSignImg.style.maxWidth = '350px';
            ivNeosImg.style.width = '100%';
            ivNeosImg.style.maxWidth = '350px';
        }

        // Seleccionar producto
        function selectProduct(product) {
            state.selectedProduct = product;
            
            // Update UI - quitar selección de todos
            document.querySelectorAll('.product-card').forEach(card => {
                card.classList.remove('selected');
            });
            
            // Agregar selección al elegido
            if (product === 'ivsign') {
                document.getElementById('productIvSign').classList.add('selected');
            } else {
                document.getElementById('productIvNeos').classList.add('selected');
            }
            
            // Mostrar sección de comandos
            document.getElementById('commandSelection').style.display = 'block';
            
            // Renderizar comandos del producto seleccionado
            renderCommandButtons();
            
            // Scroll suave a la sección de comandos
            setTimeout(() => {
                document.getElementById('commandSelection').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }

        // Event listeners para selección de producto
        document.getElementById('productIvSign').onclick = () => selectProduct('ivsign');
        document.getElementById('productIvNeos').onclick = () => selectProduct('ivneos');

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
                        <button class="transform-btn" onclick="openTransformModal('${requiredCol}', '${matchedCol || ''}')">
                            🔧 Transformar
                        </button>
                        <div id="transform-status-${requiredCol}" style="margin-top: 5px; font-size: 0.85em; color: #28a745;"></div>
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

        // Inicializar
        loadLogos();

        // ==========================================
        // SISTEMA DE TRANSFORMACIONES
        // ==========================================

        let currentTransformColumn = null;
        let transformations = {}; // Guarda las transformaciones aplicadas

        // Abrir modal de transformaciones
        function openTransformModal(columnName, excelColumn) {
            currentTransformColumn = columnName;
            document.getElementById('transformColumnName').textContent = columnName;
            document.getElementById('transformModal').style.display = 'flex';
            
            // Inicializar paneles
            initializeTransformModal();
            
            // Cargar preview inicial
            updateSplitPreview();
        }

        // Cerrar modal
        document.getElementById('closeTransformModal').addEventListener('click', () => {
            document.getElementById('transformModal').style.display = 'none';
        });

        // Cambiar tabs
        document.querySelectorAll('.transform-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Remover active de todos
                document.querySelectorAll('.transform-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.transform-panel').forEach(p => p.classList.remove('active'));
                
                // Activar el seleccionado
                this.classList.add('active');
                document.getElementById('panel-' + this.dataset.tab).classList.add('active');
            });
        });

        // ==========================================
        // DIVIDIR COLUMNA
        // ==========================================

        // Cambiar separador
        document.querySelectorAll('.sep-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.sep-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                updateSplitPreview();
            });
        });

        document.getElementById('customSep').addEventListener('input', updateSplitPreview);
        document.getElementById('smartSplit').addEventListener('change', updateSplitPreview);

        function updateSplitPreview() {
            const separator = getSelectedSeparator();
            const smart = document.getElementById('smartSplit').checked;
            
            // Obtener datos de muestra (primeras 3 filas)
            const sampleData = getSampleDataForColumn(currentTransformColumn);
            
            if (!sampleData || sampleData.length === 0) return;

            // Dividir datos
            const split = sampleData.map(value => {
                if (!value) return [];
                
                if (smart) {
                    // División inteligente: detecta "Apellido, Nombre"
                    if (value.includes(',')) {
                        const parts = value.split(',').map(p => p.trim());
                        return [parts[1] || '', parts[0] || '']; // Invierte el orden
                    }
                }
                
                return value.split(separator);
            });

            // Determinar número máximo de partes
            const maxParts = Math.max(...split.map(s => s.length));

            // Crear opciones de asignación
            const splitPartsDiv = document.getElementById('splitParts');
            const requiredColumns = COMMAND_TEMPLATES[state.selectedCommand].columns;
            
            splitPartsDiv.innerHTML = '';
            for (let i = 0; i < maxParts; i++) {
                const div = document.createElement('div');
                div.className = 'part-assignment';
                div.innerHTML = `
                    <strong>Parte ${i + 1}:</strong>
                    <select class="part-select" data-part="${i}">
                        <option value="">-- No usar --</option>
                        ${requiredColumns.map(col => 
                            `<option value="${col}">${col}</option>`
                        ).join('')}
                    </select>
                `;
                splitPartsDiv.appendChild(div);
            }

            // Mostrar preview
            const previewDiv = document.getElementById('splitPreview');
            previewDiv.innerHTML = split.slice(0, 3).map((parts, idx) => `
                <div class="preview-row">
                    <span class="before">${sampleData[idx]}</span> 
                    → 
                    ${parts.map((p, i) => `<span class="after">Parte ${i+1}: "${p}"</span>`).join(' | ')}
                </div>
            `).join('');
        }

        function getSelectedSeparator() {
            const custom = document.getElementById('customSep').value;
            if (custom) return custom;
            
            const activeBtn = document.querySelector('.sep-btn.active');
            return activeBtn ? activeBtn.dataset.sep : ' ';
        }

        function getSampleDataForColumn(columnName) {
            if (!state.excelData || state.excelData.length === 0) return [];
            
            const mappedColumn = state.mapping[columnName];
            if (!mappedColumn) return [];
            
            const columnIndex = state.excelColumns.indexOf(mappedColumn);
            if (columnIndex === -1) return [];
            
            return state.excelData.slice(0, 3).map(row => row[columnIndex]);
        }

        // Aplicar división
        document.getElementById('applySplit').addEventListener('click', () => {
            const separator = getSelectedSeparator();
            const smart = document.getElementById('smartSplit').checked;
            const assignments = {};
            
            document.querySelectorAll('.part-select').forEach(select => {
                const part = select.dataset.part;
                const column = select.value;
                if (column) {
                    assignments[part] = column;
                }
            });

            if (Object.keys(assignments).length === 0) {
                alert('Debes asignar al menos una parte a una columna');
                return;
            }

            // Guardar transformación
            transformations[currentTransformColumn] = {
                type: 'split',
                separator,
                smart,
                assignments
            };

            // Aplicar transformación a los datos
            applySplitTransformation(currentTransformColumn);
            
            document.getElementById('transformModal').style.display = 'none';
            alert('✅ División aplicada correctamente');
        });

        function applySplitTransformation(columnName) {
            const transform = transformations[columnName];
            if (!transform || transform.type !== 'split') return;

            const mappedColumn = state.mapping[columnName];
            if (!mappedColumn) return;

            const columnIndex = state.excelColumns.indexOf(mappedColumn);
            if (columnIndex === -1) return;

            // Dividir cada fila
            state.excelData = state.excelData.map(row => {
                const value = row[columnIndex] || '';
                let parts = [];

                if (transform.smart && value.includes(',')) {
                    const split = value.split(',').map(p => p.trim());
                    parts = [split[1] || '', split[0] || ''];
                } else {
                    parts = value.split(transform.separator);
                }

                // Crear nuevas columnas según las asignaciones
                const newRow = [...row];
                Object.entries(transform.assignments).forEach(([partIdx, targetColumn]) => {
                    const partValue = parts[parseInt(partIdx)] || '';
                    // Actualizar mapeo si es necesario
                    if (!state.mapping[targetColumn]) {
                        state.mapping[targetColumn] = mappedColumn + '_part' + partIdx;
                    }
                    // Agregar o actualizar columna
                    newRow.push(partValue);
                });

                return newRow;
            });

            // Actualizar columnas disponibles
            Object.entries(transform.assignments).forEach(([partIdx, targetColumn]) => {
                if (!state.excelColumns.includes(mappedColumn + '_part' + partIdx)) {
                    state.excelColumns.push(mappedColumn + '_part' + partIdx);
                }
            });
        }

        // ==========================================
        // UNIR COLUMNAS
        // ==========================================

        function updateJoinPanel() {
            const joinColumnsDiv = document.getElementById('joinColumns');
            joinColumnsDiv.innerHTML = '';

            state.excelColumns.forEach(col => {
                const div = document.createElement('div');
                div.className = 'join-column';
                div.innerHTML = `
                    <input type="checkbox" id="join_${col}" value="${col}">
                    <label for="join_${col}">${col}</label>
                `;
                joinColumnsDiv.appendChild(div);
            });

            // Preview cuando cambian checkboxes
            joinColumnsDiv.addEventListener('change', updateJoinPreview);
            document.getElementById('joinSeparator').addEventListener('input', updateJoinPreview);
        }

        function updateJoinPreview() {
            const selected = Array.from(document.querySelectorAll('#joinColumns input:checked'))
                .map(cb => cb.value);
            
            const separator = document.getElementById('joinSeparator').value || ' ';
            
            if (selected.length < 2) {
                document.getElementById('joinPreview').innerHTML = 
                    '<p style="color: #999;">Selecciona al menos 2 columnas para unir</p>';
                return;
            }

            // Obtener datos de muestra
            const samples = selected.map(col => getSampleDataForColumn(col));
            const combined = samples[0].map((_, idx) => 
                selected.map((_, colIdx) => samples[colIdx][idx] || '').join(separator)
            );

            document.getElementById('joinPreview').innerHTML = combined.slice(0, 3).map((val, idx) => `
                <div class="preview-row">
                    ${selected.map((col, i) => `<span class="before">${samples[i][idx] || ''}</span>`).join(' + ')}
                    <br>→ <span class="after">"${val}"</span>
                </div>
            `).join('');
        }

        document.getElementById('applyJoin').addEventListener('click', () => {
            const selected = Array.from(document.querySelectorAll('#joinColumns input:checked'))
                .map(cb => cb.value);
            
            const separator = document.getElementById('joinSeparator').value || ' ';

            if (selected.length < 2) {
                alert('Debes seleccionar al menos 2 columnas para unir');
                return;
            }

            // Guardar transformación
            transformations[currentTransformColumn] = {
                type: 'join',
                columns: selected,
                separator
            };

            applyJoinTransformation(currentTransformColumn);
            
            document.getElementById('transformModal').style.display = 'none';
            alert('✅ Unión aplicada correctamente');
        });

        function applyJoinTransformation(columnName) {
            const transform = transformations[columnName];
            if (!transform || transform.type !== 'join') return;

            const indices = transform.columns.map(col => state.excelColumns.indexOf(col));
            
            state.excelData = state.excelData.map(row => {
                const values = indices.map(idx => row[idx] || '');
                const joined = values.join(transform.separator);
                
                const newRow = [...row];
                newRow.push(joined);
                return newRow;
            });

            // Agregar nueva columna
            const newColumnName = transform.columns.join('_');
            state.excelColumns.push(newColumnName);
            state.mapping[columnName] = newColumnName;
        }

        // ==========================================
        // TRANSFORMAR TEXTO
        // ==========================================

        let selectedTextTransform = null;

        document.querySelectorAll('.transform-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.transform-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                selectedTextTransform = this.dataset.transform;
                updateTextPreview();
            });
        });

        function updateTextPreview() {
            if (!selectedTextTransform) return;

            const sampleData = getSampleDataForColumn(currentTransformColumn);
            const transformed = sampleData.map(value => applyTextTransform(value, selectedTextTransform));

            document.getElementById('textPreview').innerHTML = transformed.slice(0, 3).map((val, idx) => `
                <div class="preview-row">
                    <span class="before">${sampleData[idx]}</span>
                    <br>→ <span class="after">${val}</span>
                </div>
            `).join('');
        }

        function applyTextTransform(text, transform) {
            if (!text) return text;

            switch(transform) {
                case 'uppercase':
                    return text.toUpperCase();
                case 'lowercase':
                    return text.toLowerCase();
                case 'capitalize':
                    return text.split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                case 'firstcap':
                    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
                default:
                    return text;
            }
        }

        document.getElementById('applyText').addEventListener('click', () => {
            if (!selectedTextTransform) {
                alert('Selecciona una transformación primero');
                return;
            }

            transformations[currentTransformColumn] = {
                type: 'text',
                transform: selectedTextTransform
            };

            applyTextTransformToData(currentTransformColumn);
            
            document.getElementById('transformModal').style.display = 'none';
            alert('✅ Transformación aplicada correctamente');
        });

        function applyTextTransformToData(columnName) {
            const transform = transformations[columnName];
            if (!transform || transform.type !== 'text') return;

            const mappedColumn = state.mapping[columnName];
            if (!mappedColumn) return;

            const columnIndex = state.excelColumns.indexOf(mappedColumn);
            if (columnIndex === -1) return;

            state.excelData = state.excelData.map(row => {
                const newRow = [...row];
                newRow[columnIndex] = applyTextTransform(row[columnIndex], transform.transform);
                return newRow;
            });
        }

        // ==========================================
        // LIMPIAR DATOS
        // ==========================================

        function updateCleanPreview() {
            const trim = document.getElementById('trimSpaces').checked;
            const extraSpaces = document.getElementById('removeExtraSpaces').checked;
            const special = document.getElementById('removeSpecialChars').checked;
            const accents = document.getElementById('removeAccents').checked;

            const sampleData = getSampleDataForColumn(currentTransformColumn);
            const cleaned = sampleData.map(value => 
                cleanText(value, {trim, extraSpaces, special, accents})
            );

            document.getElementById('cleanPreview').innerHTML = cleaned.slice(0, 3).map((val, idx) => `
                <div class="preview-row">
                    <span class="before">"${sampleData[idx]}"</span>
                    <br>→ <span class="after">"${val}"</span>
                </div>
            `).join('');
        }

        function cleanText(text, options) {
            if (!text) return text;
            let result = text;

            if (options.trim) {
                result = result.trim();
            }

            if (options.extraSpaces) {
                result = result.replace(/\s+/g, ' ');
            }

            if (options.special) {
                result = result.replace(/[^a-zA-Z0-9\s]/g, '');
            }

            if (options.accents) {
                const accentsMap = {
                    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
                    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
                    'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U'
                };
                result = result.replace(/[áéíóúÁÉÍÓÚñÑüÜ]/g, m => accentsMap[m] || m);
            }

            return result;
        }

        document.querySelectorAll('#panel-clean input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', updateCleanPreview);
        });

        document.getElementById('applyClean').addEventListener('click', () => {
            transformations[currentTransformColumn] = {
                type: 'clean',
                options: {
                    trim: document.getElementById('trimSpaces').checked,
                    extraSpaces: document.getElementById('removeExtraSpaces').checked,
                    special: document.getElementById('removeSpecialChars').checked,
                    accents: document.getElementById('removeAccents').checked
                }
            };

            applyCleanTransformToData(currentTransformColumn);
            
            document.getElementById('transformModal').style.display = 'none';
            alert('✅ Limpieza aplicada correctamente');
        });

        function applyCleanTransformToData(columnName) {
            const transform = transformations[columnName];
            if (!transform || transform.type !== 'clean') return;

            const mappedColumn = state.mapping[columnName];
            if (!mappedColumn) return;

            const columnIndex = state.excelColumns.indexOf(mappedColumn);
            if (columnIndex === -1) return;

            state.excelData = state.excelData.map(row => {
                const newRow = [...row];
                newRow[columnIndex] = cleanText(row[columnIndex], transform.options);
                return newRow;
            });
        }

        // Actualizar modal cuando se abre
        function initializeTransformModal() {
            // Actualizar panels según el producto y comando
            updateJoinPanel();
        }

        // Llamar cuando se haga click en transformar
        document.addEventListener('DOMContentLoaded', () => {
            // Listeners ya están configurados arriba
        });

        // Mostrar estado de transformaciones aplicadas
        function updateTransformStatus(columnName) {
            const statusDiv = document.getElementById(`transform-status-${columnName}`);
            if (!statusDiv) return;

            const transform = transformations[columnName];
            if (!transform) {
                statusDiv.innerHTML = '';
                return;
            }

            let statusText = '';
            switch(transform.type) {
                case 'split':
                    statusText = `✅ Dividida (${Object.keys(transform.assignments).length} partes)`;
                    break;
                case 'join':
                    statusText = `✅ Unida (${transform.columns.length} columnas)`;
                    break;
                case 'text':
                    statusText = `✅ Formato: ${transform.transform}`;
                    break;
                case 'clean':
                    const opts = Object.entries(transform.options).filter(([k,v]) => v).map(([k]) => k);
                    statusText = `✅ Limpieza (${opts.length} opciones)`;
                    break;
            }

            statusDiv.innerHTML = statusText;
        }
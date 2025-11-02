/**
 * Manim Visual Editor - UI模块
 * 负责用户界面交互、工具箱和属性面板
 */

/**
 * 初始化UI
 */
function initUI() {
    initToolbox();
    initPropertyPanel();
    initCanvasEvents();
    initKeyboardShortcuts();
    initToolbarButtons();
}

/**
 * 初始化工具箱
 */
function initToolbox() {
    const shapeToolsContainer = document.getElementById('shape-tools');
    
    // 为每个注册的形状创建按钮
    Object.values(ManimEditor.shapeRegistry).forEach(plugin => {
        const btn = document.createElement('button');
        btn.className = 'tool-btn';
        btn.setAttribute('data-shape-type', plugin.type);
        
        btn.innerHTML = `
            <span class="icon">${plugin.icon}</span>
            <span class="label">${plugin.name}</span>
        `;
        
        btn.addEventListener('click', () => {
            setDrawMode(plugin.type);
            
            // 更新按钮状态
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
        
        shapeToolsContainer.appendChild(btn);
    });
    
    // 选择模式按钮
    const selectBtn = document.getElementById('select-mode-btn');
    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            setSelectMode();
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            selectBtn.classList.add('active');
        });
    }
}

/**
 * 设置为选择模式
 */
function setSelectMode() {
    ManimEditor.mode = 'select';
    ManimEditor.currentShapeType = null;
    document.getElementById('canvas-container').classList.remove('draw-mode');
    document.getElementById('canvas-container').classList.add('select-mode');
}

/**
 * 设置为绘制模式
 */
function setDrawMode(shapeType) {
    ManimEditor.mode = 'draw';
    ManimEditor.currentShapeType = shapeType;
    document.getElementById('canvas-container').classList.add('draw-mode');
    document.getElementById('canvas-container').classList.remove('select-mode');
}

/**
 * 初始化画布事件
 */
function initCanvasEvents() {
    const canvas = document.getElementById('main-canvas');
    const coordDisplay = document.getElementById('coord-display');
    
    let dragElement = null;
    let dragOffset = { x: 0, y: 0 };
    
    // 鼠标移动 - 显示坐标
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
        
        coordDisplay.textContent = `Manim: (${manimCoord.x.toFixed(2)}, ${manimCoord.y.toFixed(2)})`;
        coordDisplay.classList.add('visible');
        
        // 拖拽元素
        if (dragElement) {
            const newManimCoord = {
                x: manimCoord.x - dragOffset.x,
                y: manimCoord.y - dragOffset.y
            };
            updateElement(dragElement.id, {
                x: newManimCoord.x,
                y: newManimCoord.y
            });
            
            // 更新属性面板
            if (ManimEditor.selectedElement?.id === dragElement.id) {
                updatePropertyPanel(dragElement);
            }
        }
        
        // 绘制模式下的临时预览
        if (ManimEditor.isDrawing && ManimEditor.tempElement) {
            updateTempElement(canvasX, canvasY);
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        coordDisplay.classList.remove('visible');
    });
    
    // 鼠标按下
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        if (ManimEditor.mode === 'select') {
            // 选择模式：选中或拖拽元素
            const element = findElementAtPoint(canvasX, canvasY);
            
            if (element) {
                ManimEditor.selectedElement = element;
                showPropertyPanel(element);
                
                // 开始拖拽
                const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
                dragElement = element;
                dragOffset = {
                    x: manimCoord.x - element.props.x,
                    y: manimCoord.y - element.props.y
                };
                
                render();
            } else {
                ManimEditor.selectedElement = null;
                hidePropertyPanel();
                render();
            }
        } else if (ManimEditor.mode === 'draw') {
            // 绘制模式：开始绘制新元素
            startDrawing(canvasX, canvasY);
        }
    });
    
    // 鼠标释放
    canvas.addEventListener('mouseup', (e) => {
        if (dragElement) {
            dragElement = null;
            dragOffset = { x: 0, y: 0 };
        }
        
        if (ManimEditor.isDrawing) {
            const rect = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            finishDrawing(canvasX, canvasY);
        }
    });
    
    // 双击编辑
    canvas.addEventListener('dblclick', (e) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const element = findElementAtPoint(canvasX, canvasY);
        
        if (element) {
            ManimEditor.selectedElement = element;
            showPropertyPanel(element);
            render();
        }
    });
}

/**
 * 开始绘制
 */
function startDrawing(canvasX, canvasY) {
    const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
    ManimEditor.isDrawing = true;
    ManimEditor.drawStart = { x: canvasX, y: canvasY, manimX: manimCoord.x, manimY: manimCoord.y };
    
    // 创建临时元素
    const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
    if (plugin && plugin.createDefault) {
        ManimEditor.tempElement = plugin.createDefault(manimCoord.x, manimCoord.y);
    }
}

/**
 * 更新临时元素
 */
function updateTempElement(canvasX, canvasY) {
    if (!ManimEditor.tempElement || !ManimEditor.drawStart) return;
    
    const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
    const startCoord = ManimEditor.drawStart;
    
    const type = ManimEditor.tempElement.type;
    
    // 根据形状类型更新临时元素
    if (type === 'square' || type === 'rectangle') {
        const width = Math.abs(manimCoord.x - startCoord.manimX);
        const height = Math.abs(manimCoord.y - startCoord.manimY);
        const centerX = (manimCoord.x + startCoord.manimX) / 2;
        const centerY = (manimCoord.y + startCoord.manimY) / 2;
        
        ManimEditor.tempElement.props.x = centerX;
        ManimEditor.tempElement.props.y = centerY;
        
        if (type === 'square') {
            ManimEditor.tempElement.props.size = Math.max(width, height);
        } else {
            ManimEditor.tempElement.props.width = width;
            ManimEditor.tempElement.props.height = height;
        }
    } else if (type === 'arrow' || type === 'line') {
        ManimEditor.tempElement.props.start = [startCoord.manimX, startCoord.manimY, 0];
        ManimEditor.tempElement.props.end = [manimCoord.x, manimCoord.y, 0];
    } else if (type === 'coordinateSystem') {
        // 坐标系在点击位置创建
        ManimEditor.tempElement.props.x = startCoord.manimX;
        ManimEditor.tempElement.props.y = startCoord.manimY;
    }
    
    render();
}

/**
 * 完成绘制
 */
function finishDrawing(canvasX, canvasY) {
    if (!ManimEditor.tempElement) {
        ManimEditor.isDrawing = false;
        return;
    }
    
    updateTempElement(canvasX, canvasY);
    
    // 添加元素到场景
    addElement(ManimEditor.tempElement);
    
    // 清理临时状态
    ManimEditor.tempElement = null;
    ManimEditor.isDrawing = false;
    ManimEditor.drawStart = null;
    
    render();
}

/**
 * 初始化属性面板
 */
function initPropertyPanel() {
    const closeBtn = document.getElementById('close-panel-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hidePropertyPanel);
    }
    
    // ESC键关闭面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hidePropertyPanel();
        }
    });
}

/**
 * 显示属性面板
 */
function showPropertyPanel(element) {
    const panel = document.getElementById('property-panel');
    const content = document.getElementById('property-content');
    
    panel.classList.remove('hidden');
    
    // 生成属性表单
    content.innerHTML = '';
    
    const plugin = ManimEditor.shapeRegistry[element.type];
    if (!plugin) return;
    
    // 通用属性
    addPropertyField(content, element, 'name', '名称', 'text');
    
    // 形状特定属性
    if (plugin.properties && plugin.properties.length > 0) {
        plugin.properties.forEach(prop => {
            addPropertyField(content, element, prop.key, prop.label, prop.type, prop.options);
        });
    } else {
        // 默认属性
        Object.keys(element.props).forEach(key => {
            if (key !== 'hidden') {
                const type = typeof element.props[key] === 'number' ? 'number' : 'text';
                addPropertyField(content, element, key, key, type);
            }
        });
    }
    
    // 隐藏选项
    addPropertyField(content, element, 'hidden', '隐藏（不导出）', 'checkbox');
}

/**
 * 添加属性字段
 */
function addPropertyField(container, element, key, label, type, options) {
    const group = document.createElement('div');
    group.className = 'property-group';
    
    const labelElem = document.createElement('label');
    labelElem.textContent = label;
    group.appendChild(labelElem);
    
    let input;
    
    if (type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        const value = key === 'hidden' ? element.props.hidden : element[key];
        input.checked = !!value;
    } else if (type === 'select' && options) {
        input = document.createElement('select');
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            input.appendChild(option);
        });
        const value = key in element.props ? element.props[key] : element[key];
        input.value = value;
    } else if (type === 'color') {
        input = document.createElement('input');
        input.type = 'color';
        const value = key in element.props ? element.props[key] : element[key];
        input.value = value || '#3498db';
    } else {
        input = document.createElement('input');
        input.type = type || 'text';
        
        // 处理数组属性
        let value;
        if (key.includes('[')) {
            const match = key.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const arrayKey = match[1];
                const index = parseInt(match[2]);
                value = element.props[arrayKey] ? element.props[arrayKey][index] : 0;
            }
        } else {
            value = key in element.props ? element.props[key] : element[key];
        }
        
        input.value = value !== undefined ? value : '';
        
        if (type === 'number') {
            input.step = '0.1';
        }
    }
    
    // 监听变化
    input.addEventListener('input', (e) => {
        let value = e.target.value;
        
        if (type === 'number') {
            value = parseFloat(value) || 0;
        } else if (type === 'checkbox') {
            value = e.target.checked;
        }
        
        if (key === 'name') {
            element.name = value;
        } else if (key === 'hidden') {
            element.props.hidden = value;
        } else if (key.includes('[')) {
            // 处理数组属性，例如 start[0], start[1]
            const match = key.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const arrayKey = match[1];
                const index = parseInt(match[2]);
                if (!element.props[arrayKey]) {
                    element.props[arrayKey] = [];
                }
                element.props[arrayKey][index] = value;
            }
        } else {
            element.props[key] = value;
        }
        
        render();
    });
    
    group.appendChild(input);
    container.appendChild(group);
}

/**
 * 更新属性面板
 */
function updatePropertyPanel(element) {
    if (ManimEditor.selectedElement?.id === element.id) {
        showPropertyPanel(element);
    }
}

/**
 * 隐藏属性面板
 */
function hidePropertyPanel() {
    const panel = document.getElementById('property-panel');
    panel.classList.add('hidden');
    ManimEditor.selectedElement = null;
    render();
}

/**
 * 初始化键盘快捷键
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Z: 撤销
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }
        
        // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y: 重做
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            redo();
        }
        
        // Delete: 删除选中元素
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (ManimEditor.selectedElement) {
                e.preventDefault();
                deleteSelectedElement();
            }
        }
        
        // Escape: 取消选择/关闭面板
        if (e.key === 'Escape') {
            setSelectMode();
            document.getElementById('select-mode-btn')?.classList.add('active');
        }
    });
}

/**
 * 初始化工具栏按钮
 */
function initToolbarButtons() {
    // 撤销/重做
    document.getElementById('undo-btn')?.addEventListener('click', undo);
    document.getElementById('redo-btn')?.addEventListener('click', redo);
    
    // 删除
    document.getElementById('delete-btn')?.addEventListener('click', deleteSelectedElement);
    
    // 导出Manim代码
    document.getElementById('export-btn')?.addEventListener('click', showExportModal);
    
    // 导出JSON
    document.getElementById('export-json-btn')?.addEventListener('click', exportJSONFile);
    
    // 导入JSON
    document.getElementById('import-json-btn')?.addEventListener('click', importJSONFile);
    
    // 关闭模态框
    document.getElementById('close-modal-btn')?.addEventListener('click', hideExportModal);
    document.getElementById('export-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'export-modal') {
            hideExportModal();
        }
    });
    
    // 复制代码
    document.getElementById('copy-code-btn')?.addEventListener('click', copyCode);
    
    // 下载代码
    document.getElementById('download-code-btn')?.addEventListener('click', downloadCode);
}

/**
 * 删除选中的元素
 */
function deleteSelectedElement() {
    if (ManimEditor.selectedElement) {
        deleteElement(ManimEditor.selectedElement.id);
        hidePropertyPanel();
    }
}

/**
 * 显示导出模态框
 */
function showExportModal() {
    const modal = document.getElementById('export-modal');
    const codeDisplay = document.getElementById('export-code-display');
    
    const code = generateManimCode();
    codeDisplay.textContent = code;
    
    modal.classList.remove('hidden');
}

/**
 * 隐藏导出模态框
 */
function hideExportModal() {
    document.getElementById('export-modal')?.classList.add('hidden');
}

/**
 * 复制代码
 */
function copyCode() {
    const codeDisplay = document.getElementById('export-code-display');
    const code = codeDisplay.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-code-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ 已复制';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('复制失败，请手动复制');
    });
}

/**
 * 下载代码
 */
function downloadCode() {
    const code = generateManimCode();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated_scene.py';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 导出JSON文件
 */
function exportJSONFile() {
    const data = exportToJSON();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manim_scene.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 导入JSON文件
 */
function importJSONFile() {
    const fileInput = document.getElementById('file-input');
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonData = JSON.parse(event.target.result);
                if (importFromJSON(jsonData)) {
                    alert('导入成功！');
                }
            } catch (err) {
                console.error('Failed to import:', err);
                alert('导入失败：文件格式不正确');
            }
        };
        reader.readAsText(file);
        
        // 重置文件输入
        fileInput.value = '';
    };
    
    fileInput.click();
}


/**
 * Manim Visual Editor - 核心模块
 * 负责画布管理、数据模型和形状插件系统
 */

// 全局应用状态
const ManimEditor = {
    // 画布相关
    canvas: null,
    ctx: null,
    
    // 数据存储
    elements: [],           // 所有元素
    selectedElement: null,  // 当前选中的元素
    
    // 形状插件注册表
    shapeRegistry: {},
    
    // 操作历史（撤销/重做）
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    
    // 编辑器状态
    mode: 'select',         // select | draw
    currentShapeType: null, // 当前绘制的形状类型
    
    // 画布视图参数
    viewOffset: { x: 0, y: 0 },
    zoom: 1,
    gridSize: 20,
    
    // 临时绘制状态
    isDrawing: false,
    drawStart: null,
    tempElement: null,
    
    // Manim坐标系参数（Y轴向上）
    canvasToManim: function(canvasX, canvasY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        return {
            x: (canvasX - centerX) / 50,  // 50像素 = 1 Manim单位
            y: (centerY - canvasY) / 50   // Y轴反转
        };
    },
    
    manimToCanvas: function(manimX, manimY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        return {
            x: centerX + manimX * 50,
            y: centerY - manimY * 50
        };
    },
    
    // 生成唯一ID
    generateId: function() {
        return 'elem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

/**
 * 注册形状插件
 * @param {Object} config - 插件配置对象
 */
function registerShape(config) {
    if (!config.type) {
        console.error('Shape plugin must have a type');
        return;
    }
    
    ManimEditor.shapeRegistry[config.type] = {
        type: config.type,
        name: config.name || config.type,
        icon: config.icon || '■',
        createDefault: config.createDefault,
        render: config.render,
        toManim: config.toManim,
        hitTest: config.hitTest || defaultHitTest,
        properties: config.properties || []
    };
    
    console.log(`Registered shape plugin: ${config.type}`);
}

/**
 * 默认的碰撞检测函数
 */
function defaultHitTest(element, x, y) {
    const props = element.props;
    const dx = x - props.x;
    const dy = y - props.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 50; // 默认50像素范围
}

/**
 * 初始化画布
 */
function initCanvas() {
    ManimEditor.canvas = document.getElementById('main-canvas');
    ManimEditor.ctx = ManimEditor.canvas.getContext('2d');
    
    // 设置画布大小
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 绘制初始画布
    render();
}

/**
 * 调整画布大小
 */
function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    ManimEditor.canvas.width = container.clientWidth;
    ManimEditor.canvas.height = container.clientHeight;
    render();
}

/**
 * 渲染整个场景
 */
function render() {
    const ctx = ManimEditor.ctx;
    const canvas = ManimEditor.canvas;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制坐标系原点标记
    drawOrigin(ctx, canvas);
    
    // 绘制所有元素
    ManimEditor.elements.forEach(element => {
        if (element.props.hidden) return;
        
        const plugin = ManimEditor.shapeRegistry[element.type];
        if (plugin && plugin.render) {
            ctx.save();
            plugin.render(ctx, element, ManimEditor);
            ctx.restore();
            
            // 如果是选中的元素，绘制选择框
            if (element.id === ManimEditor.selectedElement?.id) {
                drawSelectionBox(ctx, element);
            }
        }
    });
    
    // 绘制临时元素（正在绘制中）
    if (ManimEditor.tempElement) {
        const plugin = ManimEditor.shapeRegistry[ManimEditor.tempElement.type];
        if (plugin && plugin.render) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            plugin.render(ctx, ManimEditor.tempElement, ManimEditor);
            ctx.restore();
        }
    }
}

/**
 * 绘制坐标系原点
 */
function drawOrigin(ctx, canvas) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.stroke();
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
    
    // 原点标签
    ctx.fillStyle = '#e74c3c';
    ctx.font = '12px monospace';
    ctx.fillText('(0,0)', centerX + 5, centerY - 5);
}

/**
 * 绘制选择框
 */
function drawSelectionBox(ctx, element) {
    const props = element.props;
    const pos = ManimEditor.manimToCanvas(props.x, props.y);
    
    // 根据形状类型计算边界框
    let bounds = { x: pos.x - 30, y: pos.y - 30, w: 60, h: 60 };
    
    if (element.type === 'rectangle') {
        const w = (props.width || 2) * 50;
        const h = (props.height || 1) * 50;
        bounds = { x: pos.x - w/2, y: pos.y - h/2, w, h };
    } else if (element.type === 'square') {
        const size = (props.size || 1) * 50;
        bounds = { x: pos.x - size/2, y: pos.y - size/2, w: size, h: size };
    }
    
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.setLineDash([]);
    
    // 绘制控制点
    const handles = [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.w, y: bounds.y },
        { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
        { x: bounds.x, y: bounds.y + bounds.h }
    ];
    
    ctx.fillStyle = '#3498db';
    handles.forEach(handle => {
        ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
    });
}

/**
 * 添加元素
 */
function addElement(element) {
    element.id = element.id || ManimEditor.generateId();
    element.name = element.name || `${element.type}_${ManimEditor.elements.length + 1}`;
    ManimEditor.elements.push(element);
    saveToHistory();
    render();
    return element;
}

/**
 * 删除元素
 */
function deleteElement(elementId) {
    const index = ManimEditor.elements.findIndex(e => e.id === elementId);
    if (index !== -1) {
        ManimEditor.elements.splice(index, 1);
        if (ManimEditor.selectedElement?.id === elementId) {
            ManimEditor.selectedElement = null;
        }
        saveToHistory();
        render();
        return true;
    }
    return false;
}

/**
 * 更新元素属性
 */
function updateElement(elementId, newProps) {
    const element = ManimEditor.elements.find(e => e.id === elementId);
    if (element) {
        element.props = { ...element.props, ...newProps };
        saveToHistory();
        render();
        return true;
    }
    return false;
}

/**
 * 查找点击位置的元素
 */
function findElementAtPoint(x, y) {
    // 从后往前查找（后绘制的在上面）
    for (let i = ManimEditor.elements.length - 1; i >= 0; i--) {
        const element = ManimEditor.elements[i];
        const plugin = ManimEditor.shapeRegistry[element.type];
        
        if (plugin && plugin.hitTest) {
            const manimCoord = ManimEditor.canvasToManim(x, y);
            if (plugin.hitTest(element, manimCoord.x, manimCoord.y, ManimEditor)) {
                return element;
            }
        }
    }
    return null;
}

/**
 * 保存到历史记录
 */
function saveToHistory() {
    // 截断未来的历史
    if (ManimEditor.historyIndex < ManimEditor.history.length - 1) {
        ManimEditor.history = ManimEditor.history.slice(0, ManimEditor.historyIndex + 1);
    }
    
    // 保存当前状态
    const state = JSON.parse(JSON.stringify(ManimEditor.elements));
    ManimEditor.history.push(state);
    
    // 限制历史记录数量
    if (ManimEditor.history.length > ManimEditor.maxHistory) {
        ManimEditor.history.shift();
    } else {
        ManimEditor.historyIndex++;
    }
    
    // 更新按钮状态
    updateUndoRedoButtons();
    
    // 保存到localStorage
    saveToLocalStorage();
}

/**
 * 撤销
 */
function undo() {
    if (ManimEditor.historyIndex > 0) {
        ManimEditor.historyIndex--;
        ManimEditor.elements = JSON.parse(JSON.stringify(
            ManimEditor.history[ManimEditor.historyIndex]
        ));
        render();
        updateUndoRedoButtons();
    }
}

/**
 * 重做
 */
function redo() {
    if (ManimEditor.historyIndex < ManimEditor.history.length - 1) {
        ManimEditor.historyIndex++;
        ManimEditor.elements = JSON.parse(JSON.stringify(
            ManimEditor.history[ManimEditor.historyIndex]
        ));
        render();
        updateUndoRedoButtons();
    }
}

/**
 * 更新撤销/重做按钮状态
 */
function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) undoBtn.disabled = ManimEditor.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = ManimEditor.historyIndex >= ManimEditor.history.length - 1;
}

/**
 * 保存到localStorage
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem('manim-editor-scene', JSON.stringify({
            elements: ManimEditor.elements,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

/**
 * 从localStorage加载
 */
function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('manim-editor-scene');
        if (data) {
            const parsed = JSON.parse(data);
            if (parsed.elements && Array.isArray(parsed.elements)) {
                ManimEditor.elements = parsed.elements;
                saveToHistory();
                render();
                console.log('Loaded scene from localStorage');
            }
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }
}

/**
 * 清空场景
 */
function clearScene() {
    if (confirm('确定要清空整个场景吗？此操作不可撤销。')) {
        ManimEditor.elements = [];
        ManimEditor.selectedElement = null;
        ManimEditor.history = [];
        ManimEditor.historyIndex = -1;
        saveToHistory();
        render();
    }
}

/**
 * 导出为JSON
 */
function exportToJSON() {
    return {
        version: '1.0',
        elements: ManimEditor.elements,
        metadata: {
            created: new Date().toISOString(),
            elementCount: ManimEditor.elements.length
        }
    };
}

/**
 * 从JSON导入
 */
function importFromJSON(jsonData) {
    try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        if (data.elements && Array.isArray(data.elements)) {
            ManimEditor.elements = data.elements;
            ManimEditor.selectedElement = null;
            saveToHistory();
            render();
            return true;
        }
    } catch (e) {
        console.error('Failed to import JSON:', e);
        alert('导入失败：JSON格式不正确');
    }
    return false;
}


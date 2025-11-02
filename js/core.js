/**
 * Manim Visual Editor - 核心模块
 * 负责画布管理、数据模型和形状插件系统
 */

// 全局应用状态
const ManimEditor = {
    // 调试开关
    showHandleDebug: true,  // 显示控制点响应区域（调试用）
    
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
    mode: 'select',         // select | draw (默认为select模式)
    currentShapeType: null, // 当前绘制的形状类型
    
    // 画布视图参数
    viewOffset: { x: 0, y: 0 },
    zoom: 1,
    gridSize: 20,
    
    // 临时绘制状态
    isDrawing: false,
    drawStart: null,
    tempElement: null,
    
    // 曲线绘制状态
    curvePoints: [],       // 正在绘制的曲线控制点
    isCurveDrawing: false, // 是否正在绘制曲线
    
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
    
    // 绘制正在绘制中的曲线
    if (ManimEditor.isCurveDrawing && ManimEditor.curvePoints.length > 0) {
        drawCurvePreview(ctx, ManimEditor);
    }
    
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
 * 绘制坐标系原点和场景边界
 */
function drawOrigin(ctx, canvas) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 绘制Manim场景边界（默认16:9比例，宽14.22单位，高8单位）
    const sceneWidth = 14.22 * 50;  // 14.22 Manim单位
    const sceneHeight = 8 * 50;     // 8 Manim单位
    
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(
        centerX - sceneWidth / 2,
        centerY - sceneHeight / 2,
        sceneWidth,
        sceneHeight
    );
    ctx.setLineDash([]);
    
    // 绘制场景边界标签
    ctx.fillStyle = '#95a5a6';
    ctx.font = '12px monospace';
    ctx.fillText('Manim场景边界', centerX - sceneWidth / 2 + 10, centerY - sceneHeight / 2 + 20);
    
    // 绘制坐标轴（使用灰色，低调）
    ctx.strokeStyle = '#95a5a6';  // 改为灰色
    ctx.lineWidth = 1.5;
    
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
    
    // 原点标签（也改为灰色）
    ctx.fillStyle = '#95a5a6';
    ctx.font = '11px monospace';
    ctx.fillText('(0,0)', centerX + 5, centerY - 5);
}

/**
 * 绘制曲线绘制预览
 */
function drawCurvePreview(ctx, editor) {
    const points = editor.curvePoints;
    const previewPoint = editor.curvePreviewPoint;
    
    ctx.strokeStyle = '#9b59b6';
    ctx.fillStyle = '#9b59b6';
    ctx.lineWidth = 2;
    
    // 绘制已放置的点
    points.forEach((point, index) => {
        const canvasPoint = editor.manimToCanvas(point[0], point[1]);
        
        // 绘制点
        ctx.beginPath();
        ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制标签
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px monospace';
        ctx.fillText(`P${index}`, canvasPoint.x + 10, canvasPoint.y - 10);
        ctx.fillStyle = '#9b59b6';
    });
    
    // 绘制连接线
    if (points.length > 1) {
        ctx.strokeStyle = '#bdc3c7';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const firstPoint = editor.manimToCanvas(points[0][0], points[0][1]);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < points.length; i++) {
            const p = editor.manimToCanvas(points[i][0], points[i][1]);
            ctx.lineTo(p.x, p.y);
        }
        if (previewPoint) {
            const preview = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
            ctx.lineTo(preview.x, preview.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // 绘制预览点
    if (previewPoint && points.length < 4) {
        const canvasPoint = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // 标签
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '12px monospace';
        ctx.fillText(`P${points.length}`, canvasPoint.x + 10, canvasPoint.y - 10);
    }
    
    // 绘制已有的曲线预览
    if (points.length >= 2) {
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        
        const tempPoints = [...points];
        if (previewPoint && points.length < 4) {
            tempPoints.push(previewPoint);
        }
        
        // 补全4个点（用于预览）
        while (tempPoints.length < 4) {
            tempPoints.push(tempPoints[tempPoints.length - 1]);
        }
        
        drawBezierCurve(ctx, tempPoints, editor);
        ctx.globalAlpha = 1;
    }
    
    // 显示提示信息
    ctx.fillStyle = '#2c3e50';
    ctx.font = '14px sans-serif';
    const messages = [
        '点击放置起点 P0',
        '点击放置控制点 P1',
        '点击放置控制点 P2',
        '点击放置终点 P3'
    ];
    ctx.fillText(messages[points.length] || '曲线完成', 20, editor.canvas.height - 20);
}

/**
 * 绘制贝塞尔曲线
 */
function drawBezierCurve(ctx, points, editor) {
    if (points.length < 2) return;
    
    const p0 = editor.manimToCanvas(points[0][0], points[0][1]);
    const p1 = editor.manimToCanvas(points[1][0], points[1][1]);
    const p2 = points.length > 2 ? editor.manimToCanvas(points[2][0], points[2][1]) : p1;
    const p3 = points.length > 3 ? editor.manimToCanvas(points[3][0], points[3][1]) : p2;
    
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.stroke();
}

/**
 * 绘制选择框
 */
function drawSelectionBox(ctx, element) {
    const props = element.props;
    let bounds;
    
    // 根据形状类型计算边界框
    if (element.type === 'rectangle') {
        const pos = ManimEditor.manimToCanvas(props.x, props.y);
        const w = (props.width || 2) * 50;
        const h = (props.height || 1) * 50;
        bounds = { x: pos.x - w/2, y: pos.y - h/2, w, h };
    } else if (element.type === 'square') {
        const pos = ManimEditor.manimToCanvas(props.x, props.y);
        const size = (props.size || 1) * 50;
        bounds = { x: pos.x - size/2, y: pos.y - size/2, w: size, h: size };
    } else if (element.type === 'arrow' || element.type === 'line') {
        // 线条和箭头：计算起点终点的包围盒
        const start = ManimEditor.manimToCanvas(props.start[0], props.start[1]);
        const end = ManimEditor.manimToCanvas(props.end[0], props.end[1]);
        const minX = Math.min(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxX = Math.max(start.x, end.x);
        const maxY = Math.max(start.y, end.y);
        const padding = 10;
        bounds = { 
            x: minX - padding, 
            y: minY - padding, 
            w: maxX - minX + padding * 2, 
            h: maxY - minY + padding * 2 
        };
    } else if (element.type === 'curve') {
        // 曲线：计算所有控制点的包围盒
        const points = props.points || [];
        if (points.length > 0) {
            const canvasPoints = points.map(p => ManimEditor.manimToCanvas(p[0], p[1]));
            const minX = Math.min(...canvasPoints.map(p => p.x));
            const minY = Math.min(...canvasPoints.map(p => p.y));
            const maxX = Math.max(...canvasPoints.map(p => p.x));
            const maxY = Math.max(...canvasPoints.map(p => p.y));
            const padding = 10;
            bounds = { 
                x: minX - padding, 
                y: minY - padding, 
                w: maxX - minX + padding * 2, 
                h: maxY - minY + padding * 2 
            };
        } else {
            const pos = ManimEditor.manimToCanvas(props.x || 0, props.y || 0);
            bounds = { x: pos.x - 30, y: pos.y - 30, w: 60, h: 60 };
        }
    } else if (element.type === 'coordinateSystem') {
        const pos = ManimEditor.manimToCanvas(props.x, props.y);
        const w = (props.x_length || 6) * 50;
        const h = (props.y_length || 6) * 50;
        bounds = { x: pos.x - w/2, y: pos.y - h/2, w, h };
    } else {
        // 默认
        const pos = ManimEditor.manimToCanvas(props.x || 0, props.y || 0);
        bounds = { x: pos.x - 30, y: pos.y - 30, w: 60, h: 60 };
    }
    
    // 绘制虚线框
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.setLineDash([]);
    
    // 绘制缩放控制点（手柄）
    const handles = [
        { x: bounds.x, y: bounds.y, corner: 'topLeft' },
        { x: bounds.x + bounds.w, y: bounds.y, corner: 'topRight' },
        { x: bounds.x + bounds.w, y: bounds.y + bounds.h, corner: 'bottomRight' },
        { x: bounds.x, y: bounds.y + bounds.h, corner: 'bottomLeft' }
    ];
    
    // 绘制手柄
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
    
    // 调试：绘制响应区域（虚线框）
    if (ManimEditor.showHandleDebug) {
        const outerSize = 16;
        const innerSize = 8;
        
        ctx.strokeStyle = '#e74c3c';  // 红色
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        
        handles.forEach(handle => {
            let minX, maxX, minY, maxY;
            
            // 计算响应区域（与findControlPoint中的逻辑一致）
            if (handle.corner === 'topLeft') {
                minX = handle.x - outerSize;
                maxX = handle.x + innerSize;
                minY = handle.y - outerSize;
                maxY = handle.y + innerSize;
            } else if (handle.corner === 'topRight') {
                minX = handle.x - innerSize;
                maxX = handle.x + outerSize;
                minY = handle.y - outerSize;
                maxY = handle.y + innerSize;
            } else if (handle.corner === 'bottomRight') {
                minX = handle.x - innerSize;
                maxX = handle.x + outerSize;
                minY = handle.y - innerSize;
                maxY = handle.y + outerSize;
            } else { // bottomLeft
                minX = handle.x - outerSize;
                maxX = handle.x + innerSize;
                minY = handle.y - innerSize;
                maxY = handle.y + outerSize;
            }
            
            // 绘制响应区域矩形
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
            
            // 绘制中心十字
            ctx.strokeStyle = '#f39c12';
            ctx.beginPath();
            ctx.moveTo(handle.x - 4, handle.y);
            ctx.lineTo(handle.x + 4, handle.y);
            ctx.moveTo(handle.x, handle.y - 4);
            ctx.lineTo(handle.x, handle.y + 4);
            ctx.stroke();
        });
        
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
    }
    
    // 为曲线额外绘制控制线和控制点（已在curve.js中处理）
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
 * 四舍五入保留指定小数位
 */
function roundToDecimals(num, decimals = 2) {
    if (typeof num !== 'number') return num;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * 递归处理对象，将所有数字四舍五入
 */
function roundNumbersInObject(obj, decimals = 2) {
    if (typeof obj === 'number') {
        return roundToDecimals(obj, decimals);
    } else if (Array.isArray(obj)) {
        return obj.map(item => roundNumbersInObject(item, decimals));
    } else if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                result[key] = roundNumbersInObject(obj[key], decimals);
            }
        }
        return result;
    }
    return obj;
}

/**
 * 导出为JSON
 */
function exportToJSON() {
    // 深拷贝elements并四舍五入所有数字
    const roundedElements = roundNumbersInObject(ManimEditor.elements, 2);
    
    return {
        version: '1.0',
        elements: roundedElements,
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


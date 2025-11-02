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
    elements: [],           // 所有元素（按 z_order 排序）
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
    
    // 通用绘制状态（插件化v2.1）
    drawingState: null,  // 插件自定义的绘制状态
    previewPoint: null,  // 鼠标预览点
    
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
    },
    
    // ═══════════════════════════════════════════
    // 缩放辅助函数（插件系统）
    // ═══════════════════════════════════════════
    scaleHelpers: {
        /**
         * 获取固定点（对角点）的Manim坐标
         */
        getFixedPoint: function(corner, center, width, height) {
            const halfW = width / 2;
            const halfH = height / 2;
            
            const fixedPoints = {
                'topLeft': { x: center.x + halfW, y: center.y - halfH },
                'topRight': { x: center.x - halfW, y: center.y - halfH },
                'bottomRight': { x: center.x - halfW, y: center.y + halfH },
                'bottomLeft': { x: center.x + halfW, y: center.y + halfH }
            };
            
            return fixedPoints[corner];
        },
        
        /**
         * 计算新角位置的Manim坐标
         */
        getNewCornerPosition: function(corner, fixedPoint, newWidth, newHeight) {
            const positions = {
                'topLeft': { 
                    x: fixedPoint.x - newWidth, 
                    y: fixedPoint.y + newHeight 
                },
                'topRight': { 
                    x: fixedPoint.x + newWidth, 
                    y: fixedPoint.y + newHeight 
                },
                'bottomRight': { 
                    x: fixedPoint.x + newWidth, 
                    y: fixedPoint.y - newHeight 
                },
                'bottomLeft': { 
                    x: fixedPoint.x - newWidth, 
                    y: fixedPoint.y - newHeight 
                }
            };
            
            return positions[corner];
        },
        
        /**
         * 保持宽高比
         */
        maintainAspectRatio: function(newWidth, newHeight, originalWidth, originalHeight) {
            const originalRatio = originalWidth / originalHeight;
            const scaleW = newWidth / originalWidth;
            const scaleH = newHeight / originalHeight;
            const scale = Math.max(scaleW, scaleH);
            
            return {
                width: originalWidth * scale,
                height: originalHeight * scale,
                scale: scale
            };
        }
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
    
    // 插件化v2.0：复制所有配置项（而不是只复制部分）
    ManimEditor.shapeRegistry[config.type] = {
        // 基础信息
        type: config.type,
        name: config.name || config.type,
        icon: config.icon || '■',
        version: config.version || '1.0.0',
        
        // 必需方法
        createDefault: config.createDefault,
        render: config.render,
        toManim: config.toManim,
        hitTest: config.hitTest || defaultHitTest,
        
        // v2.0新增方法
        getBounds: config.getBounds,
        handleScale: config.handleScale,
        handleMove: config.handleMove,
        getMoveAnchor: config.getMoveAnchor,  // v2.1新增
        updateWhileDrawing: config.updateWhileDrawing,
        getControlPoints: config.getControlPoints,
        updateControlPoint: config.updateControlPoint,
        
        // v2.1新增：点击式绘制支持
        onDrawClick: config.onDrawClick,
        onDrawDoubleClick: config.onDrawDoubleClick,
        renderDrawingPreview: config.renderDrawingPreview,
        
        // 配置
        properties: config.properties || [],
        capabilities: config.capabilities || {},
        drawMode: config.drawMode || 'drag',
        
        // 导出相关
        toJSON: config.toJSON,
        fromJSON: config.fromJSON
    };
    
    console.log(`Registered shape plugin: ${config.type} v${config.version || '1.0.0'}`);
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
    
    // 初始化元素顺序
    updateElementsOrder();
    
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
 * 更新元素顺序（按 z_order 排序）
 * 只在添加/删除/修改 z_order 时调用
 */
function updateElementsOrder() {
    // 直接排序 elements 数组（ES2019+ 稳定排序）
    // 稳定性：相同 z_order 的元素保持原有顺序（按添加时间）
    ManimEditor.elements.sort((a, b) => {
        const zOrderA = a.props.z_order !== undefined ? a.props.z_order : 0;
        const zOrderB = b.props.z_order !== undefined ? b.props.z_order : 0;
        return zOrderA - zOrderB;  // 稳定排序：小 → 大
    });
    console.log('[Performance] Elements reordered by z_order');
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
    
    // 绘制所有元素（elements 已按 z_order 排序）
    ManimEditor.elements.forEach(element => {
        // 不要跳过hidden元素！让插件的setRenderOpacity处理透明度
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
    
    // 插件化v2.1：绘制预览（支持点击式绘制）
    if (ManimEditor.currentShapeType && ManimEditor.drawingState) {
        const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
        console.log(`[render] 绘制预览: type=${ManimEditor.currentShapeType}, hasPreview=${!!plugin?.renderDrawingPreview}`);
        if (plugin && plugin.renderDrawingPreview) {
            ctx.save();
            plugin.renderDrawingPreview(ctx, ManimEditor.drawingState, ManimEditor);
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

// ═══════════════════════════════════════════
// 注意：drawCurvePreview和drawBezierCurve已移除
// 原因：这是curve插件特有的逻辑，不应该在框架层
// curve的点击式绘制应该通过插件接口实现
// ═══════════════════════════════════════════

/**
 * 绘制选择框 - 调用插件方法（插件化v2.0）
 */
function drawSelectionBox(ctx, element) {
    // 关键修复：使用插件的getBounds方法！
    const plugin = ManimEditor.shapeRegistry[element.type];
    let bounds;
    
    if (plugin && plugin.getBounds) {
        bounds = plugin.getBounds(element, ManimEditor);
    }
    
    // 如果插件未提供getBounds或返回null，使用默认
    if (!bounds) {
        console.warn(`drawSelectionBox: 未找到${element.type}的bounds，使用默认`);
        const pos = ManimEditor.manimToCanvas(element.props.x || 0, element.props.y || 0);
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
    updateElementsOrder();  // 重新排序
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
        console.log('[updateElement] Before:', JSON.stringify(element.props));
        console.log('[updateElement] newProps:', JSON.stringify(newProps));
        
        const oldZOrder = element.props.z_order;
        element.props = { ...element.props, ...newProps };
        
        console.log('[updateElement] After:', JSON.stringify(element.props));
        
        // 只有 z_order 变化时才更新排序缓存（性能优化）
        const newZOrder = element.props.z_order;
        if (oldZOrder !== newZOrder) {
            console.log('[updateElement] z_order changed, reordering elements');
            updateElementsOrder();
        }
        
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
    // 从上层往下层查找（反向遍历，z_order 从大到小）
    // elements 已按 z_order 从小到大排序，反向遍历即从大到小
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
        updateElementsOrder();  // 重新排序
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
        updateElementsOrder();  // 重新排序
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
                // 数据升级：让每个插件负责升级自己的属性
                ManimEditor.elements = parsed.elements.map(element => {
                    const plugin = ManimEditor.shapeRegistry[element.type];
                    if (plugin && plugin.onUpgrade) {
                        // 插件定义了升级方法，调用它
                        element.props = plugin.onUpgrade(element.props);
                        console.log(`[Data Migration] ${element.type} upgraded`);
                    }
                    return element;
                });
                updateElementsOrder();  // 更新排序缓存
                saveToHistory();
                render();
                console.log('Loaded scene from localStorage (with data upgrade)');
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
            // 数据升级：让每个插件负责升级自己的属性
            ManimEditor.elements = data.elements.map(element => {
                const plugin = ManimEditor.shapeRegistry[element.type];
                if (plugin && plugin.onUpgrade) {
                    // 插件定义了升级方法，调用它
                    element.props = plugin.onUpgrade(element.props);
                    console.log(`[Data Migration] ${element.type} upgraded`);
                }
                return element;
            });
            updateElementsOrder();  // 更新排序缓存
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


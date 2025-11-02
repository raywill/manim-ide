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
        btn.setAttribute('data-tooltip', plugin.name);  // 用于hover提示
        btn.setAttribute('title', plugin.name);  // 浏览器原生tooltip（备用）
        
        btn.innerHTML = `
            <span class="icon">${plugin.icon}</span>
            <span class="label">${plugin.name}</span>
        `;
        
        btn.addEventListener('click', () => {
            if (ManimEditor.mode === 'draw' && ManimEditor.currentShapeType === plugin.type) {
                // 如果已经是绘制此形状模式，则切换回选择模式
                setSelectMode();
                btn.classList.remove('active');
            } else {
                // 切换到绘制模式
                setDrawMode(plugin.type);
                
                // 更新按钮状态
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
        
        shapeToolsContainer.appendChild(btn);
    });
}

/**
 * 设置为选择模式
 */
function setSelectMode() {
    ManimEditor.mode = 'select';
    ManimEditor.currentShapeType = null;
    
    // 取消绘制状态（通用）
    ManimEditor.drawingState = null;
    ManimEditor.previewPoint = null;
    
    document.getElementById('canvas-container').classList.remove('draw-mode');
    document.getElementById('canvas-container').classList.add('select-mode');
    
    render();
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
    let isDragging = false;
    let isShiftPressed = false;
    
    // 鼠标移动 - 显示坐标
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
        
        // 坐标显示 + 模式提示
        let displayText = `Manim: (${manimCoord.x.toFixed(2)}, ${manimCoord.y.toFixed(2)})`;
        
        // 如果在绘制模式，显示提示
        if (ManimEditor.mode === 'draw') {
            const shapeName = ManimEditor.shapeRegistry[ManimEditor.currentShapeType]?.name || '图形';
            if (ManimEditor.drawingState) {
                // 点击式绘制中
                displayText += ` | 正在绘制${shapeName}（双击完成，ESC取消）`;
            } else {
                // 准备绘制
                displayText += ` | ${shapeName}绘制模式（ESC退出）`;
            }
        } else if (ManimEditor.selectedElement) {
            // 选中元素时
            displayText += ` | 按ESC取消选择`;
        }
        
        coordDisplay.textContent = displayText;
        coordDisplay.classList.add('visible');
        
        // 拖拽元素或控制点
        if (dragElement && isDragging) {
            if (dragOffset.type === 'curvePoint') {
                // 拖动控制点（严格插件化）
                const plugin = ManimEditor.shapeRegistry[dragElement.type];
                if (!plugin || !plugin.updateControlPoint) {
                    console.error(`插件 ${dragElement.type} 未实现 updateControlPoint()`);
                    return;
                }
                const cps = plugin.getControlPoints ? plugin.getControlPoints(dragElement, ManimEditor) : [];
                const pointId = cps && cps[dragOffset.index] ? cps[dragOffset.index].id : dragOffset.index;
                const newProps = plugin.updateControlPoint(dragElement, pointId, manimCoord.x, manimCoord.y, ManimEditor);
                if (newProps && typeof newProps === 'object') {
                    updateElement(dragElement.id, newProps);
                }
            } else if (dragOffset.type === 'scaleHandle') {
                // 拖动缩放手柄
                handleScaleDrag(dragElement, dragOffset, manimCoord);
            } else if (dragOffset.type === 'move') {
                // 移动元素 - 调用插件方法
                const plugin = ManimEditor.shapeRegistry[dragElement.type];
                
                if (plugin && plugin.handleMove) {
                    // 准备移动信息
                    // 对于有lastX/lastY的（arrow/line/curve），使用增量方式
                    // 对于普通的，使用offset方式
                    const moveInfo = {
                        currentPoint: manimCoord,
                        offset: { x: dragOffset.x, y: dragOffset.y }
                    };
                    
                    // 计算增量（for arrow/line/curve）
                    if (dragOffset.lastX !== undefined) {
                        const dx = manimCoord.x - dragOffset.x;
                        const dy = manimCoord.y - dragOffset.y;
                        moveInfo.deltaX = dx - dragOffset.lastX;
                        moveInfo.deltaY = dy - dragOffset.lastY;
                    }
                    
                    const newProps = plugin.handleMove(dragElement, moveInfo, ManimEditor);
                    updateElement(dragElement.id, newProps);
                    
                    // 更新lastX/lastY
                    if (dragOffset.lastX !== undefined) {
                        dragOffset.lastX = manimCoord.x - dragOffset.x;
                        dragOffset.lastY = manimCoord.y - dragOffset.y;
                    }
                } else {
                    // 默认：移动中心点
                    updateElement(dragElement.id, {
                        x: manimCoord.x - dragOffset.x,
                        y: manimCoord.y - dragOffset.y
                    });
                }
            }
            
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
        const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
        
        // 检查是否点击了元素
        const clickedElement = findElementAtPoint(canvasX, canvasY);
        
        // ═══════════════════════════════════════════
        // 优先级1：如果有选中的元素，检查它的控制点
        // ═══════════════════════════════════════════
        if (ManimEditor.selectedElement) {
            const controlPoint = findControlPoint(canvasX, canvasY, ManimEditor.selectedElement);
            
            if (controlPoint) {
                // 点击了选中元素的控制点，准备调整
                const element = ManimEditor.selectedElement;
                dragElement = element;
                isDragging = true;
                
                if (controlPoint.type === 'curvePoint') {
                    dragOffset = {
                        type: 'curvePoint',
                        index: controlPoint.index,
                        startX: manimCoord.x,
                        startY: manimCoord.y,
                        originalProps: JSON.parse(JSON.stringify(element.props))
                    };
                } else if (controlPoint.type === 'scaleHandle') {
                    // 缩放手柄
                    const originalProps = JSON.parse(JSON.stringify(element.props));
                    
                    // 关键修复：在mousedown时就计算并缓存fixedPoint
                    const fixedPoint = calculateFixedPoint(element, controlPoint.corner, originalProps);
                    
                    dragOffset = {
                        type: 'scaleHandle',
                        corner: controlPoint.corner,
                        startX: manimCoord.x,
                        startY: manimCoord.y,
                        originalProps: originalProps,
                        fixedPoint: fixedPoint  // 在mousedown时就缓存！
                    };
                    console.log(`准备缩放: corner=${controlPoint.corner}, fixedPoint=`, fixedPoint);
                    
                    // 调试日志
                    if (window.debugScale) {
                        window.debugScale.log('mousedown', { fixedPoint, corner: controlPoint.corner });
                    }
                }
                
                render();
                return;
            }
            
            // 如果点击了选中的元素本身（不是控制点），准备移动
            if (clickedElement && clickedElement.id === ManimEditor.selectedElement.id) {
                dragElement = clickedElement;
                isDragging = true;
                
                // 插件化：调用插件方法获取移动锚点
                const plugin = ManimEditor.shapeRegistry[clickedElement.type];
                const anchor = plugin && plugin.getMoveAnchor ? plugin.getMoveAnchor(clickedElement) : null;
                
                if (anchor === null) {
                    // null表示使用增量移动（arrow/line/curve）
                    dragOffset = {
                        type: 'move',
                        x: manimCoord.x,
                        y: manimCoord.y,
                        lastX: 0,
                        lastY: 0
                    };
                } else {
                    // 使用锚点移动（rectangle/square/circle/parabola等）
                    dragOffset = {
                        type: 'move',
                        x: manimCoord.x - anchor.x,
                        y: manimCoord.y - anchor.y
                    };
                }
                
                render();
                return;
            }
        }
        
        // ═══════════════════════════════════════════
        // 优先级2：如果在绘制模式，优先绘制（即使点击在其他元素上）
        // ═══════════════════════════════════════════
        if (ManimEditor.mode === 'draw') {
            // 根据插件的drawMode决定绘制方式
            const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
            const drawMode = plugin?.drawMode || 'drag';
            
            console.log(`[mousedown绘制] type=${ManimEditor.currentShapeType}, drawMode=${drawMode}`);
            
            if (drawMode === 'multiClick' || drawMode === 'click') {
                // 点击式绘制（通用）
                handleClickDrawing(canvasX, canvasY);
            } else {
                // 拖动式绘制
                startDrawing(canvasX, canvasY);
            }
            return;
        }
        
        // ═══════════════════════════════════════════
        // 优先级3：选择模式下，选中点击的元素
        // ═══════════════════════════════════════════
        if (clickedElement) {
            // 选中新元素
            ManimEditor.selectedElement = clickedElement;
            showPropertyPanel(clickedElement);
            
            // 准备拖拽
            dragElement = clickedElement;
            isDragging = true;
            
            // 插件化：调用插件方法获取移动锚点
            const plugin = ManimEditor.shapeRegistry[clickedElement.type];
            const anchor = plugin && plugin.getMoveAnchor ? plugin.getMoveAnchor(clickedElement) : null;
            
            if (anchor === null) {
                // null表示使用增量移动
                dragOffset = {
                    type: 'move',
                    x: manimCoord.x,
                    y: manimCoord.y,
                    lastX: 0,
                    lastY: 0
                };
            } else {
                // 使用锚点移动
                dragOffset = {
                    type: 'move',
                    x: manimCoord.x - anchor.x,
                    y: manimCoord.y - anchor.y
                };
            }
            
            render();
        } else {
            // 点击空白处，取消选择
            ManimEditor.selectedElement = null;
            hidePropertyPanel();
            render();
        }
    });
    
    // 鼠标释放
    canvas.addEventListener('mouseup', (e) => {
        // 调试日志
        if (window.debugScale && dragOffset && dragOffset.type === 'scaleHandle') {
            window.debugScale.log('mouseup', {});
        }
        
        if (dragElement) {
            dragElement = null;
            dragOffset = { x: 0, y: 0 };
            isDragging = false;
        }
        
        if (ManimEditor.isDrawing) {
            const rect = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            finishDrawing(canvasX, canvasY);
        }
    });
    
    // 双击编辑或完成绘制
    canvas.addEventListener('dblclick', (e) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // 如果在点击式绘制，双击完成
        if (ManimEditor.mode === 'draw' && ManimEditor.drawingState) {
            console.log('双击完成绘制');
            finishClickDrawing();
            return;
        }
        
        // 否则是双击编辑
        const element = findElementAtPoint(canvasX, canvasY);
        if (element) {
            ManimEditor.selectedElement = element;
            showPropertyPanel(element);
            render();
        }
    });
    
    // 鼠标移动时更新绘制预览
    canvas.addEventListener('mousemove', (e) => {
        if (ManimEditor.drawingState && ManimEditor.drawingState.points) {
            const rect = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
            
            // 更新预览点（通用）
            ManimEditor.previewPoint = [manimCoord.x, manimCoord.y, 0];
            render();
        }
    });
}

/**
 * 查找点击位置的控制点
 */
function findControlPoint(canvasX, canvasY, element) {
    const outerSize = 16; // 向外侧扩展（像素）
    const innerSize = 8;  // 向内侧扩展（像素）
    
    // 插件化：检查插件自定义的控制点
    const plugin = ManimEditor.shapeRegistry[element.type];
    if (plugin && plugin.getControlPoints) {
        const controlPoints = plugin.getControlPoints(element, ManimEditor);
        
        if (controlPoints && controlPoints.length > 0) {
            const threshold = 12;
            
            for (let i = 0; i < controlPoints.length; i++) {
                const point = controlPoints[i];
                const canvasPoint = ManimEditor.manimToCanvas(point.x, point.y);
                const distance = Math.sqrt(
                    Math.pow(canvasX - canvasPoint.x, 2) +
                    Math.pow(canvasY - canvasPoint.y, 2)
                );
                
                if (distance <= threshold) {
                    console.log(`检测到控制点: ${point.id}, 距离=${distance.toFixed(1)}px`);
                    return { type: 'curvePoint', index: i };
                }
            }
        }
    }
    
    // 检查缩放手柄（所有图形都支持，包括曲线）
    const bounds = getElementBounds(element);
    if (bounds) {
        const handles = [
            { x: bounds.x, y: bounds.y, corner: 'topLeft' },
            { x: bounds.x + bounds.w, y: bounds.y, corner: 'topRight' },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h, corner: 'bottomRight' },
            { x: bounds.x, y: bounds.y + bounds.h, corner: 'bottomLeft' }
        ];
        
        // 使用矩形区域检测，向外侧扩展更多
        for (let handle of handles) {
                let minX, maxX, minY, maxY;
                
                // 根据角的位置，向外侧扩展更多，向内侧扩展较少
                if (handle.corner === 'topLeft') {
                    // 左上：向左和向上扩展多，向右和向下扩展少
                    minX = handle.x - outerSize;  // 向左（外）
                    maxX = handle.x + innerSize;  // 向右（内）
                    minY = handle.y - outerSize;  // 向上（外）
                    maxY = handle.y + innerSize;  // 向下（内）
                } else if (handle.corner === 'topRight') {
                    // 右上：向右和向上扩展多，向左和向下扩展少
                    minX = handle.x - innerSize;  // 向左（内）
                    maxX = handle.x + outerSize;  // 向右（外）
                    minY = handle.y - outerSize;  // 向上（外）
                    maxY = handle.y + innerSize;  // 向下（内）
                } else if (handle.corner === 'bottomRight') {
                    // 右下：向右和向下扩展多，向左和向上扩展少
                    minX = handle.x - innerSize;  // 向左（内）
                    maxX = handle.x + outerSize;  // 向右（外）
                    minY = handle.y - innerSize;  // 向上（内）
                    maxY = handle.y + outerSize;  // 向下（外）
                } else { // bottomLeft
                    // 左下：向左和向下扩展多，向右和向上扩展少
                    minX = handle.x - outerSize;  // 向左（外）
                    maxX = handle.x + innerSize;  // 向右（内）
                    minY = handle.y - innerSize;  // 向上（内）
                    maxY = handle.y + outerSize;  // 向下（外）
                }
                
            // 检查鼠标是否在响应区域内
            if (canvasX >= minX && canvasX <= maxX && 
                canvasY >= minY && canvasY <= maxY) {
                console.log(`检测到缩放手柄: ${handle.corner}, 鼠标=(${canvasX.toFixed(0)}, ${canvasY.toFixed(0)}), 手柄=(${handle.x.toFixed(0)}, ${handle.y.toFixed(0)})`);
                return { type: 'scaleHandle', corner: handle.corner };
            }
        }
    }
    
    return null;
}

/**
 * 获取元素的边界框（画布坐标）- 调用插件方法
 */
function getElementBounds(element) {
    const plugin = ManimEditor.shapeRegistry[element.type];
    
    if (plugin && plugin.getBounds) {
        return plugin.getBounds(element, ManimEditor);
    }
    
    // 如果插件未实现getBounds，返回null
    console.warn(`插件 ${element.type} 未实现 getBounds 方法`);
    return null;
}

/**
 * 处理缩放拖拽 - 调用插件方法（插件化v2.0）
 */
function handleScaleDrag(element, dragOffset, currentCoord) {
    const plugin = ManimEditor.shapeRegistry[element.type];
    
    if (!plugin) {
        console.error(`未找到插件: ${element.type}`);
        return;
    }
    
    const corner = dragOffset.corner;
    const isShift = window.isShiftPressed || false;
    
    // 准备缩放信息（fixedPoint已在mousedown时缓存）
    const scaleInfo = {
        corner: corner,
        fixedPoint: dragOffset.fixedPoint,  // 使用mousedown时缓存的固定点
        currentPoint: currentCoord,
        isShift: window.isShiftPressed || false,
        originalProps: dragOffset.originalProps
    };
    
    // 调试日志
    if (window.debugScale) {
        window.debugScale.log('mousemove', { 
            fixedPoint: scaleInfo.fixedPoint, 
            currentPoint: scaleInfo.currentPoint 
        });
    }
    
    // 调用插件的缩放处理
    if (plugin.handleScale) {
        const newProps = plugin.handleScale(element, scaleInfo, ManimEditor);
        updateElement(element.id, newProps);
    } else {
        console.warn(`插件 ${element.type} 未实现 handleScale 方法`);
    }
}

/**
 * 计算固定点（对角点）- 使用原始props
 */
function calculateFixedPoint(element, corner, originalProps) {
    const plugin = ManimEditor.shapeRegistry[element.type];
    
    if (!plugin || !plugin.getBounds) {
        console.error(`插件 ${element.type} 未实现 getBounds，无法计算固定点`);
        return { x: 0, y: 0 };
    }
    
    // 关键：使用originalProps创建临时元素来计算bounds
    const tempElement = {
        type: element.type,
        id: element.id,
        name: element.name,
        props: originalProps  // 使用原始props，不是当前props！
    };
    
    console.log(`[calculateFixedPoint] corner=${corner}, originalProps=`, originalProps);
    
    // 使用原始状态的bounds计算固定点
    const bounds = plugin.getBounds(tempElement, ManimEditor);
    if (!bounds) {
        console.error(`getBounds返回null`);
        return { x: 0, y: 0 };
    }
    
    console.log(`[calculateFixedPoint] bounds=`, bounds);
    
    // 从Canvas bounds的四个角计算对应的Manim固定点
    // 注意：拖动某个角时，固定的是对角
    const allCorners = {
        topLeft: ManimEditor.canvasToManim(bounds.x, bounds.y),
        topRight: ManimEditor.canvasToManim(bounds.x + bounds.w, bounds.y),
        bottomLeft: ManimEditor.canvasToManim(bounds.x, bounds.y + bounds.h),
        bottomRight: ManimEditor.canvasToManim(bounds.x + bounds.w, bounds.y + bounds.h)
    };
    
    console.log(`[calculateFixedPoint] 所有角(Manim坐标)=`, allCorners);
    
    // 对角映射
    const fixedCorners = {
        // 拖动左上 → 固定右下
        'topLeft': allCorners.bottomRight,
        // 拖动右上 → 固定左下
        'topRight': allCorners.bottomLeft,
        // 拖动右下 → 固定左上
        'bottomRight': allCorners.topLeft,
        // 拖动左下 → 固定右上
        'bottomLeft': allCorners.topRight
    };
    
    const result = fixedCorners[corner] || { x: 0, y: 0 };
    console.log(`[calculateFixedPoint] 拖动${corner} → 固定点=`, result);
    
    return result;
}

/**
 * 处理点击式绘制（通用）
 */
function handleClickDrawing(canvasX, canvasY) {
    const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
    if (!plugin || !plugin.onDrawClick) {
        console.error('插件未实现onDrawClick');
        return;
    }
    
    const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
    const point = [manimCoord.x, manimCoord.y, 0];
    
    // 第一次点击
    if (!ManimEditor.drawingState) {
        ManimEditor.selectedElement = null;
        hidePropertyPanel();
    }
    
    // 调用插件处理点击
    const result = plugin.onDrawClick(ManimEditor.drawingState, point, ManimEditor);
    
    if (result.continue) {
        // 继续绘制
        ManimEditor.drawingState = result.state;
    } else if (result.element) {
        // 完成绘制
        addElement(result.element);
        ManimEditor.drawingState = null;
        ManimEditor.previewPoint = null;
        setSelectMode();
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    }
    
    render();
}

/**
 * 完成点击式绘制（双击）
 */
function finishClickDrawing() {
    const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
    if (!plugin || !plugin.onDrawDoubleClick) return;
    
    // 调用插件处理双击
    const element = plugin.onDrawDoubleClick(ManimEditor.drawingState, ManimEditor);
    
    if (element) {
        addElement(element);
        ManimEditor.drawingState = null;
        ManimEditor.previewPoint = null;
        setSelectMode();
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        render();
    }
}

/**
 * 开始绘制
 */
function startDrawing(canvasX, canvasY) {
    const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
    
    // 清除当前选中的图形，开始绘制新图形
    ManimEditor.selectedElement = null;
    hidePropertyPanel();
    
    ManimEditor.isDrawing = true;
    ManimEditor.drawStart = { x: canvasX, y: canvasY, manimX: manimCoord.x, manimY: manimCoord.y };
    
    // 创建临时元素
    const plugin = ManimEditor.shapeRegistry[ManimEditor.currentShapeType];
    if (plugin && plugin.createDefault) {
        ManimEditor.tempElement = plugin.createDefault(manimCoord.x, manimCoord.y);
    }
    
    render();
}

/**
 * 更新临时元素 - 调用插件方法（插件化v2.0）
 */
function updateTempElement(canvasX, canvasY) {
    if (!ManimEditor.tempElement || !ManimEditor.drawStart) return;
    
    const plugin = ManimEditor.shapeRegistry[ManimEditor.tempElement.type];
    
    if (!plugin) {
        console.error(`未找到插件: ${ManimEditor.tempElement.type}`);
        return;
    }
    
    // 准备坐标信息
    const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
    const startCoord = ManimEditor.drawStart;
    const currentCoord = {
        canvasX: canvasX,
        canvasY: canvasY,
        manimX: manimCoord.x,
        manimY: manimCoord.y
    };
    
    // 调用插件的拖动更新方法
    if (plugin.updateWhileDrawing) {
        console.log(`[绘制] 调用 ${ManimEditor.tempElement.type}.updateWhileDrawing`);
        plugin.updateWhileDrawing(ManimEditor.tempElement, startCoord, currentCoord, ManimEditor);
    } else {
        console.warn(`[绘制] 插件 ${ManimEditor.tempElement.type} 未实现 updateWhileDrawing`);
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
    
    const startCoord = ManimEditor.drawStart;
    const rect = document.getElementById('main-canvas').getBoundingClientRect();
    const distance = Math.sqrt(
        Math.pow(canvasX - startCoord.x, 2) + 
        Math.pow(canvasY - startCoord.y, 2)
    );
    
    // 如果拖动距离太小（小于10像素），不创建元素
    if (distance < 10) {
        console.log('拖动距离太小，取消创建');
        ManimEditor.tempElement = null;
        ManimEditor.isDrawing = false;
        ManimEditor.drawStart = null;
        render();
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

    // 拖动属性面板（拖拽区域：面板头部）
    const panel = document.getElementById('property-panel');
    const header = panel ? panel.querySelector('.panel-header') : null;
    if (panel && header) {
        let isDraggingPanel = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        header.style.cursor = 'move';
        header.addEventListener('mousedown', (e) => {
            isDraggingPanel = true;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            // 从右侧停靠切换为绝对定位
            panel.style.right = 'auto';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingPanel) return;
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const panelRect = panel.getBoundingClientRect();
            let left = e.clientX - dragOffsetX;
            let top = e.clientY - dragOffsetY;
            // 约束在视口内
            left = Math.max(0, Math.min(left, viewportW - panelRect.width));
            top = Math.max(0, Math.min(top, viewportH - 40));
            panel.style.left = left + 'px';
            panel.style.top = top + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isDraggingPanel) return;
            isDraggingPanel = false;
            document.body.style.userSelect = '';
        });
    }
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
            // 传入完整的属性定义对象，便于读取 step/min/max/options
            addPropertyField(content, element, prop.key, prop.label, prop.type, prop);
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
        const optList = Array.isArray(options) ? options : (options.options || []);
        optList.forEach(opt => {
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
        
        // 关键改进：对浮点数四舍五入到2位小数
        if (type === 'number' && typeof value === 'number') {
            value = Math.round(value * 100) / 100;  // 保留2位小数
        }
        
        input.value = value !== undefined ? value : '';
        
        if (type === 'number') {
            // 使用属性定义中的 step 值，如果没有则默认 0.01
            input.step = options?.step !== undefined ? options.step : '0.01';
            
            // 设置 min 和 max（如果有）
            if (options?.min !== undefined) {
                input.min = options.min;
            }
            if (options?.max !== undefined) {
                input.max = options.max;
            }
        }
    }
    
    // 监听变化
    input.addEventListener('input', (e) => {
        let value = e.target.value;
        
        if (type === 'number') {
            // 如果输入为空或无效，不更新
            if (value === '' || value === '-' || value === '.') {
                return; // 允许临时输入状态，不立即更新
            }
            value = parseFloat(value);
            if (isNaN(value)) {
                return; // 无效数字，不更新
            }
        } else if (type === 'checkbox') {
            value = e.target.checked;
        }
        
        if (key === 'name') {
            element.name = value;
            render();
        } else if (key === 'hidden') {
            element.props.hidden = value;
            render();
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
            render();
        } else {
            // 使用 updateElement() 而不是直接修改（触发智能更新）
            const newProps = { [key]: value };
            updateElement(element.id, newProps);
        }
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
    // 关闭时清除拖拽产生的定位，确保下次打开回到默认位置
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    ManimEditor.selectedElement = null;
    render();
}

/**
 * 初始化键盘快捷键
 */
function initKeyboardShortcuts() {
    // 监听Shift键状态（全局）
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') {
            window.isShiftPressed = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            window.isShiftPressed = false;
        }
    });
    
    document.addEventListener('keydown', (e) => {
        // 检查焦点是否在输入框中
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable
        );
        
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
        
        // Delete: 删除选中元素（但不在输入框中时）
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // 只有在非输入框且有选中元素时才删除
            if (!isInputFocused && ManimEditor.selectedElement) {
                e.preventDefault();
                deleteSelectedElement();
            }
        }
        
        // Escape: 取消选择/关闭面板/退出绘制模式/关闭导出弹窗（即使在输入框中也响应）
        if (e.key === 'Escape') {
            // 如果在输入框中，先失焦
            if (isInputFocused) {
                activeElement.blur();
            }
            setSelectMode();
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            hidePropertyPanel();
            // 关闭导出弹窗
            const exportModal = document.getElementById('export-modal');
            if (exportModal && !exportModal.classList.contains('hidden')) {
                hideExportModal();
            }
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
    
    // 清空（不需要确认）
    document.getElementById('clear-btn')?.addEventListener('click', () => {
        ManimEditor.elements = [];
        ManimEditor.selectedElement = null;
        hidePropertyPanel();
        saveToHistory();
        render();
    });
    
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


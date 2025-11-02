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
    
    // 取消曲线绘制状态
    ManimEditor.isCurveDrawing = false;
    ManimEditor.curvePoints = [];
    ManimEditor.curvePreviewPoint = null;
    
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
        
        coordDisplay.textContent = `Manim: (${manimCoord.x.toFixed(2)}, ${manimCoord.y.toFixed(2)})`;
        coordDisplay.classList.add('visible');
        
        // 拖拽元素或控制点
        if (dragElement && isDragging) {
            if (dragOffset.type === 'curvePoint') {
                // 拖动曲线控制点
                const newPoints = [...dragElement.props.points];
                newPoints[dragOffset.index] = [manimCoord.x, manimCoord.y, 0];
                
                updateElement(dragElement.id, {
                    points: newPoints
                });
            } else if (dragOffset.type === 'scaleHandle') {
                // 拖动缩放手柄
                handleScaleDrag(dragElement, dragOffset, manimCoord);
            } else if (dragOffset.type === 'move') {
                // 移动元素
                if (dragElement.type === 'arrow' || dragElement.type === 'line') {
                    // 箭头和线段：平移起点和终点
                    const dx = manimCoord.x - dragOffset.x;
                    const dy = manimCoord.y - dragOffset.y;
                    
                    const newStart = [
                        dragElement.props.start[0] + dx - dragOffset.lastX,
                        dragElement.props.start[1] + dy - dragOffset.lastY,
                        0
                    ];
                    const newEnd = [
                        dragElement.props.end[0] + dx - dragOffset.lastX,
                        dragElement.props.end[1] + dy - dragOffset.lastY,
                        0
                    ];
                    
                    updateElement(dragElement.id, {
                        start: newStart,
                        end: newEnd
                    });
                    
                    dragOffset.lastX = dx;
                    dragOffset.lastY = dy;
                } else if (dragElement.type === 'curve') {
                    // 曲线：平移所有控制点
                    const dx = manimCoord.x - dragOffset.x;
                    const dy = manimCoord.y - dragOffset.y;
                    
                    const newPoints = dragElement.props.points.map(p => [
                        p[0] + dx - dragOffset.lastX,
                        p[1] + dy - dragOffset.lastY,
                        0
                    ]);
                    
                    updateElement(dragElement.id, {
                        points: newPoints
                    });
                    
                    dragOffset.lastX = dx;
                    dragOffset.lastY = dy;
                } else {
                    // 其他元素：移动中心点
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
                    dragOffset = {
                        type: 'scaleHandle',
                        corner: controlPoint.corner,
                        startX: manimCoord.x,
                        startY: manimCoord.y,
                        originalProps: JSON.parse(JSON.stringify(element.props))
                    };
                    console.log(`准备缩放: corner=${controlPoint.corner}`);
                }
                
                render();
                return;
            }
            
            // 如果点击了选中的元素本身（不是控制点），准备移动
            if (clickedElement && clickedElement.id === ManimEditor.selectedElement.id) {
                dragElement = clickedElement;
                isDragging = true;
                
                if (clickedElement.type === 'arrow' || clickedElement.type === 'line') {
                    dragOffset = {
                        type: 'move',
                        x: manimCoord.x,
                        y: manimCoord.y,
                        lastX: 0,
                        lastY: 0
                    };
                } else if (clickedElement.type === 'curve') {
                    dragOffset = {
                        type: 'move',
                        x: manimCoord.x,
                        y: manimCoord.y,
                        lastX: 0,
                        lastY: 0
                    };
                } else {
                    dragOffset = {
                        type: 'move',
                        x: manimCoord.x - clickedElement.props.x,
                        y: manimCoord.y - clickedElement.props.y
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
            // 绘制模式：开始绘制新元素
            if (ManimEditor.currentShapeType === 'curve') {
                handleCurveClick(canvasX, canvasY);
            } else {
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
            
            if (clickedElement.type === 'arrow' || clickedElement.type === 'line') {
                dragOffset = {
                    type: 'move',
                    x: manimCoord.x,
                    y: manimCoord.y,
                    lastX: 0,
                    lastY: 0
                };
            } else if (clickedElement.type === 'curve') {
                dragOffset = {
                    type: 'move',
                    x: manimCoord.x,
                    y: manimCoord.y,
                    lastX: 0,
                    lastY: 0
                };
            } else {
                dragOffset = {
                    type: 'move',
                    x: manimCoord.x - clickedElement.props.x,
                    y: manimCoord.y - clickedElement.props.y
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
    
    // 鼠标移动时预览曲线
    canvas.addEventListener('mousemove', (e) => {
        if (ManimEditor.isCurveDrawing && ManimEditor.curvePoints.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
            
            // 更新预览
            ManimEditor.curvePreviewPoint = [manimCoord.x, manimCoord.y, 0];
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
    
    // 对于曲线：优先检查曲线控制点（P0, P1, P2, P3），然后才检查缩放手柄
    if (element.type === 'curve' && element.props.points) {
        const curveThreshold = 12; // 曲线控制点使用圆形检测，容差12px
        
        for (let i = 0; i < element.props.points.length; i++) {
            const point = element.props.points[i];
            const canvasPoint = ManimEditor.manimToCanvas(point[0], point[1]);
            const distance = Math.sqrt(
                Math.pow(canvasX - canvasPoint.x, 2) +
                Math.pow(canvasY - canvasPoint.y, 2)
            );
            
            if (distance <= curveThreshold) {
                console.log(`检测到曲线控制点: P${i}, 距离=${distance.toFixed(1)}px`);
                return { type: 'curvePoint', index: i };
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
 * 获取元素的边界框（画布坐标）
 */
function getElementBounds(element) {
    const props = element.props;
    
    if (element.type === 'rectangle') {
        const pos = ManimEditor.manimToCanvas(props.x, props.y);
        const w = (props.width || 2) * 50;
        const h = (props.height || 1) * 50;
        return { x: pos.x - w/2, y: pos.y - h/2, w, h };
    } else if (element.type === 'square') {
        const pos = ManimEditor.manimToCanvas(props.x, props.y);
        const size = (props.size || 1) * 50;
        return { x: pos.x - size/2, y: pos.y - size/2, w: size, h: size };
    } else if (element.type === 'arrow' || element.type === 'line') {
        const start = ManimEditor.manimToCanvas(props.start[0], props.start[1]);
        const end = ManimEditor.manimToCanvas(props.end[0], props.end[1]);
        const minX = Math.min(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxX = Math.max(start.x, end.x);
        const maxY = Math.max(start.y, end.y);
        const padding = 10;
        return { 
            x: minX - padding, 
            y: minY - padding, 
            w: maxX - minX + padding * 2, 
            h: maxY - minY + padding * 2 
        };
    } else if (element.type === 'curve') {
        const points = props.points || [];
        if (points.length > 0) {
            const canvasPoints = points.map(p => ManimEditor.manimToCanvas(p[0], p[1]));
            const minX = Math.min(...canvasPoints.map(p => p.x));
            const minY = Math.min(...canvasPoints.map(p => p.y));
            const maxX = Math.max(...canvasPoints.map(p => p.x));
            const maxY = Math.max(...canvasPoints.map(p => p.y));
            const padding = 10;
            return { 
                x: minX - padding, 
                y: minY - padding, 
                w: maxX - minX + padding * 2, 
                h: maxY - minY + padding * 2 
            };
        }
    } else if (element.type === 'coordinateSystem') {
        const pos = ManimEditor.manimToCanvas(props.x, props.y);
        const w = (props.x_length || 6) * 50;
        const h = (props.y_length || 6) * 50;
        return { x: pos.x - w/2, y: pos.y - h/2, w, h };
    }
    
    return null;
}

/**
 * 处理缩放拖拽 - 对角不动策略（重构版）
 */
function handleScaleDrag(element, dragOffset, currentCoord) {
    const props = dragOffset.originalProps;
    const corner = dragOffset.corner;
    const isShift = window.isShiftPressed || false;
    
    console.log(`缩放: ${element.type}, 角: ${corner}, Shift: ${isShift}`);
    
    // ═══════════════════════════════════════════
    // 正方形和矩形的缩放
    // ═══════════════════════════════════════════
    if (element.type === 'square' || element.type === 'rectangle') {
        const center = { x: props.x, y: props.y };
        const width = element.type === 'square' ? props.size : props.width;
        const height = element.type === 'square' ? props.size : props.height;
        const halfW = width / 2;
        const halfH = height / 2;
        
        // 步骤1：确定固定点（Manim坐标）
        // 注意：Manim中Y轴向上，top的y值大，bottom的y值小
        let fixedX, fixedY;
        
        if (corner === 'topLeft') {
            // 拖动左上（Manim: x小,y大），固定右下（Manim: x大,y小）
            fixedX = center.x + halfW;
            fixedY = center.y - halfH;
        } else if (corner === 'topRight') {
            // 拖动右上（Manim: x大,y大），固定左下（Manim: x小,y小）
            fixedX = center.x - halfW;
            fixedY = center.y - halfH;
        } else if (corner === 'bottomRight') {
            // 拖动右下（Manim: x大,y小），固定左上（Manim: x小,y大）
            fixedX = center.x - halfW;
            fixedY = center.y + halfH;
        } else { // bottomLeft
            // 拖动左下（Manim: x小,y小），固定右上（Manim: x大,y大）
            fixedX = center.x + halfW;
            fixedY = center.y + halfH;
        }
        
        console.log(`固定点: (${fixedX.toFixed(2)}, ${fixedY.toFixed(2)})`);
        
        // 步骤2：计算新尺寸（从固定点到鼠标的距离）
        let newWidth = Math.abs(currentCoord.x - fixedX);
        let newHeight = Math.abs(currentCoord.y - fixedY);
        
        console.log(`初始新尺寸: ${newWidth.toFixed(2)} × ${newHeight.toFixed(2)}`);
        
        // 步骤3：处理等比例（正方形始终等比例，矩形按Shift）
        if (element.type === 'square' || isShift) {
            if (element.type === 'square') {
                // 正方形：取最大值
                const newSize = Math.max(newWidth, newHeight);
                newWidth = newSize;
                newHeight = newSize;
            } else {
                // 矩形按Shift：保持原始比例
                const originalRatio = props.width / props.height;
                const scaleW = newWidth / props.width;
                const scaleH = newHeight / props.height;
                const scale = Math.max(scaleW, scaleH);
                
                newWidth = props.width * scale;
                newHeight = props.height * scale;
            }
            console.log(`等比例调整后: ${newWidth.toFixed(2)} × ${newHeight.toFixed(2)}`);
        }
        
        // 步骤4：计算新的拖动角位置（实际的，不一定是鼠标位置）
        let newCornerX, newCornerY;
        
        if (corner === 'topLeft') {
            newCornerX = fixedX - newWidth;
            newCornerY = fixedY + newHeight;
        } else if (corner === 'topRight') {
            newCornerX = fixedX + newWidth;
            newCornerY = fixedY + newHeight;
        } else if (corner === 'bottomRight') {
            newCornerX = fixedX + newWidth;
            newCornerY = fixedY - newHeight;
        } else { // bottomLeft
            newCornerX = fixedX - newWidth;
            newCornerY = fixedY - newHeight;
        }
        
        // 步骤5：新中心 = 固定点和新角位置的中点
        const newCenterX = (fixedX + newCornerX) / 2;
        const newCenterY = (fixedY + newCornerY) / 2;
        
        console.log(`新中心: (${newCenterX.toFixed(2)}, ${newCenterY.toFixed(2)})`);
        
        // 更新元素
        if (element.type === 'square') {
            updateElement(element.id, {
                size: Math.max(0.1, newWidth),
                x: newCenterX,
                y: newCenterY
            });
        } else {
            updateElement(element.id, {
                width: Math.max(0.1, newWidth),
                height: Math.max(0.1, newHeight),
                x: newCenterX,
                y: newCenterY
            });
        }
        
    } 
    // ═══════════════════════════════════════════
    // 箭头和线段的缩放
    // ═══════════════════════════════════════════
    else if (element.type === 'arrow' || element.type === 'line') {
        const start = { x: props.start[0], y: props.start[1] };
        const end = { x: props.end[0], y: props.end[1] };
        const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        
        // 计算包围盒
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        const halfW = (maxX - minX) / 2;
        const halfH = (maxY - minY) / 2;
        
        // 确定固定点
        let fixedX, fixedY;
        
        if (corner === 'topLeft') {
            fixedX = center.x + halfW;
            fixedY = center.y - halfH;
        } else if (corner === 'topRight') {
            fixedX = center.x - halfW;
            fixedY = center.y - halfH;
        } else if (corner === 'bottomRight') {
            fixedX = center.x - halfW;
            fixedY = center.y + halfH;
        } else {
            fixedX = center.x + halfW;
            fixedY = center.y + halfH;
        }
        
        // 计算新尺寸
        let newWidth = Math.abs(currentCoord.x - fixedX);
        let newHeight = Math.abs(currentCoord.y - fixedY);
        
        // 等比例缩放
        if (isShift && halfW > 0 && halfH > 0) {
            const originalRatio = (maxX - minX) / (maxY - minY);
            const scaleW = newWidth / (maxX - minX);
            const scaleH = newHeight / (maxY - minY);
            const scale = Math.max(scaleW, scaleH);
            
            newWidth = (maxX - minX) * scale;
            newHeight = (maxY - minY) * scale;
        }
        
        // 计算新角位置
        let newCornerX, newCornerY;
        if (corner === 'topLeft') {
            newCornerX = fixedX - newWidth;
            newCornerY = fixedY + newHeight;
        } else if (corner === 'topRight') {
            newCornerX = fixedX + newWidth;
            newCornerY = fixedY + newHeight;
        } else if (corner === 'bottomRight') {
            newCornerX = fixedX + newWidth;
            newCornerY = fixedY - newHeight;
        } else {
            newCornerX = fixedX - newWidth;
            newCornerY = fixedY - newHeight;
        }
        
        // 新中心
        const newCenterX = (fixedX + newCornerX) / 2;
        const newCenterY = (fixedY + newCornerY) / 2;
        
        // 计算缩放比例
        const scaleX = (maxX - minX) > 0 ? newWidth / (maxX - minX) : 1;
        const scaleY = (maxY - minY) > 0 ? newHeight / (maxY - minY) : 1;
        
        // 缩放起点和终点
        const newStart = [
            newCenterX + (start.x - center.x) * scaleX,
            newCenterY + (start.y - center.y) * scaleY,
            0
        ];
        const newEnd = [
            newCenterX + (end.x - center.x) * scaleX,
            newCenterY + (end.y - center.y) * scaleY,
            0
        ];
        
        updateElement(element.id, {
            start: newStart,
            end: newEnd
        });
        
    } 
    // ═══════════════════════════════════════════
    // 曲线的缩放
    // ═══════════════════════════════════════════
    else if (element.type === 'curve') {
        const points = props.points;
        if (!points || points.length === 0) return;
        
        // 计算包围盒和中心
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        const halfW = (maxX - minX) / 2;
        const halfH = (maxY - minY) / 2;
        
        // 确定固定点
        let fixedX, fixedY;
        
        if (corner === 'topLeft') {
            fixedX = center.x + halfW;
            fixedY = center.y - halfH;
        } else if (corner === 'topRight') {
            fixedX = center.x - halfW;
            fixedY = center.y - halfH;
        } else if (corner === 'bottomRight') {
            fixedX = center.x - halfW;
            fixedY = center.y + halfH;
        } else {
            fixedX = center.x + halfW;
            fixedY = center.y + halfH;
        }
        
        // 计算新尺寸
        let newWidth = Math.abs(currentCoord.x - fixedX);
        let newHeight = Math.abs(currentCoord.y - fixedY);
        
        // 等比例缩放
        if (isShift && halfW > 0 && halfH > 0) {
            const originalRatio = (maxX - minX) / (maxY - minY);
            const scaleW = newWidth / (maxX - minX);
            const scaleH = newHeight / (maxY - minY);
            const scale = Math.max(scaleW, scaleH);
            
            newWidth = (maxX - minX) * scale;
            newHeight = (maxY - minY) * scale;
        }
        
        // 计算新角位置
        let newCornerX, newCornerY;
        if (corner === 'topLeft') {
            newCornerX = fixedX - newWidth;
            newCornerY = fixedY + newHeight;
        } else if (corner === 'topRight') {
            newCornerX = fixedX + newWidth;
            newCornerY = fixedY + newHeight;
        } else if (corner === 'bottomRight') {
            newCornerX = fixedX + newWidth;
            newCornerY = fixedY - newHeight;
        } else {
            newCornerX = fixedX - newWidth;
            newCornerY = fixedY - newHeight;
        }
        
        // 新中心
        const newCenterX = (fixedX + newCornerX) / 2;
        const newCenterY = (fixedY + newCornerY) / 2;
        
        // 计算缩放比例
        const scaleX = (maxX - minX) > 0 ? newWidth / (maxX - minX) : 1;
        const scaleY = (maxY - minY) > 0 ? newHeight / (maxY - minY) : 1;
        
        // 缩放所有控制点
        const newPoints = points.map(p => [
            newCenterX + (p[0] - center.x) * scaleX,
            newCenterY + (p[1] - center.y) * scaleY,
            0
        ]);
        
        updateElement(element.id, {
            points: newPoints
        });
        
    } 
    // ═══════════════════════════════════════════
    // 坐标系的缩放
    // ═══════════════════════════════════════════
    else if (element.type === 'coordinateSystem') {
        const center = { x: props.x, y: props.y };
        const halfW = props.x_length / 2;
        const halfH = props.y_length / 2;
        
        // 确定固定点
        let fixedX, fixedY;
        
        if (corner === 'topLeft') {
            fixedX = center.x + halfW;
            fixedY = center.y - halfH;
        } else if (corner === 'topRight') {
            fixedX = center.x - halfW;
            fixedY = center.y - halfH;
        } else if (corner === 'bottomRight') {
            fixedX = center.x - halfW;
            fixedY = center.y + halfH;
        } else {
            fixedX = center.x + halfW;
            fixedY = center.y + halfH;
        }
        
        // 计算新轴长度
        let newXLength = Math.abs(currentCoord.x - fixedX);
        let newYLength = Math.abs(currentCoord.y - fixedY);
        
        // 等比例缩放
        if (isShift) {
            const originalRatio = props.x_length / props.y_length;
            const scaleX = newXLength / props.x_length;
            const scaleY = newYLength / props.y_length;
            const scale = Math.max(scaleX, scaleY);
            
            newXLength = props.x_length * scale;
            newYLength = props.y_length * scale;
        }
        
        // 计算新角位置
        let newCornerX, newCornerY;
        if (corner === 'topLeft') {
            newCornerX = fixedX - newXLength;
            newCornerY = fixedY + newYLength;
        } else if (corner === 'topRight') {
            newCornerX = fixedX + newXLength;
            newCornerY = fixedY + newYLength;
        } else if (corner === 'bottomRight') {
            newCornerX = fixedX + newXLength;
            newCornerY = fixedY - newYLength;
        } else {
            newCornerX = fixedX - newXLength;
            newCornerY = fixedY - newYLength;
        }
        
        // 新中心
        const newX = (fixedX + newCornerX) / 2;
        const newY = (fixedY + newCornerY) / 2;
        
        updateElement(element.id, {
            x_length: Math.max(1, newXLength),
            y_length: Math.max(1, newYLength),
            x: newX,
            y: newY
        });
    }
}

/**
 * 处理曲线的点击绘制
 */
function handleCurveClick(canvasX, canvasY) {
    const manimCoord = ManimEditor.canvasToManim(canvasX, canvasY);
    const point = [manimCoord.x, manimCoord.y, 0];
    
    if (!ManimEditor.isCurveDrawing) {
        // 开始绘制曲线，清除选中状态
        ManimEditor.selectedElement = null;
        hidePropertyPanel();
        
        ManimEditor.isCurveDrawing = true;
        ManimEditor.curvePoints = [point];
        console.log('曲线绘制开始，放置P0（起点）');
    } else if (ManimEditor.curvePoints.length === 1) {
        // 放置第一个控制点
        ManimEditor.curvePoints.push(point);
        console.log('放置P1（控制点1）');
    } else if (ManimEditor.curvePoints.length === 2) {
        // 放置第二个控制点
        ManimEditor.curvePoints.push(point);
        console.log('放置P2（控制点2）');
    } else if (ManimEditor.curvePoints.length === 3) {
        // 放置终点，完成曲线
        ManimEditor.curvePoints.push(point);
        console.log('放置P3（终点），曲线完成');
        
        // 创建曲线元素
        const curve = {
            type: 'curve',
            name: 'curve_' + (ManimEditor.elements.length + 1),
            props: {
                points: [...ManimEditor.curvePoints],
                color: '#9b59b6',
                stroke_width: 2,
                smoothness: 1,
                hidden: false
            }
        };
        
        addElement(curve);
        
        // 重置曲线绘制状态
        ManimEditor.isCurveDrawing = false;
        ManimEditor.curvePoints = [];
        ManimEditor.curvePreviewPoint = null;
        
        // 自动退出绘制模式
        setSelectMode();
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    }
    
    render();
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
    } else if (type === 'curve') {
        // 曲线：使用起点和终点创建简单的两点曲线
        ManimEditor.tempElement.props.points = [
            [startCoord.manimX, startCoord.manimY, 0],
            [(startCoord.manimX + manimCoord.x) / 2, (startCoord.manimY + manimCoord.y) / 2, 0],
            [manimCoord.x, manimCoord.y, 0]
        ];
    } else if (type === 'coordinateSystem') {
        // 坐标系：根据拖动距离调整大小
        const width = Math.abs(manimCoord.x - startCoord.manimX);
        const height = Math.abs(manimCoord.y - startCoord.manimY);
        const centerX = (manimCoord.x + startCoord.manimX) / 2;
        const centerY = (manimCoord.y + startCoord.manimY) / 2;
        
        ManimEditor.tempElement.props.x = centerX;
        ManimEditor.tempElement.props.y = centerY;
        ManimEditor.tempElement.props.x_length = Math.max(width * 2, 2);
        ManimEditor.tempElement.props.y_length = Math.max(height * 2, 2);
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
        
        // Escape: 取消选择/关闭面板/退出绘制模式（即使在输入框中也响应）
        if (e.key === 'Escape') {
            // 如果在输入框中，先失焦
            if (isInputFocused) {
                activeElement.blur();
            }
            setSelectMode();
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            hidePropertyPanel();
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
    
    // 清空
    document.getElementById('clear-btn')?.addEventListener('click', () => {
        if (confirm('确定要清空所有图形吗？此操作不可撤销。')) {
            ManimEditor.elements = [];
            ManimEditor.selectedElement = null;
            hidePropertyPanel();
            saveToHistory();
            render();
        }
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


/**
 * Parabola 插件 - 抛物线
 * 
 * 数学特征：y = a(x-h)² + k
 * 参数：顶点(h,k)，系数a
 */

registerShape({
    type: 'parabola',
    name: '抛物线',
    icon: '∪',
    version: '1.0.0',
    drawMode: 'drag',
    
    createDefault: function(x, y) {
        return {
            type: 'parabola',
            name: 'parabola_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,           // 外接矩形中心X
                y: y || 0,           // 外接矩形中心Y  
                width: 4,            // 外接矩形宽度
                height: 2,           // 外接矩形高度（正=开口向下，负=开口向上）
                color: '#f39c12',
                opacity: 1,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const centerX = props.x || 0;
        const centerY = props.y || 0;
        const width = props.width || 4;
        const height = props.height || 2;
        
        // 根据外接矩形计算抛物线参数
        // 顶点：在矩形顶部中心（开口向下）或底部中心（开口向上）
        const h = centerX;  // 顶点X = 中心X
        const k = centerY + (height > 0 ? height / 2 : -Math.abs(height) / 2);  // 顶点Y
        
        // X范围：矩形左右边界
        const xStart = centerX - width / 2;
        const xEnd = centerX + width / 2;
        
        // 系数a：根据端点计算
        // 端点：(centerX ± width/2, centerY - height/2)或(centerY + height/2)
        const endY = centerY - (height > 0 ? height / 2 : -Math.abs(height) / 2);
        // endY = a(width/2)² + k
        // a = (endY - k) / (width/2)²
        const a = (endY - k) / ((width / 2) * (width / 2));
        
        // 关键优化：增加采样点数，使曲线更平滑
        const xRangeManim = Math.abs(xEnd - xStart);
        const xRangePixels = xRangeManim * 50;
        const optimalSamples = Math.max(150, Math.floor(xRangePixels * 2));
        const samples = Math.min(optimalSamples, 400);
        
        ctx.strokeStyle = props.color || '#f39c12';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';  // 平滑连接
        ctx.lineCap = 'round';   // 平滑端点
        
        ctx.beginPath();
        let firstPoint = true;
        
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const x = xStart + (xEnd - xStart) * t;
            const y = a * (x - h) * (x - h) + k;
            
            const canvasPos = editor.manimToCanvas(x, y);
            
            if (firstPoint) {
                ctx.moveTo(canvasPos.x, canvasPos.y);
                firstPoint = false;
            } else {
                ctx.lineTo(canvasPos.x, canvasPos.y);
            }
        }
        
        ctx.stroke();
        
        // 绘制顶点标记
        const vertexPos = editor.manimToCanvas(h, k);
        ctx.fillStyle = props.color || '#f39c12';
        ctx.beginPath();
        ctx.arc(vertexPos.x, vertexPos.y, 5, 0, Math.PI * 2);
        ctx.fill();
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        // 拖动绘制外接矩形
        const width = Math.abs(current.manimX - start.manimX);
        const height = Math.abs(current.manimY - start.manimY);
        const centerX = (current.manimX + start.manimX) / 2;
        const centerY = (current.manimY + start.manimY) / 2;
        
        // 判断开口方向：拖动点在起点下方→开口向下(height>0)
        const heightSigned = current.manimY < start.manimY ? height : -height;
        
        element.props.x = centerX;
        element.props.y = centerY;
        element.props.width = width;
        element.props.height = heightSigned;
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const halfWidth = (props.width || 4) / 2;
        const halfHeight = (props.height || 2) / 2;
        
        // 简化：检查是否在外接矩形内
        return Math.abs(manimX - props.x) <= halfWidth + 0.5 &&
               Math.abs(manimY - props.y) <= Math.abs(halfHeight) + 0.5;
    },
    
    getBounds: function(element, editor) {
        const props = element.props;
        const width = props.width || 4;
        const height = props.height || 2;
        
        // 外接矩形的四个角（Manim坐标）
        const left = props.x - width / 2;
        const right = props.x + width / 2;
        const top = props.y + Math.abs(height) / 2;
        const bottom = props.y - Math.abs(height) / 2;
        
        // 转换到Canvas坐标
        const topLeftCanvas = editor.manimToCanvas(left, top);
        const bottomRightCanvas = editor.manimToCanvas(right, bottom);
        
        return {
            x: topLeftCanvas.x,
            y: topLeftCanvas.y,
            w: bottomRightCanvas.x - topLeftCanvas.x,
            h: bottomRightCanvas.y - topLeftCanvas.y
        };
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        
        // 缩放外接矩形（类似rectangle）
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        // 等比例
        if (isShift) {
            const originalRatio = (originalProps.width || 4) / Math.abs(originalProps.height || 2);
            const scaleW = newWidth / (originalProps.width || 4);
            const scaleH = newHeight / Math.abs(originalProps.height || 2);
            const scale = Math.max(scaleW, scaleH);
            
            newWidth = (originalProps.width || 4) * scale;
            newHeight = Math.abs(originalProps.height || 2) * scale;
        }
        
        // 根据corner确定新角位置
        let newCornerX, newCornerY;
        
        if (corner === 'topLeft') {
            newCornerX = fixedPoint.x - newWidth;
            newCornerY = fixedPoint.y + newHeight;
        } else if (corner === 'topRight') {
            newCornerX = fixedPoint.x + newWidth;
            newCornerY = fixedPoint.y + newHeight;
        } else if (corner === 'bottomRight') {
            newCornerX = fixedPoint.x + newWidth;
            newCornerY = fixedPoint.y - newHeight;
        } else {
            newCornerX = fixedPoint.x - newWidth;
            newCornerY = fixedPoint.y - newHeight;
        }
        
        // 新中心
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        
        // 保持开口方向
        const heightSigned = (originalProps.height || 2) > 0 ? newHeight : -newHeight;
        
        return {
            x: newCenterX,
            y: newCenterY,
            width: Math.max(0.1, newWidth),
            height: heightSigned
        };
    },
    
    getMoveAnchor: function(element) {
        // parabola：使用矩形中心作为锚点
        return { x: element.props.x, y: element.props.y };
    },
    
    handleMove: function(element, moveInfo, editor) {
        // 抛物线的移动：移动矩形中心（类似rectangle）
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const color = hexToManimColor(props.color || '#f39c12');
        
        // 计算抛物线参数
        const centerX = props.x || 0;
        const centerY = props.y || 0;
        const width = props.width || 4;
        const height = props.height || 2;
        
        const h = centerX;
        const k = centerY + (height > 0 ? height / 2 : -Math.abs(height) / 2);
        const endY = centerY - (height > 0 ? height / 2 : -Math.abs(height) / 2);
        const a = (endY - k) / ((width / 2) * (width / 2));
        
        const xStart = centerX - width / 2;
        const xEnd = centerX + width / 2;
        
        let code = `${varName} = FunctionGraph(`;
        code += `lambda x: ${formatNumber(a)} * (x - ${formatNumber(h)})**2 + ${formatNumber(k)}, `;
        code += `x_range=[${formatNumber(xStart)}, ${formatNumber(xEnd)}], `;
        code += `color=${color})`;
        
        return code;
    },
    
    properties: [
        { key: 'x', label: 'X坐标', type: 'number', step: 0.1 },
        { key: 'y', label: 'Y坐标', type: 'number', step: 0.1 },
        { key: 'width', label: '宽度', type: 'number', step: 0.1, min: 0.1 },
        { key: 'height', label: '高度', type: 'number', step: 0.1 },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'opacity', label: '不透明度', type: 'number', step: 0.1, min: 0, max: 1 }
    ]
});


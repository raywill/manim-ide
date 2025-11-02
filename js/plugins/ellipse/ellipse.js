/**
 * Ellipse 插件 - 椭圆
 * 
 * 数学特征：(x-h)²/a² + (y-k)²/b² = 1
 * 参数：中心(h,k)，长半轴a，短半轴b
 */

registerShape({
    type: 'ellipse',
    name: '椭圆',
    icon: '⬭',
    version: '1.0.0',
    drawMode: 'drag',
    
    createDefault: function(x, y) {
        return {
            type: 'ellipse',
            name: 'ellipse_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,
                y: y || 0,
                width: 2,      // 宽度（2a）
                height: 1,     // 高度（2b）
                color: '#9b59b6',
                opacity: 1,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const radiusX = (props.width / 2) * 50;
        const radiusY = (props.height / 2) * 50;
        
        ctx.fillStyle = props.color || '#9b59b6';
        ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 中心点
        ctx.fillStyle = '#95a5a6';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        const width = Math.abs(current.manimX - start.manimX);
        const height = Math.abs(current.manimY - start.manimY);
        const centerX = (current.manimX + start.manimX) / 2;
        const centerY = (current.manimY + start.manimY) / 2;
        
        element.props.width = width;
        element.props.height = height;
        element.props.x = centerX;
        element.props.y = centerY;
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const a = props.width / 2;
        const b = props.height / 2;
        
        // 椭圆方程：(x-h)²/a² + (y-k)²/b² <= 1
        const dx = manimX - props.x;
        const dy = manimY - props.y;
        const value = (dx * dx) / (a * a) + (dy * dy) / (b * b);
        
        return value <= 1.1;  // 稍微放宽容差
    },
    
    getBounds: function(element, editor) {
        const props = element.props;
        const width = props.width || 2;  // Manim单位
        const height = props.height || 1;
        
        // 在Manim坐标下计算四个外接点
        const left = props.x - width / 2;
        const right = props.x + width / 2;
        const top = props.y + height / 2;
        const bottom = props.y - height / 2;
        
        // 转换到Canvas坐标
        const topLeftCanvas = editor.manimToCanvas(left, top);
        const bottomRightCanvas = editor.manimToCanvas(right, bottom);
        
        console.log(`[Ellipse.getBounds] center=(${props.x}, ${props.y}), size=${width}×${height}`);
        console.log(`  Canvas bounds: x=${topLeftCanvas.x}, y=${topLeftCanvas.y}, w=${bottomRightCanvas.x - topLeftCanvas.x}, h=${bottomRightCanvas.y - topLeftCanvas.y}`);
        
        return {
            x: topLeftCanvas.x,
            y: topLeftCanvas.y,
            w: bottomRightCanvas.x - topLeftCanvas.x,
            h: bottomRightCanvas.y - topLeftCanvas.y
        };
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        
        // 步骤1：计算新尺寸
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        // 步骤2：等比例调整
        if (isShift) {
            const originalRatio = originalProps.width / originalProps.height;
            const scaleW = newWidth / originalProps.width;
            const scaleH = newHeight / originalProps.height;
            const scale = Math.max(scaleW, scaleH);
            
            newWidth = originalProps.width * scale;
            newHeight = originalProps.height * scale;
        }
        
        // 步骤3：根据corner确定新角位置
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
        } else { // bottomLeft
            newCornerX = fixedPoint.x - newWidth;
            newCornerY = fixedPoint.y - newHeight;
        }
        
        // 步骤4：新中心
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        
        return {
            width: Math.max(0.1, newWidth),
            height: Math.max(0.1, newHeight),
            x: newCenterX,
            y: newCenterY
        };
    },
    
    getMoveAnchor: function(element) {
        return { x: element.props.x, y: element.props.y };
    },
    
    handleMove: function(element, moveInfo, editor) {
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const width = formatNumber(props.width || 2);
        const height = formatNumber(props.height || 1);
        const color = hexToManimColor(props.color || '#9b59b6');
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        let code = `${varName} = Ellipse(width=${width}, height=${height}, color=${color})`;
        
        if (props.x !== 0 || props.y !== 0) {
            code += `.move_to([${x}, ${y}, 0])`;
        }
        
        if (props.opacity !== undefined && props.opacity !== 1) {
            code += `.set_opacity(${formatNumber(props.opacity)})`;
        }
        
        return code;
    },
    
    properties: [
        { key: 'x', label: 'X坐标', type: 'number', step: 0.1 },
        { key: 'y', label: 'Y坐标', type: 'number', step: 0.1 },
        { key: 'width', label: '宽度', type: 'number', step: 0.1, min: 0.1 },
        { key: 'height', label: '高度', type: 'number', step: 0.1, min: 0.1 },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'opacity', label: '不透明度', type: 'number', step: 0.1, min: 0, max: 1 }
    ]
});


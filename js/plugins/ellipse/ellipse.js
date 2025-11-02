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
                width: 0,   // 从0开始，避免绘制时闪现默认大小
                height: 0,  // 从0开始，避免绘制时闪现默认大小
                fill_color: '#9b59b6',
                stroke_color: '#2c3e50',
                fill_opacity: 1,
                stroke_width: 2,
                z_order: 0,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const radiusX = (props.width / 2) * editor.pxPerUnit;
        const radiusY = (props.height / 2) * editor.pxPerUnit;
        
        setRenderOpacity(ctx, element);
        
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, radiusX, radiusY, 0, 0, Math.PI * 2);
        
        // 绘制填充
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
        if (fillOpacity > 0) {
            ctx.fillStyle = props.fill_color || props.color || '#9b59b6';
            const savedAlpha = ctx.globalAlpha;
            ctx.globalAlpha = savedAlpha * fillOpacity;
            ctx.fill();
            ctx.globalAlpha = savedAlpha;
        }
        
        // 绘制边框
        ctx.strokeStyle = props.stroke_color || '#2c3e50';
        ctx.lineWidth = props.stroke_width || 2;
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
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        const fillColor = hexToManimColor(props.fill_color || props.color || '#9b59b6');
        const strokeColor = hexToManimColor(props.stroke_color || '#2c3e50');
        
        let code = `${varName} = Ellipse(width=${width}, height=${height})`;
        
        if (props.x !== 0 || props.y !== 0) {
            code += `.move_to([${x}, ${y}, 0])`;
        }
        
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
        if (fillOpacity > 0) {
            code += `.set_fill(${fillColor}, ${formatNumber(fillOpacity)})`;
        } else {
            code += `.set_fill(opacity=0)`;
        }
        
        const strokeWidth = formatNumber(props.stroke_width || 2);
        code += `.set_stroke(${strokeColor}, width=${strokeWidth})`;
        
        // 设置 z-index
        const zOrder = props.z_order !== undefined ? props.z_order : 0;
        if (zOrder !== 0) {
            code += `.set_z_index(${zOrder})`;
        }
        
        return code;
    },
    
    properties: [
        { key: 'x', label: 'X坐标', type: 'number', step: 0.01 },
        { key: 'y', label: 'Y坐标', type: 'number', step: 0.01 },
        { key: 'width', label: '宽度', type: 'number', step: 0.01, min: 0.1 },
        { key: 'height', label: '高度', type: 'number', step: 0.01, min: 0.1 },
        { key: 'fill_color', label: '填充色', type: 'color' },
        { key: 'fill_opacity', label: '填充透明度', type: 'number', step: 0.1, min: 0, max: 1 },
        { key: 'stroke_color', label: '边框色', type: 'color' },
        { key: 'stroke_width', label: '边框宽度', type: 'number', step: 0.1, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


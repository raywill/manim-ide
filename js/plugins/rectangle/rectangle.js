/**
 * Rectangle 插件
 */

registerShape({
    type: 'rectangle',
    name: '矩形',
    icon: '▭',
    version: '2.0.1-migrated',  // 版本标记，用于验证是否加载新代码
    
    createDefault: function(x, y) {
        return {
            type: 'rectangle',
            name: 'rect_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,
                y: y || 0,
                width: 0,   // 从0开始，避免绘制时闪现默认大小
                height: 0,  // 从0开始，避免绘制时闪现默认大小
                fill_color: '#3498db',    // 填充色
                stroke_color: '#2c3e50',  // 边框色
                fill_opacity: 1,          // 填充透明度（0=无填充）
                stroke_width: 2,
                z_order: 0,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const px = editor.pxPerUnit || 50;
        const width = (props.width !== undefined ? props.width : 2) * px;
        const height = (props.height !== undefined ? props.height : 1) * px;
        
        const x = pos.x - width / 2;
        const y = pos.y - height / 2;
        
        // 处理hidden：透明度0.1而非完全隐藏
        setRenderOpacity(ctx, element);
        
        // 绘制填充（如果fill_opacity > 0）
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
        if (fillOpacity > 0) {
            ctx.fillStyle = props.fill_color || props.color || '#3498db';
            const savedAlpha = ctx.globalAlpha;
            ctx.globalAlpha = savedAlpha * fillOpacity;  // 叠加fill_opacity
            ctx.fillRect(x, y, width, height);
            ctx.globalAlpha = savedAlpha;
        }
        
        // 绘制边框
        ctx.strokeStyle = props.stroke_color || '#2c3e50';
        ctx.lineWidth = props.stroke_width || 2;
        ctx.strokeRect(x, y, width, height);
        
        // 绘制中心点
        ctx.fillStyle = '#95a5a6';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const halfWidth = props.width / 2;
        const halfHeight = props.height / 2;
        
        return Math.abs(manimX - props.x) <= halfWidth &&
               Math.abs(manimY - props.y) <= halfHeight;
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const width = formatNumber(props.width || 2);
        const height = formatNumber(props.height || 1);
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        // 使用fill_color或回退到color
        const fillColor = hexToManimColor(props.fill_color || props.color || '#3498db');
        const strokeColor = hexToManimColor(props.stroke_color || '#2c3e50');
        
        let code = `${varName} = Rectangle(width=${width}, height=${height})`;
        
        // 移动到位置
        if (props.x !== 0 || props.y !== 0) {
            code += `.move_to([${x}, ${y}, 0])`;
        }
        
        // 设置填充
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
        if (fillOpacity > 0) {
            code += `.set_fill(${fillColor}, ${formatNumber(fillOpacity)})`;
        } else {
            code += `.set_fill(opacity=0)`;  // 无填充
        }
        
        // 设置边框
        const strokeWidth = formatNumber(props.stroke_width || 2);
        code += `.set_stroke(${strokeColor}, width=${strokeWidth})`;
        
        // 设置 z-index
        const zOrder = props.z_order !== undefined ? props.z_order : 0;
        if (zOrder !== 0) {
            code += `.set_z_index(${zOrder})`;
        }
        
        return code;
    },
    
    // ═══════════════════════════════════════════
    // 插件化v2.0新增方法
    // ═══════════════════════════════════════════
    
    getBounds: function(element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const px2 = editor.pxPerUnit || 50;
        const w = (props.width || 2) * px2;
        const h = (props.height || 1) * px2;
        return { x: pos.x - w/2, y: pos.y - h/2, w, h };
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
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        
        // 步骤1：计算新尺寸（绝对值）
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
        
        // 步骤3：根据corner确定新角位置（固定方向）
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
        
        // 步骤4：新中心 = (固定点 + 新角) / 2
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
        // 矩形：使用中心点作为锚点
        return { x: element.props.x, y: element.props.y };
    },
    
    handleMove: function(element, moveInfo, editor) {
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
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


/**
 * Square 插件
 */

registerShape({
    type: 'square',
    name: '正方形',
    icon: '⬜',
    version: '2.0.0-migrated',
    
    createDefault: function(x, y) {
        return {
            type: 'square',
            name: 'square_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,
                y: y || 0,
                size: 0,  // 从0开始，避免绘制时闪现默认大小
                fill_color: '#3498db',
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
        const size = (props.size !== undefined ? props.size : 1) * editor.pxPerUnit;
        
        const x = pos.x - size / 2;
        const y = pos.y - size / 2;
        
        setRenderOpacity(ctx, element);
        
        // 绘制填充
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
        if (fillOpacity > 0) {
            ctx.fillStyle = props.fill_color || props.color || '#3498db';
            const savedAlpha = ctx.globalAlpha;
            ctx.globalAlpha = savedAlpha * fillOpacity;
            ctx.fillRect(x, y, size, size);
            ctx.globalAlpha = savedAlpha;
        }
        
        // 绘制边框
        ctx.strokeStyle = props.stroke_color || '#2c3e50';
        ctx.lineWidth = props.stroke_width || 2;
        ctx.strokeRect(x, y, size, size);
        
        // 绘制中心点
        ctx.fillStyle = '#95a5a6';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const halfSize = props.size / 2;
        
        return Math.abs(manimX - props.x) <= halfSize &&
               Math.abs(manimY - props.y) <= halfSize;
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const size = formatNumber(props.size || 1);
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        const fillColor = hexToManimColor(props.fill_color || props.color || '#3498db');
        const strokeColor = hexToManimColor(props.stroke_color || '#2c3e50');
        
        let code = `${varName} = Square(side_length=${size})`;
        
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
    
    // ═══════════════════════════════════════════
    // 插件化v2.0新增方法
    // ═══════════════════════════════════════════
    
    getBounds: function(element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const size = (props.size || 1) * editor.pxPerUnit;
        return { x: pos.x - size/2, y: pos.y - size/2, w: size, h: size };
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        // 正方形绘制：起点是一个角，保持正方形约束
        const dx = current.manimX - start.manimX;
        const dy = current.manimY - start.manimY;
        
        // 边长取较大的距离，保持正方形
        const size = Math.max(Math.abs(dx), Math.abs(dy));
        
        // 根据拖动方向确定对角点位置
        const signX = dx >= 0 ? 1 : -1;
        const signY = dy >= 0 ? 1 : -1;
        const cornerX = start.manimX + signX * size;
        const cornerY = start.manimY + signY * size;
        
        // 中心在起点和对角点之间
        const centerX = (start.manimX + cornerX) / 2;
        const centerY = (start.manimY + cornerY) / 2;
        
        element.props.size = size;
        element.props.x = centerX;
        element.props.y = centerY;
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint } = scaleInfo;
        
        // 正方形：始终等比例
        const newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        const newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        const newSize = Math.max(newWidth, newHeight);
        
        // 根据corner确定新角位置（固定方向）
        let newCornerX, newCornerY;
        
        if (corner === 'topLeft') {
            newCornerX = fixedPoint.x - newSize;
            newCornerY = fixedPoint.y + newSize;
        } else if (corner === 'topRight') {
            newCornerX = fixedPoint.x + newSize;
            newCornerY = fixedPoint.y + newSize;
        } else if (corner === 'bottomRight') {
            newCornerX = fixedPoint.x + newSize;
            newCornerY = fixedPoint.y - newSize;
        } else { // bottomLeft
            newCornerX = fixedPoint.x - newSize;
            newCornerY = fixedPoint.y - newSize;
        }
        
        // 新中心
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        
        return {
            size: Math.max(0.1, newSize),
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
    
    properties: [
        { key: 'x', label: 'X坐标', type: 'number', step: 0.01 },
        { key: 'y', label: 'Y坐标', type: 'number', step: 0.01 },
        { key: 'size', label: '边长', type: 'number', step: 0.01, min: 0.1 },
        { key: 'fill_color', label: '填充色', type: 'color' },
        { key: 'fill_opacity', label: '填充透明度', type: 'number', step: 0.1, min: 0, max: 1 },
        { key: 'stroke_color', label: '边框色', type: 'color' },
        { key: 'stroke_width', label: '边框宽度', type: 'number', step: 0.1, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


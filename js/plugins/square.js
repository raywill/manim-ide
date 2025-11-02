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
                size: 1,
                color: '#3498db',
                opacity: 1,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const size = (props.size || 1) * 50; // 50像素 = 1 Manim单位
        
        ctx.fillStyle = props.color || '#3498db';
        ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        const x = pos.x - size / 2;
        const y = pos.y - size / 2;
        
        ctx.fillRect(x, y, size, size);
        ctx.strokeRect(x, y, size, size);
        
        // 绘制中心点
        ctx.fillStyle = '#e74c3c';
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
        const color = hexToManimColor(props.color || '#3498db');
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        let code = `${varName} = Square(side_length=${size}, color=${color})`;
        
        if (props.x !== 0 || props.y !== 0) {
            code += `.move_to([${x}, ${y}, 0])`;
        }
        
        if (props.opacity !== undefined && props.opacity !== 1) {
            code += `.set_opacity(${formatNumber(props.opacity)})`;
        }
        
        return code;
    },
    
    // ═══════════════════════════════════════════
    // 插件化v2.0新增方法
    // ═══════════════════════════════════════════
    
    getBounds: function(element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const size = (props.size || 1) * 50;
        return { x: pos.x - size/2, y: pos.y - size/2, w: size, h: size };
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        const width = Math.abs(current.manimX - start.manimX);
        const height = Math.abs(current.manimY - start.manimY);
        const size = Math.max(width, height);  // 正方形：取最大值
        const centerX = (current.manimX + start.manimX) / 2;
        const centerY = (current.manimY + start.manimY) / 2;
        
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
        { key: 'x', label: 'X坐标', type: 'number' },
        { key: 'y', label: 'Y坐标', type: 'number' },
        { key: 'size', label: '边长', type: 'number' },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'opacity', label: '不透明度', type: 'number' }
    ]
});


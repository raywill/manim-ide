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
                width: 2,
                height: 1,
                color: '#3498db',
                opacity: 1,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const width = (props.width || 2) * 50;
        const height = (props.height || 1) * 50;
        
        ctx.fillStyle = props.color || '#3498db';
        ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        const x = pos.x - width / 2;
        const y = pos.y - height / 2;
        
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        
        // 绘制中心点
        ctx.fillStyle = '#e74c3c';
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
        const color = hexToManimColor(props.color || '#3498db');
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        let code = `${varName} = Rectangle(width=${width}, height=${height}, color=${color})`;
        
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
        const w = (props.width || 2) * 50;
        const h = (props.height || 1) * 50;
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
        { key: 'x', label: 'X坐标', type: 'number' },
        { key: 'y', label: 'Y坐标', type: 'number' },
        { key: 'width', label: '宽度', type: 'number' },
        { key: 'height', label: '高度', type: 'number' },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'opacity', label: '不透明度', type: 'number' }
    ]
});


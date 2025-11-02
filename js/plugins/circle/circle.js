/**
 * Circle 插件 - 圆形
 * 
 * 数学特征：(x-h)² + (y-k)² = r²
 * 参数：中心(h,k)，半径r
 */

registerShape({
    type: 'circle',
    name: '圆形',
    icon: '⭕',
    version: '1.0.0',
    drawMode: 'drag',
    
    capabilities: {
        movable: true,
        scalable: true,
        rotatable: false,
        editable: true,
        deletable: true,
        hasControlPoints: false
    },
    
    // ═══════════════════════════════════════════
    // 生命周期：创建
    // ═══════════════════════════════════════════
    createDefault: function(x, y) {
        return {
            type: 'circle',
            name: 'circle_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,
                y: y || 0,
                radius: 1,
                color: '#3498db',
                opacity: 1,
                hidden: false
            }
        };
    },
    
    // ═══════════════════════════════════════════
    // 生命周期：渲染
    // ═══════════════════════════════════════════
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const radius = (props.radius || 1) * 50;  // Manim单位 → 像素
        
        // 调试日志
        if (element.id === editor.selectedElement?.id) {
            console.log(`[Circle.render] center=(${props.x.toFixed(2)}, ${props.y.toFixed(2)}), radius=${props.radius.toFixed(2)} Manim = ${radius.toFixed(0)}px`);
        }
        
        ctx.fillStyle = props.color || '#3498db';
        ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 绘制中心点
        ctx.fillStyle = '#95a5a6';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    // ═══════════════════════════════════════════
    // 生命周期：拖动绘制
    // ═══════════════════════════════════════════
    updateWhileDrawing: function(element, start, current, editor) {
        // 中心在起点
        element.props.x = start.manimX;
        element.props.y = start.manimY;
        
        // 半径 = 起点到当前点的距离
        const dx = current.manimX - start.manimX;
        const dy = current.manimY - start.manimY;
        element.props.radius = Math.sqrt(dx * dx + dy * dy);
    },
    
    // ═══════════════════════════════════════════
    // 交互：碰撞检测
    // ═══════════════════════════════════════════
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const dx = manimX - props.x;
        const dy = manimY - props.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= props.radius + 0.1;
    },
    
    // ═══════════════════════════════════════════
    // 交互：边界框
    // ═══════════════════════════════════════════
    getBounds: function(element, editor) {
        const props = element.props;
        const radius = props.radius || 1;  // Manim单位
        
        // 计算圆在Manim坐标下的四个外接点
        const left = props.x - radius;
        const right = props.x + radius;
        const top = props.y + radius;
        const bottom = props.y - radius;
        
        // 转换到Canvas坐标
        const topLeftCanvas = editor.manimToCanvas(left, top);
        const bottomRightCanvas = editor.manimToCanvas(right, bottom);
        
        console.log(`[Circle.getBounds] center=(${props.x}, ${props.y}), radius=${radius}`);
        console.log(`  Manim: topLeft=(${left}, ${top}), bottomRight=(${right}, ${bottom})`);
        console.log(`  Canvas: topLeft=(${topLeftCanvas.x}, ${topLeftCanvas.y}), bottomRight=(${bottomRightCanvas.x}, ${bottomRightCanvas.y})`);
        
        return {
            x: topLeftCanvas.x,
            y: topLeftCanvas.y,
            w: bottomRightCanvas.x - topLeftCanvas.x,
            h: bottomRightCanvas.y - topLeftCanvas.y
        };
    },
    
    // ═══════════════════════════════════════════
    // 交互：缩放处理
    // ═══════════════════════════════════════════
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint } = scaleInfo;
        
        // 圆形：边界框是正方形，边长 = 2 * radius
        // 所以新尺寸（边界框的宽高）= 2 * 新半径
        const newBBoxWidth = Math.abs(currentPoint.x - fixedPoint.x);
        const newBBoxHeight = Math.abs(currentPoint.y - fixedPoint.y);
        const newBBoxSize = Math.max(newBBoxWidth, newBBoxHeight);
        
        // 新半径 = 新边界框尺寸 / 2
        const newRadius = newBBoxSize / 2;
        
        // 根据corner确定新角位置（使用边界框尺寸）
        let newCornerX, newCornerY;
        
        if (corner === 'topLeft') {
            newCornerX = fixedPoint.x - newBBoxSize;
            newCornerY = fixedPoint.y + newBBoxSize;
        } else if (corner === 'topRight') {
            newCornerX = fixedPoint.x + newBBoxSize;
            newCornerY = fixedPoint.y + newBBoxSize;
        } else if (corner === 'bottomRight') {
            newCornerX = fixedPoint.x + newBBoxSize;
            newCornerY = fixedPoint.y - newBBoxSize;
        } else { // bottomLeft
            newCornerX = fixedPoint.x - newBBoxSize;
            newCornerY = fixedPoint.y - newBBoxSize;
        }
        
        // 新中心
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        
        return {
            radius: Math.max(0.1, newRadius),
            x: newCenterX,
            y: newCenterY
        };
    },
    
    // ═══════════════════════════════════════════
    // 交互：移动处理
    // ═══════════════════════════════════════════
    handleMove: function(element, moveInfo, editor) {
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    },
    
    // ═══════════════════════════════════════════
    // 导出：Manim代码
    // ═══════════════════════════════════════════
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const radius = formatNumber(props.radius || 1);
        const color = hexToManimColor(props.color || '#3498db');
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        let code = `${varName} = Circle(radius=${radius}, color=${color})`;
        
        if (props.x !== 0 || props.y !== 0) {
            code += `.move_to([${x}, ${y}, 0])`;
        }
        
        if (props.opacity !== undefined && props.opacity !== 1) {
            code += `.set_opacity(${formatNumber(props.opacity)})`;
        }
        
        return code;
    },
    
    // ═══════════════════════════════════════════
    // 配置：属性定义
    // ═══════════════════════════════════════════
    properties: [
        { key: 'x', label: 'X坐标', type: 'number', step: 0.1, group: 'position' },
        { key: 'y', label: 'Y坐标', type: 'number', step: 0.1, group: 'position' },
        { key: 'radius', label: '半径', type: 'number', step: 0.1, min: 0.1, group: 'size' },
        { key: 'color', label: '颜色', type: 'color', group: 'style' },
        { key: 'opacity', label: '不透明度', type: 'number', step: 0.1, min: 0, max: 1, group: 'style' }
    ]
});


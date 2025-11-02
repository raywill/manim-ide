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
                radius: 0,  // 从0开始，避免绘制时闪现默认大小
                fill_color: '#3498db',
                stroke_color: '#2c3e50',
                fill_opacity: 1,
                stroke_width: 2,
                z_order: 0,
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
        const radius = (props.radius !== undefined ? props.radius : 1) * 50;
        
        setRenderOpacity(ctx, element);
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        
        // 绘制填充
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
        if (fillOpacity > 0) {
            ctx.fillStyle = props.fill_color || props.color || '#3498db';
            const savedAlpha = ctx.globalAlpha;
            ctx.globalAlpha = savedAlpha * fillOpacity;
            ctx.fill();
            ctx.globalAlpha = savedAlpha;
        }
        
        // 绘制边框
        ctx.strokeStyle = props.stroke_color || '#2c3e50';
        ctx.lineWidth = props.stroke_width || 2;
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
    // 交互：移动锚点
    // ═══════════════════════════════════════════
    getMoveAnchor: function(element) {
        const props = element.props;
        return {
            x: props.x !== undefined ? props.x : 0,
            y: props.y !== undefined ? props.y : 0
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
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        const fillColor = hexToManimColor(props.fill_color || props.color || '#3498db');
        const strokeColor = hexToManimColor(props.stroke_color || '#2c3e50');
        
        let code = `${varName} = Circle(radius=${radius})`;
        
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
    // 数据升级：兼容旧版本数据
    // ═══════════════════════════════════════════
    onUpgrade: function(props) {
        // 为旧数据补充新属性的默认值
        const upgraded = { ...props };
        
        // v2.0 新增：fill/stroke 分离
        if (upgraded.fill_color === undefined) {
            upgraded.fill_color = upgraded.color || '#3498db';
        }
        if (upgraded.stroke_color === undefined) {
            upgraded.stroke_color = '#2c3e50';
        }
        if (upgraded.fill_opacity === undefined) {
            upgraded.fill_opacity = upgraded.opacity !== undefined ? upgraded.opacity : 1;
        }
        if (upgraded.stroke_width === undefined) {
            upgraded.stroke_width = 2;
        }
        
        // v2.1 新增：z_order
        if (upgraded.z_order === undefined) {
            upgraded.z_order = 0;
        }
        
        return upgraded;
    },
    
    // ═══════════════════════════════════════════
    // 配置：属性定义
    // ═══════════════════════════════════════════
    properties: [
        { key: 'x', label: 'X坐标', type: 'number', step: 0.01 },
        { key: 'y', label: 'Y坐标', type: 'number', step: 0.01 },
        { key: 'radius', label: '半径', type: 'number', step: 0.01, min: 0.1 },
        { key: 'fill_color', label: '填充色', type: 'color' },
        { key: 'fill_opacity', label: '填充透明度', type: 'number', step: 0.1, min: 0, max: 1 },
        { key: 'stroke_color', label: '边框色', type: 'color' },
        { key: 'stroke_width', label: '边框宽度', type: 'number', step: 0.1, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


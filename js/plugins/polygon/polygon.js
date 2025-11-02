/**
 * Polygon 插件 - 正N边形
 * 
 * 特点：
 * - 支持3到512边的正多边形
 * - 默认为正六边形（N=6）
 * - 拖动绘制，自动计算顶点位置
 * - 支持填充色和边框色分离
 */

registerShape({
    type: 'polygon',
    name: '正多边形',
    icon: '⬡',
    version: '1.0.0',
    drawMode: 'drag',
    
    createDefault: function(x, y) {
        return {
            type: 'polygon',
            name: 'polygon_' + (ManimEditor.elements.length + 1),
            props: {
                x: x !== undefined ? x : 0,
                y: y !== undefined ? y : 0,
                radius: 0,  // 从0开始，避免绘制时闪现默认大小
                n: 6,  // 边数，默认正六边形
                fill_color: '#e74c3c',
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
        const x = props.x !== undefined ? props.x : 0;
        const y = props.y !== undefined ? props.y : 0;
        const radius = props.radius !== undefined ? props.radius : 1.5;
        const n = Math.max(3, Math.min(512, Math.floor(props.n || 6)));
        
        const center = editor.manimToCanvas(x, y);
        const radiusPixels = radius * editor.pxPerUnit;
        
        setRenderOpacity(ctx, element);
        
        // 计算正N边形的顶点
        const vertices = [];
        for (let i = 0; i < n; i++) {
            const angle = (Math.PI / 2) + (2 * Math.PI * i / n);  // 从顶部开始
            const vx = center.x + radiusPixels * Math.cos(angle);
            const vy = center.y - radiusPixels * Math.sin(angle);  // Canvas Y轴向下
            vertices.push({ x: vx, y: vy });
        }
        
        // 绘制多边形
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < n; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        
        // 绘制填充
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
        if (fillOpacity > 0) {
            ctx.fillStyle = props.fill_color || '#e74c3c';
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
        ctx.arc(center.x, center.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        const dx = current.manimX - start.manimX;
        const dy = current.manimY - start.manimY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        
        element.props.x = start.manimX;
        element.props.y = start.manimY;
        element.props.radius = Math.max(0.1, radius);
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const x = props.x !== undefined ? props.x : 0;
        const y = props.y !== undefined ? props.y : 0;
        const radius = props.radius !== undefined ? props.radius : 1.5;
        const n = Math.max(3, Math.min(512, Math.floor(props.n || 6)));
        
        // 计算正N边形的顶点（Manim坐标）
        const vertices = [];
        for (let i = 0; i < n; i++) {
            const angle = (Math.PI / 2) + (2 * Math.PI * i / n);
            const vx = x + radius * Math.cos(angle);
            const vy = y + radius * Math.sin(angle);
            vertices.push([vx, vy]);
        }
        
        // 使用射线法判断点是否在多边形内
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = vertices[i][0], yi = vertices[i][1];
            const xj = vertices[j][0], yj = vertices[j][1];
            
            const intersect = ((yi > manimY) !== (yj > manimY))
                && (manimX < (xj - xi) * (manimY - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        
        return inside;
    },
    
    getBounds: function(element, editor) {
        const props = element.props;
        const x = props.x !== undefined ? props.x : 0;
        const y = props.y !== undefined ? props.y : 0;
        const radius = props.radius !== undefined ? props.radius : 1.5;
        
        // 外接矩形就是圆的外接矩形
        const left = x - radius;
        const right = x + radius;
        const top = y + radius;
        const bottom = y - radius;
        
        const topLeft = editor.manimToCanvas(left, top);
        const bottomRight = editor.manimToCanvas(right, bottom);
        
        return {
            x: topLeft.x,
            y: topLeft.y,
            w: bottomRight.x - topLeft.x,
            h: bottomRight.y - topLeft.y
        };
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint } = scaleInfo;
        
        // 正多边形：边界框是正方形，边长 = 2 * radius
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
    
    handleMove: function(element, moveInfo) {
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    },
    
    getMoveAnchor: function(element) {
        const props = element.props;
        return {
            x: props.x !== undefined ? props.x : 0,
            y: props.y !== undefined ? props.y : 0
        };
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const x = props.x !== undefined ? props.x : 0;
        const y = props.y !== undefined ? props.y : 0;
        const radius = props.radius !== undefined ? props.radius : 1.5;
        const n = Math.max(3, Math.min(512, Math.floor(props.n || 6)));
        
        const fillColor = hexToManimColor(props.fill_color || '#e74c3c');
        const strokeColor = hexToManimColor(props.stroke_color || '#2c3e50');
        
        let code = `${varName} = RegularPolygon(n=${n}, radius=${formatNumber(radius)})`;
        
        if (x !== 0 || y !== 0) {
            code += `.move_to([${formatNumber(x)}, ${formatNumber(y)}, 0])`;
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
        { key: 'radius', label: '半径', type: 'number', step: 0.01, min: 0.1 },
        { key: 'n', label: '边数', type: 'number', step: 1, min: 3, max: 512 },
        { key: 'fill_color', label: '填充色', type: 'color' },
        { key: 'fill_opacity', label: '填充透明度', type: 'number', step: 0.1, min: 0, max: 1 },
        { key: 'stroke_color', label: '边框色', type: 'color' },
        { key: 'stroke_width', label: '边框宽度', type: 'number', step: 0.1, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


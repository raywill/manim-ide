/**
 * Arrow 插件
 */

registerShape({
    type: 'arrow',
    name: '箭头',
    icon: '→',
    version: '2.0.0-migrated',
    
    createDefault: function(x, y) {
        return {
            type: 'arrow',
            name: 'arrow_' + (ManimEditor.elements.length + 1),
            props: {
                start: [x !== undefined ? x : 0, y !== undefined ? y : 0, 0],
                end: [x !== undefined ? x : 0, y !== undefined ? y : 0, 0],
                color: '#e74c3c',
                stroke_width: 2,
                z_order: 0,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const start = editor.manimToCanvas(props.start[0], props.start[1]);
        const end = editor.manimToCanvas(props.end[0], props.end[1]);
        
        ctx.strokeStyle = props.color || '#e74c3c';
        ctx.fillStyle = props.color || '#e74c3c';
        ctx.lineWidth = props.stroke_width || 2;
        
        // 计算箭头参数
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLength = 15;  // 箭头头部长度
        const headWidth = 10;   // 箭头头部宽度
        
        // 箭头尖端位置
        const tipX = end.x;
        const tipY = end.y;
        
        // 箭头底部中心（tip向后退headLength）
        const baseX = tipX - headLength * Math.cos(angle);
        const baseY = tipY - headLength * Math.sin(angle);
        
        // 绘制箭头线（从start到箭头底部）
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(baseX, baseY);
        ctx.stroke();
        
        // 绘制实心箭头头部
        const perpAngle = angle + Math.PI / 2;
        const leftX = baseX + (headWidth / 2) * Math.cos(perpAngle);
        const leftY = baseY + (headWidth / 2) * Math.sin(perpAngle);
        const rightX = baseX - (headWidth / 2) * Math.cos(perpAngle);
        const rightY = baseY - (headWidth / 2) * Math.sin(perpAngle);
        
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fill();  // 实心填充
        ctx.stroke();
        
        // 绘制起点标记
        ctx.fillStyle = props.color || '#e74c3c';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const startX = props.start[0];
        const startY = props.start[1];
        const endX = props.end[0];
        const endY = props.end[1];
        
        // 计算点到线段的距离
        const dx = endX - startX;
        const dy = endY - startY;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            // 起点和终点相同
            const dist = Math.sqrt((manimX - startX) ** 2 + (manimY - startY) ** 2);
            return dist < 0.3;
        }
        
        const t = Math.max(0, Math.min(1, 
            ((manimX - startX) * dx + (manimY - startY) * dy) / lengthSquared
        ));
        
        const projX = startX + t * dx;
        const projY = startY + t * dy;
        const dist = Math.sqrt((manimX - projX) ** 2 + (manimY - projY) ** 2);
        
        return dist < 0.3; // 0.3 Manim单位的容差
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const color = hexToManimColor(props.color || '#e74c3c');
        const startX = formatNumber(props.start[0]);
        const startY = formatNumber(props.start[1]);
        const endX = formatNumber(props.end[0]);
        const endY = formatNumber(props.end[1]);
        
        // 关键修复：添加buff=0让箭头尖端到达end点（首尾相连）
        let code = `${varName} = Arrow(start=[${startX}, ${startY}, 0], end=[${endX}, ${endY}, 0], color=${color}, buff=0`;
        
        if (props.stroke_width && props.stroke_width !== 2) {
            code += `, stroke_width=${formatNumber(props.stroke_width)}`;
        }
        
        code += ')';
        
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
        const start = editor.manimToCanvas(props.start[0], props.start[1]);
        const end = editor.manimToCanvas(props.end[0], props.end[1]);
        const minX = Math.min(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxX = Math.max(start.x, end.x);
        const maxY = Math.max(start.y, end.y);
        
        // 注意：不加padding！padding会导致缩放时固定点计算错误
        // 如果需要更大的点击区域，在选择框绘制时加padding
        return { 
            x: minX, 
            y: minY, 
            w: maxX - minX, 
            h: maxY - minY 
        };
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        element.props.start = [start.manimX, start.manimY, 0];
        element.props.end = [current.manimX, current.manimY, 0];
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        
        const start = { x: originalProps.start[0], y: originalProps.start[1] };
        const end = { x: originalProps.end[0], y: originalProps.end[1] };
        const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        const originalWidth = maxX - minX;
        const originalHeight = maxY - minY;
        
        // 步骤1：计算新尺寸
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        // 步骤2：等比例调整
        if (isShift && originalWidth > 0 && originalHeight > 0) {
            const scaleW = newWidth / originalWidth;
            const scaleH = newHeight / originalHeight;
            const scale = Math.max(scaleW, scaleH);
            
            newWidth = originalWidth * scale;
            newHeight = originalHeight * scale;
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
        
        // 步骤4：新中心
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        
        // 步骤5：缩放起点和终点
        const scaleX = originalWidth > 0 ? newWidth / originalWidth : 1;
        const scaleY = originalHeight > 0 ? newHeight / originalHeight : 1;
        
        const newStart = [
            newCenterX + (start.x - center.x) * scaleX,
            newCenterY + (start.y - center.y) * scaleY,
            0
        ];
        const newEnd = [
            newCenterX + (end.x - center.x) * scaleX,
            newCenterY + (end.y - center.y) * scaleY,
            0
        ];
        
        return { start: newStart, end: newEnd };
    },
    
    getMoveAnchor: function(element) {
        // arrow：使用增量移动，返回null
        return null;
    },
    
    handleMove: function(element, moveInfo, editor) {
        // arrow的移动：平移起点和终点
        // 使用增量方式移动
        if (moveInfo.deltaX !== undefined && moveInfo.deltaY !== undefined) {
            return {
                start: [
                    element.props.start[0] + moveInfo.deltaX,
                    element.props.start[1] + moveInfo.deltaY,
                    0
                ],
                end: [
                    element.props.end[0] + moveInfo.deltaX,
                    element.props.end[1] + moveInfo.deltaY,
                    0
                ]
            };
        }
        return {};
    },
    
    properties: [
        { key: 'start[0]', label: '起点X', type: 'number' },
        { key: 'start[1]', label: '起点Y', type: 'number' },
        { key: 'end[0]', label: '终点X', type: 'number' },
        { key: 'end[1]', label: '终点Y', type: 'number' },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number' },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


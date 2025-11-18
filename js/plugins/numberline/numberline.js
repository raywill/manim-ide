/**
 * NumberLine 插件 - 一维数轴
 * 
 * 特点：
 * - 水平数轴，支持拖动绘制
 * - 可配置最小值、最大值、步长
 * - 自动绘制刻度和数字标签
 */

// ═══════════════════════════════════════════
// 默认配置
// ═══════════════════════════════════════════
const NUMBERLINE_DEFAULT_SETTINGS = {
    min: 0,
    max: 10,
    step: 1,
    color: '#2c3e50',
    stroke_width: 2,
    tick_size: 0.2,
    include_numbers: true,
    z_order: 0
};

registerShape({
    type: 'numberline',
    name: '数轴',
    icon: '━',
    version: '1.0.0',
    drawMode: 'drag',
    
    createDefault: function(x, y) {
        return {
            type: 'numberline',
            name: 'numberline_' + (ManimEditor.elements.length + 1),
            props: {
                start: [x !== undefined ? x : 0, y !== undefined ? y : 0, 0],
                end: [x !== undefined ? x : 0, y !== undefined ? y : 0, 0],
                min: NUMBERLINE_DEFAULT_SETTINGS.min,
                max: NUMBERLINE_DEFAULT_SETTINGS.max,
                step: NUMBERLINE_DEFAULT_SETTINGS.step,
                color: NUMBERLINE_DEFAULT_SETTINGS.color,
                stroke_width: NUMBERLINE_DEFAULT_SETTINGS.stroke_width,
                tick_size: NUMBERLINE_DEFAULT_SETTINGS.tick_size,
                include_numbers: NUMBERLINE_DEFAULT_SETTINGS.include_numbers,
                z_order: NUMBERLINE_DEFAULT_SETTINGS.z_order,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const start = editor.manimToCanvas(props.start[0], props.start[1]);
        const end = editor.manimToCanvas(props.end[0], props.end[1]);
        
        const min = props.min !== undefined ? props.min : NUMBERLINE_DEFAULT_SETTINGS.min;
        const max = props.max !== undefined ? props.max : NUMBERLINE_DEFAULT_SETTINGS.max;
        const step = props.step !== undefined ? props.step : NUMBERLINE_DEFAULT_SETTINGS.step;
        const tickSize = props.tick_size !== undefined ? props.tick_size : NUMBERLINE_DEFAULT_SETTINGS.tick_size;
        const includeNumbers = props.include_numbers !== undefined ? props.include_numbers : NUMBERLINE_DEFAULT_SETTINGS.include_numbers;
        
        setRenderOpacity(ctx, element);
        
        ctx.strokeStyle = props.color || NUMBERLINE_DEFAULT_SETTINGS.color;
        ctx.lineWidth = props.stroke_width || NUMBERLINE_DEFAULT_SETTINGS.stroke_width;
        ctx.fillStyle = props.color || NUMBERLINE_DEFAULT_SETTINGS.color;
        
        // 计算数轴长度和方向
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < 1) return; // 太短不绘制
        
        // 单位向量
        const ux = dx / length;
        const uy = dy / length;
        
        // 垂直向量（用于绘制刻度）
        const vx = -uy;
        const vy = ux;
        
        // 箭头参数
        const headLength = 15;  // 箭头头部长度
        const headWidth = 10;   // 箭头头部宽度
        
        // 箭头尖端位置
        const tipX = end.x;
        const tipY = end.y;
        
        // 箭头底部中心（tip向后退headLength）
        const angle = Math.atan2(dy, dx);
        const baseX = tipX - headLength * Math.cos(angle);
        const baseY = tipY - headLength * Math.sin(angle);
        
        // 绘制主轴线（从start到箭头底部，无空隙）
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
        
        // 计算刻度数量
        const range = max - min;
        if (range <= 0 || step <= 0) return;
        
        // 计算小数位数（与步长一致）
        const decimals = step % 1 === 0 ? 0 : step.toString().split('.')[1]?.length || 0;
        
        // 绘制刻度和数字
        ctx.lineWidth = 1;
        ctx.font = '12px Arial';
        ctx.fillStyle = props.color || NUMBERLINE_DEFAULT_SETTINGS.color;
        
        // 刻度大小（固定像素值，不受zoom影响）
        const tickSizeCanvas = 8;  // 刻度线半长，单位：像素
        
        // 从min到max绘制刻度（跳过首尾）
        for (let value = min; value <= max; value = parseFloat((value + step).toFixed(10))) {
            if (value > max) break;
            
            // 跳过首尾刻度
            if (value === min || value === max) continue;
            
            // 计算刻度位置（在数轴上的比例）
            const t = (value - min) / range;
            const tickX = start.x + t * dx;
            const tickY = start.y + t * dy;
            
            // 绘制刻度线（只在数轴上方/左侧，不穿过数轴）
            ctx.strokeStyle = props.color || NUMBERLINE_DEFAULT_SETTINGS.color;
            ctx.lineWidth = 2;  // 刻度线稍粗一点，更明显
            ctx.beginPath();
            ctx.moveTo(tickX, tickY);  // 从数轴上的点开始
            ctx.lineTo(tickX - vx * tickSizeCanvas, tickY - vy * tickSizeCanvas);  // 向另一侧延伸（上方）
            ctx.stroke();
            
            // 绘制数字标签
            if (includeNumbers) {
                const labelOffset = tickSizeCanvas + 15;
                const labelX = tickX + vx * labelOffset;
                const labelY = tickY + vy * labelOffset;
                
                // 格式化数字（根据步长的小数位数）
                const label = value.toFixed(decimals);
                
                // 根据数轴角度调整文字对齐方式
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                
                ctx.fillText(label, labelX, labelY);
            }
        }
        
        // 绘制起点
        ctx.beginPath();
        ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
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
            const dist = Math.sqrt((manimX - startX) ** 2 + (manimY - startY) ** 2);
            return dist < 0.3;
        }
        
        const t = Math.max(0, Math.min(1, 
            ((manimX - startX) * dx + (manimY - startY) * dy) / lengthSquared
        ));
        
        const projX = startX + t * dx;
        const projY = startY + t * dy;
        const dist = Math.sqrt((manimX - projX) ** 2 + (manimY - projY) ** 2);
        
        return dist < 0.3;
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const color = hexToManimColor(props.color || NUMBERLINE_DEFAULT_SETTINGS.color);
        const startX = formatNumber(props.start[0]);
        const startY = formatNumber(props.start[1]);
        const endX = formatNumber(props.end[0]);
        const endY = formatNumber(props.end[1]);
        
        const min = props.min !== undefined ? props.min : NUMBERLINE_DEFAULT_SETTINGS.min;
        const max = props.max !== undefined ? props.max : NUMBERLINE_DEFAULT_SETTINGS.max;
        const step = props.step !== undefined ? props.step : NUMBERLINE_DEFAULT_SETTINGS.step;
        const includeNumbers = props.include_numbers !== undefined ? props.include_numbers : NUMBERLINE_DEFAULT_SETTINGS.include_numbers;
        
        // 计算数轴长度
        const dx = props.end[0] - props.start[0];
        const dy = props.end[1] - props.start[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        
        let code = `${varName} = NumberLine(\n`;
        code += `    x_range=[${min}, ${max}, ${step}],\n`;
        code += `    length=${formatNumber(length)},\n`;
        code += `    color=${color},\n`;
        code += `    include_tip=True`;
        
        if (props.stroke_width && props.stroke_width !== NUMBERLINE_DEFAULT_SETTINGS.stroke_width) {
            code += `,\n    stroke_width=${formatNumber(props.stroke_width)}`;
        }
        
        if (!includeNumbers) {
            code += `,\n    include_numbers=False`;
        }
        
        code += '\n)';
        
        // 移动到起点位置
        code += `.move_to([${startX}, ${startY}, 0])`;
        
        // 如果不是水平的，需要旋转
        if (Math.abs(dy) > 0.01) {
            const angle = Math.atan2(dy, dx);
            code += `.rotate(${formatNumber(angle)})`;
        }
        
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
        
        // 添加一些padding以包含刻度和标签
        const padding = 30;
        
        return { 
            x: minX - padding, 
            y: minY - padding, 
            w: maxX - minX + padding * 2, 
            h: maxY - minY + padding * 2 
        };
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        const target = current.isShift && editor?.utils?.getAxisLockedPoint
            ? editor.utils.getAxisLockedPoint(start, current, editor)
            : current;

        element.props.start = [start.manimX, start.manimY, 0];
        element.props.end = [target.manimX, target.manimY, 0];
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
        // numberline：使用增量移动，返回null
        return null;
    },
    
    handleMove: function(element, moveInfo, editor) {
        // numberline的移动：平移起点和终点
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
        { key: 'min', label: '最小值', type: 'number' },
        { key: 'max', label: '最大值', type: 'number' },
        { key: 'step', label: '步长', type: 'number', step: 0.1 },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number' },
        { key: 'tick_size', label: '刻度大小', type: 'number', step: 0.1 },
        { key: 'include_numbers', label: '显示数字', type: 'checkbox' },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});

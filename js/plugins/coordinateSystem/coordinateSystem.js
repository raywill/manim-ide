/**
 * CoordinateSystem 插件 - 坐标系
 */

registerShape({
    type: 'coordinateSystem',
    name: '坐标系',
    icon: '📐',
    version: '2.0.0-migrated',
    
    createDefault: function(x, y) {
        return {
            type: 'coordinateSystem',
            name: 'axes_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,
                y: y || 0,
                x_range: [-3, 3, 1],
                y_range: [-3, 3, 1],
                x_length: 6,
                y_length: 6,
                axis_color: '#7f8c8d',
                tips: true,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const center = editor.manimToCanvas(props.x, props.y);
        
        const xRange = props.x_range || [-3, 3, 1];
        const yRange = props.y_range || [-3, 3, 1];
        const xMin = xRange[0];
        const xMax = xRange[1];
        const yMin = yRange[0];
        const yMax = yRange[1];
        const xLength = (props.x_length || 6) * editor.pxPerUnit; // 总长度（像素）
        const yLength = (props.y_length || 6) * editor.pxPerUnit;
        
        // 计算0点在坐标轴上的位置（不一定在中心）
        // 0点在X轴上的位置：从min到0的比例
        const xRangeTotal = xMax - xMin;
        const yRangeTotal = yMax - yMin;
        const zeroXRatio = xRangeTotal > 0 ? (0 - xMin) / xRangeTotal : 0.5;
        const zeroYRatio = yRangeTotal > 0 ? (0 - yMin) / yRangeTotal : 0.5;
        
        // X轴的起止位置（Canvas坐标）
        const xStart = center.x - xLength / 2;
        const xEnd = center.x + xLength / 2;
        const zeroXPos = xStart + xLength * zeroXRatio;  // 0点的X位置
        
        // Y轴的起止位置（Canvas坐标）
        const yStart = center.y + yLength / 2;  // 下端（Y值小）
        const yEnd = center.y - yLength / 2;    // 上端（Y值大）
        const zeroYPos = yStart - yLength * zeroYRatio;  // 0点的Y位置
        
        ctx.strokeStyle = props.axis_color || '#7f8c8d';
        ctx.lineWidth = 2;
        
        // 绘制X轴（水平线）
        ctx.beginPath();
        ctx.moveTo(xStart, zeroYPos);
        ctx.lineTo(xEnd, zeroYPos);
        ctx.stroke();
        
        // 绘制Y轴（垂直线）
        ctx.beginPath();
        ctx.moveTo(zeroXPos, yStart);
        ctx.lineTo(zeroXPos, yEnd);
        ctx.stroke();
        
        // 绘制箭头（如果启用）
        if (props.tips) {
            const arrowSize = 10;
            
            // X轴箭头（右端）
            ctx.beginPath();
            ctx.moveTo(xEnd, zeroYPos);
            ctx.lineTo(xEnd - arrowSize, zeroYPos - arrowSize / 2);
            ctx.lineTo(xEnd - arrowSize, zeroYPos + arrowSize / 2);
            ctx.closePath();
            ctx.fillStyle = props.axis_color || '#7f8c8d';
            ctx.fill();
            
            // Y轴箭头（上端）
            ctx.beginPath();
            ctx.moveTo(zeroXPos, yEnd);
            ctx.lineTo(zeroXPos - arrowSize / 2, yEnd + arrowSize);
            ctx.lineTo(zeroXPos + arrowSize / 2, yEnd + arrowSize);
            ctx.closePath();
            ctx.fill();
        }
        
        // 绘制刻度线
        ctx.lineWidth = 1;
        ctx.font = '12px monospace';
        ctx.fillStyle = props.axis_color || '#7f8c8d';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // X轴刻度 - 从0开始向两边绘制
        const xStep = xRange[2] || 1;
        
        // 计算小数位数（与步长一致）
        const xDecimals = xStep % 1 === 0 ? 0 : xStep.toString().split('.')[1]?.length || 0;
        
        // 从0向右绘制
        for (let i = 0; i <= xMax; i = parseFloat((i + xStep).toFixed(10))) {
            if (i === 0 || i > xMax) continue;
            // X坐标 = zeroXPos + (i相对于0的距离/单位长度) * 像素长度
            const pixelsPerUnit = xLength / xRangeTotal;
            const x = zeroXPos + i * pixelsPerUnit;
            ctx.beginPath();
            ctx.moveTo(x, zeroYPos - 5);
            ctx.lineTo(x, zeroYPos + 5);
            ctx.stroke();
            ctx.fillText(i.toFixed(xDecimals), x, zeroYPos + 8);
        }
        
        // 从0向左绘制
        for (let i = 0; i >= xMin; i = parseFloat((i - xStep).toFixed(10))) {
            if (i === 0 || i < xMin) continue;
            const pixelsPerUnit = xLength / xRangeTotal;
            const x = zeroXPos + i * pixelsPerUnit;
            ctx.beginPath();
            ctx.moveTo(x, zeroYPos - 5);
            ctx.lineTo(x, zeroYPos + 5);
            ctx.stroke();
            ctx.fillText(i.toFixed(xDecimals), x, zeroYPos + 8);
        }
        
        // Y轴刻度 - 从0开始向两边绘制
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const yStep = yRange[2] || 1;
        
        // 计算小数位数（与步长一致）
        const yDecimals = yStep % 1 === 0 ? 0 : yStep.toString().split('.')[1]?.length || 0;
        
        // 从0向上绘制
        for (let i = 0; i <= yMax; i = parseFloat((i + yStep).toFixed(10))) {
            if (i === 0 || i > yMax) continue;
            // Y坐标 = zeroYPos - (i相对于0的距离/单位长度) * 像素长度
            // 注意：Canvas Y向下，所以是减号
            const pixelsPerUnit = yLength / yRangeTotal;
            const y = zeroYPos - i * pixelsPerUnit;
            ctx.beginPath();
            ctx.moveTo(zeroXPos - 5, y);
            ctx.lineTo(zeroXPos + 5, y);
            ctx.stroke();
            ctx.fillText(i.toFixed(yDecimals), zeroXPos - 8, y);
        }
        
        // 从0向下绘制
        for (let i = 0; i >= yMin; i = parseFloat((i - yStep).toFixed(10))) {
            if (i === 0 || i < yMin) continue;
            const pixelsPerUnit = yLength / yRangeTotal;
            const y = zeroYPos - i * pixelsPerUnit;
            ctx.beginPath();
            ctx.moveTo(zeroXPos - 5, y);
            ctx.lineTo(zeroXPos + 5, y);
            ctx.stroke();
            ctx.fillText(i.toFixed(yDecimals), zeroXPos - 8, y);
        }
        
        // 绘制原点标记（在0,0位置，不是中心）
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(zeroXPos, zeroYPos, 4, 0, Math.PI * 2);
        ctx.fill();
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const xLength = props.x_length || 6;
        const yLength = props.y_length || 6;
        
        const dx = Math.abs(manimX - props.x);
        const dy = Math.abs(manimY - props.y);
        
        // 检查是否在坐标系范围内
        return dx <= xLength / 2 && dy <= yLength / 2;
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const xRange = props.x_range || [-3, 3, 1];
        const yRange = props.y_range || [-3, 3, 1];
        const xLength = formatNumber(props.x_length || 6);
        const yLength = formatNumber(props.y_length || 6);
        const color = hexToManimColor(props.axis_color || '#7f8c8d');
        
        let code = `${varName} = Axes(`;
        code += `x_range=[${xRange.map(formatNumber).join(', ')}], `;
        code += `y_range=[${yRange.map(formatNumber).join(', ')}], `;
        code += `x_length=${xLength}, `;
        code += `y_length=${yLength}, `;
        code += `axis_config={"color": ${color}}`;
        
        if (!props.tips) {
            code += `, tips=False`;
        }
        
        code += ')';
        
        if (props.x !== 0 || props.y !== 0) {
            code += `.move_to([${formatNumber(props.x)}, ${formatNumber(props.y)}, 0])`;
        }
        
        return code;
    },
    
    // ═══════════════════════════════════════════
    // 插件化v2.0新增方法
    // ═══════════════════════════════════════════
    
    getBounds: function(element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const w = (props.x_length || 6) * editor.pxPerUnit;
        const h = (props.y_length || 6) * editor.pxPerUnit;
        return { x: pos.x - w/2, y: pos.y - h/2, w, h };
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        const width = Math.abs(current.manimX - start.manimX);
        const height = Math.abs(current.manimY - start.manimY);
        const centerX = (current.manimX + start.manimX) / 2;
        const centerY = (current.manimY + start.manimY) / 2;
        
        element.props.x = centerX;
        element.props.y = centerY;
        element.props.x_length = Math.max(width * 2, 2);
        element.props.y_length = Math.max(height * 2, 2);
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        
        // 步骤1：计算新尺寸
        let newXLength = Math.abs(currentPoint.x - fixedPoint.x);
        let newYLength = Math.abs(currentPoint.y - fixedPoint.y);
        
        // 步骤2：等比例调整
        if (isShift) {
            const scaleX = newXLength / originalProps.x_length;
            const scaleY = newYLength / originalProps.y_length;
            const scale = Math.max(scaleX, scaleY);
            
            newXLength = originalProps.x_length * scale;
            newYLength = originalProps.y_length * scale;
        }
        
        // 步骤3：根据corner确定新角位置（固定方向）
        let newCornerX, newCornerY;
        
        if (corner === 'topLeft') {
            newCornerX = fixedPoint.x - newXLength;
            newCornerY = fixedPoint.y + newYLength;
        } else if (corner === 'topRight') {
            newCornerX = fixedPoint.x + newXLength;
            newCornerY = fixedPoint.y + newYLength;
        } else if (corner === 'bottomRight') {
            newCornerX = fixedPoint.x + newXLength;
            newCornerY = fixedPoint.y - newYLength;
        } else { // bottomLeft
            newCornerX = fixedPoint.x - newXLength;
            newCornerY = fixedPoint.y - newYLength;
        }
        
        // 步骤4：新中心
        const newX = (fixedPoint.x + newCornerX) / 2;
        const newY = (fixedPoint.y + newCornerY) / 2;
        
        return {
            x_length: Math.max(1, newXLength),
            y_length: Math.max(1, newYLength),
            x: newX,
            y: newY
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
        { key: 'x_range[0]', label: 'X轴最小值', type: 'number' },
        { key: 'x_range[1]', label: 'X轴最大值', type: 'number' },
        { key: 'x_range[2]', label: 'X轴步长', type: 'number' },
        { key: 'y_range[0]', label: 'Y轴最小值', type: 'number' },
        { key: 'y_range[1]', label: 'Y轴最大值', type: 'number' },
        { key: 'y_range[2]', label: 'Y轴步长', type: 'number' },
        { key: 'x_length', label: 'X轴长度', type: 'number' },
        { key: 'y_length', label: 'Y轴长度', type: 'number' },
        { key: 'axis_color', label: '轴颜色', type: 'color' },
        { key: 'tips', label: '显示箭头', type: 'checkbox' }
    ]
});


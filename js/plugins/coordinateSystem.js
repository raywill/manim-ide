/**
 * CoordinateSystem 插件 - 坐标系
 */

registerShape({
    type: 'coordinateSystem',
    name: '坐标系',
    icon: '📐',
    
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
        const xLength = (props.x_length || 6) * 50; // 转换为像素
        const yLength = (props.y_length || 6) * 50;
        
        ctx.strokeStyle = props.axis_color || '#7f8c8d';
        ctx.lineWidth = 2;
        
        // 绘制X轴
        ctx.beginPath();
        ctx.moveTo(center.x - xLength / 2, center.y);
        ctx.lineTo(center.x + xLength / 2, center.y);
        ctx.stroke();
        
        // 绘制Y轴
        ctx.beginPath();
        ctx.moveTo(center.x, center.y - yLength / 2);
        ctx.lineTo(center.x, center.y + yLength / 2);
        ctx.stroke();
        
        // 绘制箭头（如果启用）
        if (props.tips) {
            const arrowSize = 10;
            
            // X轴箭头
            ctx.beginPath();
            ctx.moveTo(center.x + xLength / 2, center.y);
            ctx.lineTo(center.x + xLength / 2 - arrowSize, center.y - arrowSize / 2);
            ctx.lineTo(center.x + xLength / 2 - arrowSize, center.y + arrowSize / 2);
            ctx.closePath();
            ctx.fillStyle = props.axis_color || '#7f8c8d';
            ctx.fill();
            
            // Y轴箭头
            ctx.beginPath();
            ctx.moveTo(center.x, center.y - yLength / 2);
            ctx.lineTo(center.x - arrowSize / 2, center.y - yLength / 2 + arrowSize);
            ctx.lineTo(center.x + arrowSize / 2, center.y - yLength / 2 + arrowSize);
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
        const xMin = xRange[0];
        const xMax = xRange[1];
        
        // 计算小数位数（与步长一致）
        const xDecimals = xStep % 1 === 0 ? 0 : xStep.toString().split('.')[1]?.length || 0;
        
        // 从0向右绘制
        for (let i = 0; i <= xMax; i = parseFloat((i + xStep).toFixed(10))) {
            if (i === 0 || i > xMax) continue;
            const x = center.x + (i / (xMax - xMin)) * xLength;
            ctx.beginPath();
            ctx.moveTo(x, center.y - 5);
            ctx.lineTo(x, center.y + 5);
            ctx.stroke();
            ctx.fillText(i.toFixed(xDecimals), x, center.y + 8);
        }
        
        // 从0向左绘制
        for (let i = 0; i >= xMin; i = parseFloat((i - xStep).toFixed(10))) {
            if (i === 0 || i < xMin) continue;
            const x = center.x + (i / (xMax - xMin)) * xLength;
            ctx.beginPath();
            ctx.moveTo(x, center.y - 5);
            ctx.lineTo(x, center.y + 5);
            ctx.stroke();
            ctx.fillText(i.toFixed(xDecimals), x, center.y + 8);
        }
        
        // Y轴刻度 - 从0开始向两边绘制
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const yStep = yRange[2] || 1;
        const yMin = yRange[0];
        const yMax = yRange[1];
        
        // 计算小数位数（与步长一致）
        const yDecimals = yStep % 1 === 0 ? 0 : yStep.toString().split('.')[1]?.length || 0;
        
        // 从0向上绘制
        for (let i = 0; i <= yMax; i = parseFloat((i + yStep).toFixed(10))) {
            if (i === 0 || i > yMax) continue;
            const y = center.y - (i / (yMax - yMin)) * yLength;
            ctx.beginPath();
            ctx.moveTo(center.x - 5, y);
            ctx.lineTo(center.x + 5, y);
            ctx.stroke();
            ctx.fillText(i.toFixed(yDecimals), center.x - 8, y);
        }
        
        // 从0向下绘制
        for (let i = 0; i >= yMin; i = parseFloat((i - yStep).toFixed(10))) {
            if (i === 0 || i < yMin) continue;
            const y = center.y - (i / (yMax - yMin)) * yLength;
            ctx.beginPath();
            ctx.moveTo(center.x - 5, y);
            ctx.lineTo(center.x + 5, y);
            ctx.stroke();
            ctx.fillText(i.toFixed(yDecimals), center.x - 8, y);
        }
        
        // 绘制原点标记
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
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


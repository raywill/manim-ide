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
        
        // X轴刻度
        const xStep = xRange[2] || 1;
        for (let i = xRange[0]; i <= xRange[1]; i += xStep) {
            if (i === 0) continue;
            const x = center.x + (i / (xRange[1] - xRange[0])) * xLength;
            ctx.beginPath();
            ctx.moveTo(x, center.y - 5);
            ctx.lineTo(x, center.y + 5);
            ctx.stroke();
            
            // 标签
            ctx.fillText(i.toString(), x, center.y + 8);
        }
        
        // Y轴刻度
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const yStep = yRange[2] || 1;
        for (let i = yRange[0]; i <= yRange[1]; i += yStep) {
            if (i === 0) continue;
            const y = center.y - (i / (yRange[1] - yRange[0])) * yLength;
            ctx.beginPath();
            ctx.moveTo(center.x - 5, y);
            ctx.lineTo(center.x + 5, y);
            ctx.stroke();
            
            // 标签
            ctx.fillText(i.toString(), center.x - 8, y);
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
        { key: 'x_length', label: 'X轴长度', type: 'number' },
        { key: 'y_length', label: 'Y轴长度', type: 'number' },
        { key: 'axis_color', label: '轴颜色', type: 'color' },
        { key: 'tips', label: '显示箭头', type: 'checkbox' }
    ]
});


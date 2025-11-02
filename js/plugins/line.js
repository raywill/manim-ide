/**
 * Line 插件
 */

registerShape({
    type: 'line',
    name: '线段',
    icon: '—',
    
    createDefault: function(x, y) {
        return {
            type: 'line',
            name: 'line_' + (ManimEditor.elements.length + 1),
            props: {
                start: [x - 1, y, 0],
                end: [x + 1, y, 0],
                color: '#2c3e50',
                stroke_width: 2,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const start = editor.manimToCanvas(props.start[0], props.start[1]);
        const end = editor.manimToCanvas(props.end[0], props.end[1]);
        
        ctx.strokeStyle = props.color || '#2c3e50';
        ctx.lineWidth = props.stroke_width || 2;
        
        // 绘制线段
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        
        // 绘制端点
        ctx.fillStyle = props.color || '#2c3e50';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
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
        const color = hexToManimColor(props.color || '#2c3e50');
        const startX = formatNumber(props.start[0]);
        const startY = formatNumber(props.start[1]);
        const endX = formatNumber(props.end[0]);
        const endY = formatNumber(props.end[1]);
        
        let code = `${varName} = Line(start=[${startX}, ${startY}, 0], end=[${endX}, ${endY}, 0], color=${color}`;
        
        if (props.stroke_width && props.stroke_width !== 2) {
            code += `, stroke_width=${formatNumber(props.stroke_width)}`;
        }
        
        code += ')';
        
        return code;
    },
    
    properties: [
        { key: 'start[0]', label: '起点X', type: 'number' },
        { key: 'start[1]', label: '起点Y', type: 'number' },
        { key: 'end[0]', label: '终点X', type: 'number' },
        { key: 'end[1]', label: '终点Y', type: 'number' },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number' }
    ]
});


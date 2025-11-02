/**
 * Square 插件
 */

registerShape({
    type: 'square',
    name: '正方形',
    icon: '⬜',
    
    createDefault: function(x, y) {
        return {
            type: 'square',
            name: 'square_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,
                y: y || 0,
                size: 1,
                color: '#3498db',
                opacity: 1,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const size = (props.size || 1) * 50; // 50像素 = 1 Manim单位
        
        ctx.fillStyle = props.color || '#3498db';
        ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        const x = pos.x - size / 2;
        const y = pos.y - size / 2;
        
        ctx.fillRect(x, y, size, size);
        ctx.strokeRect(x, y, size, size);
        
        // 绘制中心点
        ctx.fillStyle = '#e74c3c';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const halfSize = props.size / 2;
        
        return Math.abs(manimX - props.x) <= halfSize &&
               Math.abs(manimY - props.y) <= halfSize;
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const size = formatNumber(props.size || 1);
        const color = hexToManimColor(props.color || '#3498db');
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        let code = `${varName} = Square(side_length=${size}, color=${color})`;
        
        if (props.x !== 0 || props.y !== 0) {
            code += `.move_to([${x}, ${y}, 0])`;
        }
        
        if (props.opacity !== undefined && props.opacity !== 1) {
            code += `.set_opacity(${formatNumber(props.opacity)})`;
        }
        
        return code;
    },
    
    properties: [
        { key: 'x', label: 'X坐标', type: 'number' },
        { key: 'y', label: 'Y坐标', type: 'number' },
        { key: 'size', label: '边长', type: 'number' },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'opacity', label: '不透明度', type: 'number' }
    ]
});


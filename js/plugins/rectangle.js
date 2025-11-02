/**
 * Rectangle 插件
 */

registerShape({
    type: 'rectangle',
    name: '矩形',
    icon: '▭',
    
    createDefault: function(x, y) {
        return {
            type: 'rectangle',
            name: 'rect_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,
                y: y || 0,
                width: 2,
                height: 1,
                color: '#3498db',
                opacity: 1,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const width = (props.width || 2) * 50;
        const height = (props.height || 1) * 50;
        
        ctx.fillStyle = props.color || '#3498db';
        ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        const x = pos.x - width / 2;
        const y = pos.y - height / 2;
        
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        
        // 绘制中心点
        ctx.fillStyle = '#e74c3c';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const halfWidth = props.width / 2;
        const halfHeight = props.height / 2;
        
        return Math.abs(manimX - props.x) <= halfWidth &&
               Math.abs(manimY - props.y) <= halfHeight;
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const width = formatNumber(props.width || 2);
        const height = formatNumber(props.height || 1);
        const color = hexToManimColor(props.color || '#3498db');
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        let code = `${varName} = Rectangle(width=${width}, height=${height}, color=${color})`;
        
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
        { key: 'width', label: '宽度', type: 'number' },
        { key: 'height', label: '高度', type: 'number' },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'opacity', label: '不透明度', type: 'number' }
    ]
});


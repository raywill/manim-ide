/**
 * Curve 插件 - 贝塞尔曲线
 */

registerShape({
    type: 'curve',
    name: '曲线',
    icon: '〰️',
    
    createDefault: function(x, y) {
        return {
            type: 'curve',
            name: 'curve_' + (ManimEditor.elements.length + 1),
            props: {
                points: [
                    [x - 1, y, 0],
                    [x, y + 1, 0],
                    [x + 1, y, 0]
                ],
                color: '#9b59b6',
                stroke_width: 2,
                smoothness: 1,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const points = props.points;
        
        if (!points || points.length < 2) return;
        
        ctx.strokeStyle = props.color || '#9b59b6';
        ctx.lineWidth = props.stroke_width || 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // 绘制平滑曲线
        ctx.beginPath();
        const firstPoint = editor.manimToCanvas(points[0][0], points[0][1]);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        if (points.length === 2) {
            // 只有两个点，绘制直线
            const secondPoint = editor.manimToCanvas(points[1][0], points[1][1]);
            ctx.lineTo(secondPoint.x, secondPoint.y);
        } else {
            // 多个点，使用二次贝塞尔曲线平滑连接
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = editor.manimToCanvas(points[i][0], points[i][1]);
                const p1 = editor.manimToCanvas(points[i + 1][0], points[i + 1][1]);
                
                if (i === points.length - 2) {
                    // 最后一段，直接连到终点
                    ctx.lineTo(p1.x, p1.y);
                } else {
                    // 使用二次贝塞尔曲线
                    const p2 = editor.manimToCanvas(points[i + 2][0], points[i + 2][1]);
                    const cpX = p1.x;
                    const cpY = p1.y;
                    const endX = (p1.x + p2.x) / 2;
                    const endY = (p1.y + p2.y) / 2;
                    
                    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
                }
            }
        }
        
        ctx.stroke();
        
        // 绘制控制点
        ctx.fillStyle = props.color || '#9b59b6';
        points.forEach(point => {
            const canvasPoint = editor.manimToCanvas(point[0], point[1]);
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const points = props.points;
        
        if (!points || points.length === 0) return false;
        
        // 检查是否点击了控制点
        for (let point of points) {
            const dx = manimX - point[0];
            const dy = manimY - point[1];
            if (Math.sqrt(dx * dx + dy * dy) < 0.3) {
                return true;
            }
        }
        
        // 检查是否点击了曲线路径
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // 简化：检查点到线段的距离
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const lengthSquared = dx * dx + dy * dy;
            
            if (lengthSquared === 0) continue;
            
            const t = Math.max(0, Math.min(1, 
                ((manimX - p1[0]) * dx + (manimY - p1[1]) * dy) / lengthSquared
            ));
            
            const projX = p1[0] + t * dx;
            const projY = p1[1] + t * dy;
            const dist = Math.sqrt((manimX - projX) ** 2 + (manimY - projY) ** 2);
            
            if (dist < 0.3) return true;
        }
        
        return false;
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const color = hexToManimColor(props.color || '#9b59b6');
        
        // 格式化点数组
        const pointsStr = props.points.map(p => 
            `[${formatNumber(p[0])}, ${formatNumber(p[1])}, 0]`
        ).join(', ');
        
        let code = `${varName} = VMobject(color=${color})`;
        code += `\n        ${varName}.set_points_smoothly([${pointsStr}])`;
        
        if (props.stroke_width && props.stroke_width !== 2) {
            code += `\n        ${varName}.set_stroke(width=${formatNumber(props.stroke_width)})`;
        }
        
        return code;
    },
    
    properties: [
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number' },
        { key: 'smoothness', label: '平滑度', type: 'number' }
    ]
});


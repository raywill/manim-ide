/**
 * Curve 插件 - 贝塞尔曲线
 */

registerShape({
    type: 'curve',
    name: '曲线',
    icon: '〰️',
    version: '2.0.0-migrated',
    
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
        
        const isSelected = element.id === editor.selectedElement?.id;
        
        ctx.strokeStyle = props.color || '#9b59b6';
        ctx.lineWidth = props.stroke_width || 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // 绘制平滑的贝塞尔曲线（支持任意点数）
        ctx.beginPath();
        const startPoint = editor.manimToCanvas(points[0][0], points[0][1]);
        ctx.moveTo(startPoint.x, startPoint.y);
        
        if (points.length === 2) {
            // 两个点，直线
            const p1 = editor.manimToCanvas(points[1][0], points[1][1]);
            ctx.lineTo(p1.x, p1.y);
        } else if (points.length === 3) {
            // 三个点，二次贝塞尔
            const p1 = editor.manimToCanvas(points[1][0], points[1][1]);
            const p2 = editor.manimToCanvas(points[2][0], points[2][1]);
            ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
        } else if (points.length === 4) {
            // 四个点，三次贝塞尔
            const p1 = editor.manimToCanvas(points[1][0], points[1][1]);
            const p2 = editor.manimToCanvas(points[2][0], points[2][1]);
            const p3 = editor.manimToCanvas(points[3][0], points[3][1]);
            ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        } else {
            // 多于4个点，使用分段三次贝塞尔曲线平滑连接
            for (let i = 0; i < points.length - 1; i += 3) {
                if (i + 3 < points.length) {
                    // 完整的三次贝塞尔段
                    const p1 = editor.manimToCanvas(points[i + 1][0], points[i + 1][1]);
                    const p2 = editor.manimToCanvas(points[i + 2][0], points[i + 2][1]);
                    const p3 = editor.manimToCanvas(points[i + 3][0], points[i + 3][1]);
                    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
                } else if (i + 2 < points.length) {
                    // 剩余3个点，用二次贝塞尔
                    const p1 = editor.manimToCanvas(points[i + 1][0], points[i + 1][1]);
                    const p2 = editor.manimToCanvas(points[i + 2][0], points[i + 2][1]);
                    ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
                } else if (i + 1 < points.length) {
                    // 剩余2个点，直线
                    const p1 = editor.manimToCanvas(points[i + 1][0], points[i + 1][1]);
                    ctx.lineTo(p1.x, p1.y);
                }
            }
        }
        
        ctx.stroke();
        
        // 只在选中状态时绘制控制点
        if (isSelected) {
            // 绘制控制线（连接控制点的虚线）
            if (points.length >= 4) {
                ctx.strokeStyle = '#bdc3c7';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                
                // P0 到 P1
                const p0 = editor.manimToCanvas(points[0][0], points[0][1]);
                const p1 = editor.manimToCanvas(points[1][0], points[1][1]);
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                
                // P2 到 P3
                if (points.length >= 4) {
                    const p2 = editor.manimToCanvas(points[points.length - 2][0], points[points.length - 2][1]);
                    const p3 = editor.manimToCanvas(points[points.length - 1][0], points[points.length - 1][1]);
                    ctx.moveTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);
                }
                
                ctx.stroke();
                ctx.setLineDash([]);
            }
            
            // 绘制所有控制点
            points.forEach((point, index) => {
                const canvasPoint = editor.manimToCanvas(point[0], point[1]);
                
                // 起点和终点用不同颜色
                if (index === 0 || index === points.length - 1) {
                    ctx.fillStyle = '#e74c3c'; // 红色
                } else {
                    ctx.fillStyle = '#3498db'; // 蓝色
                }
                
                ctx.beginPath();
                ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // 白色边框
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // 显示点的标签
                ctx.fillStyle = '#2c3e50';
                ctx.font = '11px monospace';
                ctx.fillText(`P${index}`, canvasPoint.x + 10, canvasPoint.y - 10);
            });
        }
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
        const points = props.points;
        
        // 根据点的数量使用不同的Manim方法
        if (points.length === 4) {
            // 四个点：使用CubicBezier（三次贝塞尔曲线）
            const p0 = `[${formatNumber(points[0][0])}, ${formatNumber(points[0][1])}, 0]`;
            const p1 = `[${formatNumber(points[1][0])}, ${formatNumber(points[1][1])}, 0]`;
            const p2 = `[${formatNumber(points[2][0])}, ${formatNumber(points[2][1])}, 0]`;
            const p3 = `[${formatNumber(points[3][0])}, ${formatNumber(points[3][1])}, 0]`;
            
            let code = `${varName} = CubicBezier(${p0}, ${p1}, ${p2}, ${p3}, color=${color})`;
            
            if (props.stroke_width && props.stroke_width !== 2) {
                code += `.set_stroke(width=${formatNumber(props.stroke_width)})`;
            }
            
            return code;
        } else {
            // 其他数量的点：使用VMobject的set_points_smoothly
            const pointsStr = points.map(p => 
                `[${formatNumber(p[0])}, ${formatNumber(p[1])}, 0]`
            ).join(', ');
            
            let code = `${varName} = VMobject(color=${color})`;
            code += `\n        ${varName}.set_points_smoothly([${pointsStr}])`;
            
            if (props.stroke_width && props.stroke_width !== 2) {
                code += `\n        ${varName}.set_stroke(width=${formatNumber(props.stroke_width)})`;
            }
            
            return code;
        }
    },
    
    // ═══════════════════════════════════════════
    // 插件化v2.0新增方法
    // ═══════════════════════════════════════════
    
    getBounds: function(element, editor) {
        const props = element.props;
        const points = props.points || [];
        if (points.length > 0) {
            const canvasPoints = points.map(p => editor.manimToCanvas(p[0], p[1]));
            const minX = Math.min(...canvasPoints.map(p => p.x));
            const minY = Math.min(...canvasPoints.map(p => p.y));
            const maxX = Math.max(...canvasPoints.map(p => p.x));
            const maxY = Math.max(...canvasPoints.map(p => p.y));
            
            // 注意：不加padding！padding会导致缩放时固定点计算错误
            return { 
                x: minX, 
                y: minY, 
                w: maxX - minX, 
                h: maxY - minY 
            };
        }
        return null;
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        // 曲线使用点击式绘制，不需要拖动更新
        // 保留此方法为空实现
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        
        const points = originalProps.points;
        if (!points || points.length === 0) return {};
        
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
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
        
        // 步骤5：缩放所有控制点
        const scaleX = originalWidth > 0 ? newWidth / originalWidth : 1;
        const scaleY = originalHeight > 0 ? newHeight / originalHeight : 1;
        
        const newPoints = points.map(p => [
            newCenterX + (p[0] - center.x) * scaleX,
            newCenterY + (p[1] - center.y) * scaleY,
            0
        ]);
        
        return { points: newPoints };
    },
    
    getMoveAnchor: function(element) {
        // curve：使用增量移动，返回null
        return null;
    },
    
    handleMove: function(element, moveInfo, editor) {
        // curve的移动：平移所有控制点
        if (moveInfo.deltaX !== undefined && moveInfo.deltaY !== undefined) {
            const newPoints = element.props.points.map(p => [
                p[0] + moveInfo.deltaX,
                p[1] + moveInfo.deltaY,
                0
            ]);
            
            return { points: newPoints };
        }
        return {};
    },
    
    getControlPoints: function(element, editor) {
        if (!element.props.points) return null;
        
        return element.props.points.map((point, index) => ({
            id: `p${index}`,
            x: point[0],
            y: point[1],
            type: index === 0 || index === element.props.points.length - 1
                ? 'endpoint'
                : 'control'
        }));
    },
    
    updateControlPoint: function(element, pointId, newX, newY, editor) {
        const index = parseInt(pointId.substring(1));
        const newPoints = [...element.props.points];
        newPoints[index] = [newX, newY, 0];
        
        return { points: newPoints };
    },
    
    properties: [
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number' },
        { key: 'smoothness', label: '平滑度', type: 'number' }
    ]
});


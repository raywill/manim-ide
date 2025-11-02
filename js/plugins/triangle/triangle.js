/**
 * Triangle 插件 - 三角形
 * 
 * 特点：
 * - 点击3次放置顶点
 * - 3个顶点都可拖动调整
 * - 等比例缩放
 */

registerShape({
    type: 'triangle',
    name: '三角形',
    icon: '△',
    version: '1.0.0',
    drawMode: 'multiClick',  // 点击式绘制
    
    createDefault: function(x, y) {
        return {
            type: 'triangle',
            name: 'triangle_' + (ManimEditor.elements.length + 1),
            props: {
                points: [
                    [x - 1, y - 0.5, 0],
                    [x + 1, y - 0.5, 0],
                    [x, y + 0.5, 0]
                ],
                fill_color: '#2ecc71',
                stroke_color: '#2c3e50',
                fill_opacity: 1,
                stroke_width: 2,
                z_order: 0,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const points = props.points || [];
        
        if (points.length < 3) return;
        
        const isSelected = element.id === editor.selectedElement?.id;
        
        setRenderOpacity(ctx, element);
        
        // 绘制三角形
        ctx.beginPath();
        const p0 = editor.manimToCanvas(points[0][0], points[0][1]);
        const p1 = editor.manimToCanvas(points[1][0], points[1][1]);
        const p2 = editor.manimToCanvas(points[2][0], points[2][1]);
        
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        
        // 绘制填充
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
        if (fillOpacity > 0) {
            ctx.fillStyle = props.fill_color || props.color || '#2ecc71';
            const savedAlpha = ctx.globalAlpha;
            ctx.globalAlpha = savedAlpha * fillOpacity;
            ctx.fill();
            ctx.globalAlpha = savedAlpha;
        }
        
        // 绘制边框
        ctx.strokeStyle = props.stroke_color || '#2c3e50';
        ctx.lineWidth = props.stroke_width || 2;
        ctx.stroke();
        
        // 如果选中，绘制可拖动的顶点控制点
        if (isSelected) {
            const canvasPoints = [p0, p1, p2];
            
            canvasPoints.forEach((point, index) => {
                // 绘制蓝色实心控制点
                ctx.fillStyle = '#3498db';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // 白色边框
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // 标签
                ctx.fillStyle = '#2c3e50';
                ctx.font = '11px monospace';
                ctx.fillText(`P${index}`, point.x + 10, point.y - 10);
            });
        }
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const points = props.points || [];
        
        if (points.length < 3) return false;
        
        // 简化：检查是否在外接矩形内
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        return manimX >= minX - 0.5 && manimX <= maxX + 0.5 &&
               manimY >= minY - 0.5 && manimY <= maxY + 0.5;
    },
    
    getBounds: function(element, editor) {
        const props = element.props;
        const points = props.points || [];
        
        if (points.length < 3) return null;
        
        const canvasPoints = points.map(p => editor.manimToCanvas(p[0], p[1]));
        const xs = canvasPoints.map(p => p.x);
        const ys = canvasPoints.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        return {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY
        };
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        // 三角形使用点击式绘制，不需要拖动更新
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, originalProps } = scaleInfo;
        
        const points = originalProps.points;
        if (!points || points.length < 3) return {};
        
        // 计算原始外接矩形
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        const originalWidth = maxX - minX;
        const originalHeight = maxY - minY;
        
        // 计算新尺寸（等比例）
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        // 强制等比例缩放
        const originalRatio = originalWidth / originalHeight;
        const currentRatio = newWidth / newHeight;
        
        if (currentRatio > originalRatio) {
            newWidth = newHeight * originalRatio;
        } else {
            newHeight = newWidth / originalRatio;
        }
        
        // 根据corner确定新角位置
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
        } else {
            newCornerX = fixedPoint.x - newWidth;
            newCornerY = fixedPoint.y - newHeight;
        }
        
        // 新中心
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        
        // 缩放比例
        const scaleX = originalWidth > 0 ? newWidth / originalWidth : 1;
        const scaleY = originalHeight > 0 ? newHeight / originalHeight : 1;
        
        // 缩放所有顶点
        const newPoints = points.map(p => [
            newCenterX + (p[0] - center.x) * scaleX,
            newCenterY + (p[1] - center.y) * scaleY,
            0
        ]);
        
        return { points: newPoints };
    },
    
    getMoveAnchor: function(element) {
        // 使用中心点
        const points = element.props.points || [];
        if (points.length < 3) return { x: 0, y: 0 };
        
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
        
        return { x: centerX, y: centerY };
    },
    
    handleMove: function(element, moveInfo, editor) {
        // 平移所有顶点
        if (moveInfo.deltaX !== undefined && moveInfo.deltaY !== undefined) {
            const newPoints = element.props.points.map(p => [
                p[0] + moveInfo.deltaX,
                p[1] + moveInfo.deltaY,
                0
            ]);
            return { points: newPoints };
        }
        
        // 使用anchor方式
        const anchor = this.getMoveAnchor(element);
        const newCenterX = moveInfo.currentPoint.x - moveInfo.offset.x;
        const newCenterY = moveInfo.currentPoint.y - moveInfo.offset.y;
        const dx = newCenterX - anchor.x;
        const dy = newCenterY - anchor.y;
        
        const newPoints = element.props.points.map(p => [
            p[0] + dx,
            p[1] + dy,
            0
        ]);
        
        return { points: newPoints };
    },
    
    getControlPoints: function(element, editor) {
        if (!element.props.points || element.props.points.length < 3) return null;
        
        return element.props.points.map((point, index) => ({
            id: `p${index}`,
            x: point[0],
            y: point[1],
            type: 'vertex'  // 顶点
        }));
    },
    
    updateControlPoint: function(element, pointId, newX, newY, editor) {
        const index = parseInt(pointId.substring(1));
        const newPoints = [...element.props.points];
        newPoints[index] = [newX, newY, 0];
        
        return { points: newPoints };
    },
    
    // ═══════════════════════════════════════════
    // 点击式绘制接口
    // ═══════════════════════════════════════════
    
    onDrawClick: function(state, point, editor) {
        if (!state) {
            // 第1次点击：放置P0
            console.log('三角形绘制开始，放置P0（第一个顶点）');
            return {
                continue: true,
                state: { points: [point] }
            };
        } else if (state.points.length === 1) {
            // 第2次点击：放置P1
            console.log('放置P1（第二个顶点），再点击一次放置P2');
            return {
                continue: true,
                state: { points: [...state.points, point] }
            };
        } else if (state.points.length === 2) {
            // 第3次点击：放置P2，自动完成
            console.log('放置P2（第三个顶点），三角形完成');
            
            const element = {
                type: 'triangle',
                name: 'triangle_' + (editor.elements.length + 1),
                props: {
                    points: [...state.points, point],
                    fill_color: '#2ecc71',
                    stroke_color: '#2c3e50',
                    fill_opacity: 1,
                    stroke_width: 2,
                    hidden: false
                }
            };
            
            return {
                continue: false,
                element: element
            };
        }
        
        return { continue: false };
    },
    
    onDrawDoubleClick: function(state, editor) {
        // 三角形不使用双击完成（3次点击自动完成）
        // 但保留接口以支持提前完成
        if (!state || !state.points || state.points.length < 3) {
            console.warn('三角形需要3个顶点');
            return null;
        }
        
        return {
            type: 'triangle',
            name: 'triangle_' + (editor.elements.length + 1),
            props: {
                points: state.points,
                color: '#2ecc71',
                opacity: 1,
                hidden: false
            }
        };
    },
    
    renderDrawingPreview: function(ctx, state, editor) {
        const points = state.points || [];
        const previewPoint = editor.previewPoint;
        
        ctx.strokeStyle = '#2ecc71';
        ctx.fillStyle = '#2ecc71';
        ctx.lineWidth = 2;
        
        // 绘制已放置的顶点
        points.forEach((point, index) => {
            const canvasPoint = editor.manimToCanvas(point[0], point[1]);
            
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 标签
            ctx.fillStyle = '#2c3e50';
            ctx.font = '11px monospace';
            ctx.fillText(`P${index}`, canvasPoint.x + 10, canvasPoint.y - 10);
        });
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#2ecc71';
        
        // 绘制已有的边
        if (points.length >= 2) {
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            const p0 = editor.manimToCanvas(points[0][0], points[0][1]);
            const p1 = editor.manimToCanvas(points[1][0], points[1][1]);
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            
            // 如果有预览点，绘制完整三角形预览
            if (previewPoint) {
                const p2 = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
                ctx.lineTo(p2.x, p2.y);
                ctx.closePath();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#2ecc71';
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // 绘制预览点
        if (previewPoint && points.length < 3) {
            const canvasPoint = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = '#7f8c8d';
            ctx.font = '12px monospace';
            ctx.fillText(`P${points.length}`, canvasPoint.x + 10, canvasPoint.y - 10);
        }
        
        // 提示信息
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px sans-serif';
        const messages = [
            '点击放置第一个顶点（P0）',
            '点击放置第二个顶点（P1）',
            '点击放置第三个顶点（P2）完成'
        ];
        ctx.fillText(messages[points.length] || '三角形完成', 20, editor.canvas.height - 20);
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const points = props.points || [];
        
        if (points.length < 3) return `${varName} = VGroup()`;
        
        const fillColor = hexToManimColor(props.fill_color || props.color || '#2ecc71');
        const strokeColor = hexToManimColor(props.stroke_color || '#2c3e50');
        
        const p0 = `[${formatNumber(points[0][0])}, ${formatNumber(points[0][1])}, 0]`;
        const p1 = `[${formatNumber(points[1][0])}, ${formatNumber(points[1][1])}, 0]`;
        const p2 = `[${formatNumber(points[2][0])}, ${formatNumber(points[2][1])}, 0]`;
        
        let code = `${varName} = Polygon(${p0}, ${p1}, ${p2})`;
        
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
        if (fillOpacity > 0) {
            code += `.set_fill(${fillColor}, ${formatNumber(fillOpacity)})`;
        } else {
            code += `.set_fill(opacity=0)`;
        }
        
        const strokeWidth = formatNumber(props.stroke_width || 2);
        code += `.set_stroke(${strokeColor}, width=${strokeWidth})`;
        
        // 设置 z-index
        const zOrder = props.z_order !== undefined ? props.z_order : 0;
        if (zOrder !== 0) {
            code += `.set_z_index(${zOrder})`;
        }
        
        return code;
    },
    
    properties: [
        { key: 'fill_color', label: '填充色', type: 'color' },
        { key: 'fill_opacity', label: '填充透明度', type: 'number', step: 0.1, min: 0, max: 1 },
        { key: 'stroke_color', label: '边框色', type: 'color' },
        { key: 'stroke_width', label: '边框宽度', type: 'number', step: 0.1, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


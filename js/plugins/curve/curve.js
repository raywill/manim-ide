/**
 * Curve 插件 - 贝塞尔曲线
 */

registerShape({
    type: 'curve',
    name: '曲线',
    icon: '〰️',
    version: '2.0.0-migrated',
    drawMode: 'multiClick',  // 点击式绘制
    
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
                z_order: 0,
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
            code += `\n${varName}.set_points_smoothly([${pointsStr}])`;
            
            if (props.stroke_width && props.stroke_width !== 2) {
                code += `\n${varName}.set_stroke(width=${formatNumber(props.stroke_width)})`;
            }
            
            // 设置 z-index
            const zOrder = props.z_order !== undefined ? props.z_order : 0;
            if (zOrder !== 0) {
                code += `.set_z_index(${zOrder})`;
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
    
    // ═══════════════════════════════════════════
    // v2.1新增：点击式绘制接口
    // ═══════════════════════════════════════════
    
    onDrawClick: function(state, point, editor) {
        // 处理点击事件
        if (!state) {
            // 第一次点击：创建state
            return {
                continue: true,
                state: { points: [point] }
            };
        }
        
        // 继续添加点
        const newState = { points: [...state.points, point] };
        console.log(`放置P${state.points.length}（第${state.points.length + 1}个点），双击完成`);
        
        return {
            continue: true,
            state: newState
        };
    },
    
    onDrawDoubleClick: function(state, editor) {
        // 双击完成绘制
        if (!state || !state.points || state.points.length < 2) {
            console.warn('曲线至少需要2个点');
            return null;
        }
        
        console.log(`曲线完成，共${state.points.length}个点`);
        
        // 返回完成的元素
        return {
            type: 'curve',
            name: 'curve_' + (editor.elements.length + 1),
            props: {
                points: [...state.points],
                color: '#9b59b6',
                stroke_width: 2,
                smoothness: 1,
                hidden: false
            }
        };
    },
    
    // ═══════════════════════════════════════════
    // v2.1新增：绘制预览（支持任意多个点）
    // ═══════════════════════════════════════════
    renderDrawingPreview: function(ctx, state, editor) {
        const points = state.points || [];
        const previewPoint = editor.previewPoint;
        
        ctx.strokeStyle = '#9b59b6';
        ctx.fillStyle = '#9b59b6';
        ctx.lineWidth = 2;
        
        // 绘制已放置的点
        points.forEach((point, index) => {
            const canvasPoint = editor.manimToCanvas(point[0], point[1]);
            
            // 端点用红色，控制点用蓝色
            ctx.fillStyle = (index === 0 || index === points.length - 1) ? '#e74c3c' : '#3498db';
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
        ctx.fillStyle = '#9b59b6';
        ctx.strokeStyle = '#9b59b6';
        
        // 绘制连接线（虚线）
        if (points.length > 1) {
            ctx.strokeStyle = '#bdc3c7';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            const firstPoint = editor.manimToCanvas(points[0][0], points[0][1]);
            ctx.moveTo(firstPoint.x, firstPoint.y);
            for (let i = 1; i < points.length; i++) {
                const p = editor.manimToCanvas(points[i][0], points[i][1]);
                ctx.lineTo(p.x, p.y);
            }
            if (previewPoint) {
                const preview = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
                ctx.lineTo(preview.x, preview.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // 绘制预览点（跟随鼠标）
        if (previewPoint) {
            const canvasPoint = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = '#7f8c8d';
            ctx.font = '12px monospace';
            ctx.fillText(`P${points.length}`, canvasPoint.x + 10, canvasPoint.y - 10);
        }
        
        // 绘制平滑曲线预览（如果有足够的点）
        if (points.length >= 2) {
            ctx.strokeStyle = '#9b59b6';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            
            // 使用实际的点绘制平滑曲线
            const tempPoints = [...points];
            if (previewPoint) {
                tempPoints.push(previewPoint);
            }
            
            // 绘制平滑路径
            ctx.beginPath();
            const startCanvas = editor.manimToCanvas(tempPoints[0][0], tempPoints[0][1]);
            ctx.moveTo(startCanvas.x, startCanvas.y);
            
            if (tempPoints.length === 2) {
                // 2个点：直线
                const p1 = editor.manimToCanvas(tempPoints[1][0], tempPoints[1][1]);
                ctx.lineTo(p1.x, p1.y);
            } else if (tempPoints.length === 3) {
                // 3个点：二次贝塞尔
                const p1 = editor.manimToCanvas(tempPoints[1][0], tempPoints[1][1]);
                const p2 = editor.manimToCanvas(tempPoints[2][0], tempPoints[2][1]);
                ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
            } else if (tempPoints.length >= 4) {
                // 4+个点：分段三次贝塞尔
                for (let i = 0; i < tempPoints.length - 1; i += 3) {
                    if (i + 3 < tempPoints.length) {
                        const p1 = editor.manimToCanvas(tempPoints[i + 1][0], tempPoints[i + 1][1]);
                        const p2 = editor.manimToCanvas(tempPoints[i + 2][0], tempPoints[i + 2][1]);
                        const p3 = editor.manimToCanvas(tempPoints[i + 3][0], tempPoints[i + 3][1]);
                        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
                    } else if (i + 2 < tempPoints.length) {
                        const p1 = editor.manimToCanvas(tempPoints[i + 1][0], tempPoints[i + 1][1]);
                        const p2 = editor.manimToCanvas(tempPoints[i + 2][0], tempPoints[i + 2][1]);
                        ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
                    } else if (i + 1 < tempPoints.length) {
                        const p1 = editor.manimToCanvas(tempPoints[i + 1][0], tempPoints[i + 1][1]);
                        ctx.lineTo(p1.x, p1.y);
                    }
                }
            }
            
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        // 提示信息
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px sans-serif';
        if (points.length === 0) {
            ctx.fillText('点击放置起点', 20, editor.canvas.height - 20);
        } else if (points.length === 1) {
            ctx.fillText('点击添加控制点，双击完成', 20, editor.canvas.height - 20);
        } else {
            ctx.fillText(`已放置${points.length}个点，双击完成`, 20, editor.canvas.height - 20);
        }
    },
    
    properties: [
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number' },
        { key: 'smoothness', label: '平滑度', type: 'number' },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


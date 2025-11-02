/**
 * Arc 插件 - 圆弧
 * 
 * 通过3个点定义圆弧：
 * - A: 起点
 * - B: 圆弧经过的点
 * - C: 终点
 * 始终顺时针从A经过B到C
 */

// 辅助函数：计算通过三点的圆
function calculateArcCircle(pointA, pointB, pointC) {
    const ax = pointA[0], ay = pointA[1];
    const bx = pointB[0], by = pointB[1];
    const cx = pointC[0], cy = pointC[1];
    
    // 检查三点是否共线
    const det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(det) < 1e-6) {
        return null;  // 共线，无法确定圆
    }
    
    // 计算圆心（外接圆圆心）
    const d = 2 * ((ax - cx) * (by - cy) - (bx - cx) * (ay - cy));
    if (Math.abs(d) < 1e-6) {
        return null;  // 共线
    }
    
    const aSq = ax * ax + ay * ay;
    const bSq = bx * bx + by * by;
    const cSq = cx * cx + cy * cy;
    
    const centerX = ((aSq - cSq) * (by - cy) - (bSq - cSq) * (ay - cy)) / d;
    const centerY = ((ax - cx) * (bSq - cSq) - (bx - cx) * (aSq - cSq)) / d;
    
    // 计算半径
    const radius = Math.sqrt((ax - centerX) ** 2 + (ay - centerY) ** 2);
    
    // 计算三个点的角度
    const angleA = Math.atan2(ay - centerY, ax - centerX) * 180 / Math.PI;
    const angleB = Math.atan2(by - centerY, bx - centerX) * 180 / Math.PI;
    const angleC = Math.atan2(cy - centerY, cx - centerX) * 180 / Math.PI;
    
    // 归一化到 0-360
    const normA = (angleA + 360) % 360;
    const normB = (angleB + 360) % 360;
    const normC = (angleC + 360) % 360;
    
    // 确定顺时针方向：从A经过B到C
    // 计算从A到B的顺时针角度差
    const spanAB = (normB - normA + 360) % 360;
    // 计算从A到C的顺时针角度差
    const spanAC = (normC - normA + 360) % 360;
    
    // 三点顺序决定方向：
    // 如果 spanAB < spanAC，说明从A顺时针到C会经过B
    // 如果 spanAB > spanAC，说明从A逆时针到C会经过B
    const isClockwise = spanAB < spanAC;
    
    return {
        center: { x: centerX, y: centerY },
        radius: radius,
        startAngle: normA,
        endAngle: normC,
        throughAngle: normB,
        isClockwise: isClockwise
    };
}

registerShape({
    type: 'arc',
    name: '圆弧',
    icon: '◡',
    version: '2.0.0',
    drawMode: 'multiClick',  // 三点绘制
    
    createDefault: function(x, y) {
        return {
            type: 'arc',
            name: 'arc_' + (ManimEditor.elements.length + 1),
            props: {
                pointA: [x - 1, y, 0],
                pointB: [x, y + 1, 0],
                pointC: [x + 1, y, 0],
                stroke_color: '#e74c3c',
                stroke_width: 30,
                z_order: 0,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const circleInfo = calculateArcCircle(props.pointA, props.pointB, props.pointC);
        
        if (!circleInfo) return;  // 三点共线
        
        const { center, radius, startAngle, endAngle, isClockwise } = circleInfo;
        const centerCanvas = editor.manimToCanvas(center.x, center.y);
        const radiusPixels = radius * 50;
        
        setRenderOpacity(ctx, element);
        
        // 转换角度为 Canvas 弧度（Y轴反转）
        const startRad = -startAngle * Math.PI / 180;
        const endRad = -endAngle * Math.PI / 180;
        
        // 绘制圆弧（只画弧线）
        // 关键：由于负号转换 + Y轴反转，直接使用 isClockwise（不取反）
        const anticlockwise = isClockwise;
        
        ctx.beginPath();
        ctx.arc(centerCanvas.x, centerCanvas.y, radiusPixels, startRad, endRad, anticlockwise);
        
        ctx.strokeStyle = props.stroke_color || '#e74c3c';
        ctx.lineWidth = props.stroke_width !== undefined ? props.stroke_width : 30;
        ctx.lineCap = 'butt';  // 方角边缘
        ctx.stroke();
        
        // 绘制圆心标记
        ctx.fillStyle = '#95a5a6';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(centerCanvas.x, centerCanvas.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    },
    
    onDrawClick: function(state, point, editor) {
        if (!state) {
            // 第1次点击：起点A
            console.log('圆弧绘制开始，放置起点A');
            return {
                continue: true,
                state: { pointA: point }
            };
        } else if (state.pointA && !state.pointB) {
            // 第2次点击：经过点B
            console.log('放置经过点B');
            return {
                continue: true,
                state: { 
                    pointA: state.pointA, 
                    pointB: point 
                }
            };
        } else if (state.pointB) {
            // 第3次点击：终点C
            console.log('放置终点C');
            
            // 检查三点是否共线
            const circleInfo = calculateArcCircle(state.pointA, state.pointB, point);
            if (!circleInfo) {
                console.warn('三点共线，请选择另一个点');
                alert('三点共线，无法确定圆弧！请选择其他位置。');
                return { continue: true, state: state };  // 继续等待新的C点
            }
            
            const element = {
                type: 'arc',
                name: 'arc_' + (editor.elements.length + 1),
                props: {
                    pointA: state.pointA,
                    pointB: state.pointB,
                    pointC: point,
                    stroke_color: '#e74c3c',
                    stroke_width: 30,
                    z_order: 0,
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
        console.warn('圆弧需要3次点击');
        return null;
    },
    
    renderDrawingPreview: function(ctx, state, editor) {
        if (!state) return;
        
        const previewPoint = editor.previewPoint;
        
        // 绘制已放置的点A
        if (state.pointA) {
            const canvasA = editor.manimToCanvas(state.pointA[0], state.pointA[1]);
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(canvasA.x, canvasA.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#2c3e50';
            ctx.font = '12px monospace';
            ctx.fillText('A(起点)', canvasA.x + 10, canvasA.y - 10);
        }
        
        // 绘制已放置的点B
        if (state.pointB) {
            const canvasB = editor.manimToCanvas(state.pointB[0], state.pointB[1]);
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.arc(canvasB.x, canvasB.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#2c3e50';
            ctx.fillText('B(经过)', canvasB.x + 10, canvasB.y - 10);
        }
        
        // 绘制预览
        if (state.pointB && previewPoint) {
            // 已有A和B，预览从A经过B到C的圆弧
            const circleInfo = calculateArcCircle(state.pointA, state.pointB, previewPoint);
            
            if (circleInfo) {
                const { center, radius, startAngle, endAngle, isClockwise } = circleInfo;
                const centerCanvas = editor.manimToCanvas(center.x, center.y);
                const radiusPixels = radius * 50;
                
                const startRad = -startAngle * Math.PI / 180;
                const endRad = -endAngle * Math.PI / 180;
                
                // 绘制预览圆弧（只画弧线）
                const anticlockwise = isClockwise;
                
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 30;
                ctx.lineCap = 'butt';  // 方角边缘
                
                ctx.beginPath();
                ctx.arc(centerCanvas.x, centerCanvas.y, radiusPixels, startRad, endRad, anticlockwise);
                ctx.stroke();
                
                ctx.globalAlpha = 1;
            } else {
                // 三点共线，显示警告
                ctx.fillStyle = '#e74c3c';
                ctx.font = '14px sans-serif';
                ctx.fillText('⚠️ 三点共线，请选择其他位置', 20, 50);
            }
            
            // 绘制预览点C
            const previewCanvas = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
            ctx.fillStyle = '#9b59b6';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(previewCanvas.x, previewCanvas.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#2c3e50';
            ctx.fillText('C(终点)', previewCanvas.x + 10, previewCanvas.y - 10);
        } else if (state.pointA && previewPoint) {
            // 只有A，预览到B的连线
            const canvasA = editor.manimToCanvas(state.pointA[0], state.pointA[1]);
            const previewCanvas = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
            
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(canvasA.x, canvasA.y);
            ctx.lineTo(previewCanvas.x, previewCanvas.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // 绘制预览点B
            ctx.fillStyle = '#3498db';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(previewCanvas.x, previewCanvas.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#2c3e50';
            ctx.fillText('B(经过)', previewCanvas.x + 10, previewCanvas.y - 10);
        }
        
        // 提示信息
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px sans-serif';
        const messages = [
            '点击放置起点A',
            '点击放置经过点B',
            '点击放置终点C（确保ABC不共线）'
        ];
        const step = !state ? 0 : (!state.pointB ? 1 : 2);
        ctx.fillText(messages[step], 20, editor.canvas.height - 20);
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const circleInfo = calculateArcCircle(element.props.pointA, element.props.pointB, element.props.pointC);
        if (!circleInfo) return false;
        
        const { center, radius, startAngle, endAngle, isClockwise } = circleInfo;
        const strokeWidth = element.props.stroke_width !== undefined ? element.props.stroke_width : 30;
        
        // 距离圆心的距离
        const dx = manimX - center.x;
        const dy = manimY - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 检查是否在圆弧线上（径向范围）
        const strokeWidthManim = strokeWidth / 50;
        const tolerance = Math.max(strokeWidthManim, 0.3);
        
        if (Math.abs(distance - radius) > tolerance) {
            return false;  // 不在圆弧的径向范围内
        }
        
        // 检查角度是否在圆弧范围内
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        
        // 归一化
        let start = startAngle % 360;
        if (start < 0) start += 360;
        let end = endAngle % 360;
        if (end < 0) end += 360;
        
        const angleTolerance = 10;
        
        if (isClockwise) {
            // 顺时针：从 start 顺时针到 end
            const angleFromStart = (angle - start + 360) % 360;
            const arcSpan = (end - start + 360) % 360;
            return angleFromStart <= arcSpan + angleTolerance;
        } else {
            // 逆时针：从 start 逆时针到 end
            const angleFromStart = (start - angle + 360) % 360;
            const arcSpan = (start - end + 360) % 360;
            return angleFromStart <= arcSpan + angleTolerance;
        }
    },
    
    getBounds: function(element, editor) {
        const circleInfo = calculateArcCircle(element.props.pointA, element.props.pointB, element.props.pointC);
        if (!circleInfo) {
            // 共线，返回三点的包围盒
            const points = [element.props.pointA, element.props.pointB, element.props.pointC];
            const xs = points.map(p => p[0]);
            const ys = points.map(p => p[1]);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            
            const topLeft = editor.manimToCanvas(minX, maxY);
            const bottomRight = editor.manimToCanvas(maxX, minY);
            return {
                x: topLeft.x,
                y: topLeft.y,
                w: bottomRight.x - topLeft.x,
                h: bottomRight.y - topLeft.y
            };
        }
        
        const { center, radius } = circleInfo;
        
        // 使用外接圆的边界框
        const left = center.x - radius;
        const right = center.x + radius;
        const top = center.y + radius;
        const bottom = center.y - radius;
        
        const topLeft = editor.manimToCanvas(left, top);
        const bottomRight = editor.manimToCanvas(right, bottom);
        
        return {
            x: topLeft.x,
            y: topLeft.y,
            w: bottomRight.x - topLeft.x,
            h: bottomRight.y - topLeft.y
        };
    },
    
    handleScale: function(element, scaleInfo, editor) {
        // Arc 缩放：等比例缩放三个点
        const { corner, fixedPoint, currentPoint } = scaleInfo;
        
        const points = [element.props.pointA, element.props.pointB, element.props.pointC];
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const oldWidth = maxX - minX;
        const oldHeight = maxY - minY;
        
        // 计算新尺寸
        const newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        const newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        const newSize = Math.max(newWidth, newHeight);
        
        // 等比例缩放因子
        const scale = newSize / Math.max(oldWidth, oldHeight);
        
        // 根据corner计算新中心
        let newCornerX, newCornerY;
        if (corner === 'topLeft') {
            newCornerX = fixedPoint.x - newSize;
            newCornerY = fixedPoint.y + newSize;
        } else if (corner === 'topRight') {
            newCornerX = fixedPoint.x + newSize;
            newCornerY = fixedPoint.y + newSize;
        } else if (corner === 'bottomRight') {
            newCornerX = fixedPoint.x + newSize;
            newCornerY = fixedPoint.y - newSize;
        } else {
            newCornerX = fixedPoint.x - newSize;
            newCornerY = fixedPoint.y - newSize;
        }
        
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        
        // 平移量
        const translateX = newCenterX - centerX;
        const translateY = newCenterY - centerY;
        
        const newPointA = [
            centerX + (element.props.pointA[0] - centerX) * scale + translateX,
            centerY + (element.props.pointA[1] - centerY) * scale + translateY,
            0
        ];
        const newPointB = [
            centerX + (element.props.pointB[0] - centerX) * scale + translateX,
            centerY + (element.props.pointB[1] - centerY) * scale + translateY,
            0
        ];
        const newPointC = [
            centerX + (element.props.pointC[0] - centerX) * scale + translateX,
            centerY + (element.props.pointC[1] - centerY) * scale + translateY,
            0
        ];
        
        return {
            pointA: newPointA,
            pointB: newPointB,
            pointC: newPointC
        };
    },
    
    getMoveAnchor: function(element) {
        // 使用三点的中心作为锚点
        const points = [element.props.pointA, element.props.pointB, element.props.pointC];
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
        
        return { x: centerX, y: centerY };
    },
    
    handleMove: function(element, moveInfo, editor) {
        const anchor = this.getMoveAnchor(element);
        const dx = moveInfo.currentPoint.x - moveInfo.offset.x - anchor.x;
        const dy = moveInfo.currentPoint.y - moveInfo.offset.y - anchor.y;
        
        return {
            pointA: [element.props.pointA[0] + dx, element.props.pointA[1] + dy, 0],
            pointB: [element.props.pointB[0] + dx, element.props.pointB[1] + dy, 0],
            pointC: [element.props.pointC[0] + dx, element.props.pointC[1] + dy, 0]
        };
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        
        const circleInfo = calculateArcCircle(props.pointA, props.pointB, props.pointC);
        if (!circleInfo) {
            return `# ${varName}: 三点共线，无法生成圆弧`;
        }
        
        const { center, radius, startAngle, endAngle } = circleInfo;
        const strokeColor = hexToManimColor(props.stroke_color || '#e74c3c');
        
        // Manim Arc 参数
        const startRad = startAngle * Math.PI / 180;
        const angleSpan = ((endAngle - startAngle + 360) % 360) * Math.PI / 180;
        
        let code = `${varName} = Arc(radius=${formatNumber(radius)}, start_angle=${formatNumber(startRad)}, angle=${formatNumber(angleSpan)})`;
        code += `.move_to([${formatNumber(center.x)}, ${formatNumber(center.y)}, 0])`;
        
        const strokeWidth = formatNumber(props.stroke_width !== undefined ? props.stroke_width : 10);
        code += `.set_stroke(${strokeColor}, width=${strokeWidth})`;
        
        const zOrder = props.z_order !== undefined ? props.z_order : 0;
        if (zOrder !== 0) {
            code += `.set_z_index(${zOrder})`;
        }
        
        return code;
    },
    
    onUpgrade: function(props) {
        const upgraded = { ...props };
        
        if (upgraded.stroke_color === undefined) {
            upgraded.stroke_color = upgraded.color || '#e74c3c';
        }
        if (upgraded.stroke_width === undefined) {
            upgraded.stroke_width = 10;
        }
        if (upgraded.z_order === undefined) {
            upgraded.z_order = 0;
        }
        
        return upgraded;
    },
    
    properties: [
        { key: 'stroke_color', label: '线条颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number', step: 0.5, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});

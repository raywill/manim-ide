/**
 * Sector 插件 - 扇形（由三点式圆弧定义）
 * A 起点，B 经过点，C 终点，方向与 arc 一致：从 A 沿着经过 B 到 C。
 */

// 常量集中定义
const SECTOR_DEFAULTS = {
    fill_color: '#3498db',
    fill_opacity: 1,
    stroke_color: '#3498d0',
    stroke_width: 2,
    z_order: 0
};
const HIT_RADIUS_TOLERANCE = 0.3; // Manim单位
const HIT_ANGLE_TOLERANCE_DEG = 2; // 角度容差
const PREVIEW_STYLES = {
    pointAColor: '#e74c3c',
    pointBColor: '#3498db',
    pointCColor: '#9b59b6',
    labelColor: '#2c3e50',
    warningColor: '#e74c3c',
    previewFillColor: '#3498db',
    previewStrokeColor: '#3498db'
};

// 辅助函数：计算通过三点的圆与方向（与 arc 保持一致）
function calculateArcCircle(pointA, pointB, pointC) {
    const ax = pointA[0], ay = pointA[1];
    const bx = pointB[0], by = pointB[1];
    const cx = pointC[0], cy = pointC[1];
    const det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(det) < 1e-6) return null;
    const d = 2 * ((ax - cx) * (by - cy) - (bx - cx) * (ay - cy));
    if (Math.abs(d) < 1e-6) return null;
    const aSq = ax * ax + ay * ay;
    const bSq = bx * bx + by * by;
    const cSq = cx * cx + cy * cy;
    const centerX = ((aSq - cSq) * (by - cy) - (bSq - cSq) * (ay - cy)) / d;
    const centerY = ((ax - cx) * (bSq - cSq) - (bx - cx) * (aSq - cSq)) / d;
    const radius = Math.sqrt((ax - centerX) ** 2 + (ay - centerY) ** 2);
    const angleA = Math.atan2(ay - centerY, ax - centerX) * 180 / Math.PI;
    const angleB = Math.atan2(by - centerY, bx - centerX) * 180 / Math.PI;
    const angleC = Math.atan2(cy - centerY, cx - centerX) * 180 / Math.PI;
    const normA = (angleA + 360) % 360;
    const normB = (angleB + 360) % 360;
    const normC = (angleC + 360) % 360;
    const spanAB = (normB - normA + 360) % 360;
    const spanAC = (normC - normA + 360) % 360;
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
    type: 'sector',
    name: '扇形',
    icon: '⤿',
    version: '2.0.0',
    drawMode: 'multiClick',

    createDefault: function(x, y) {
        return {
            type: 'sector',
            name: 'sector_' + (ManimEditor.elements.length + 1),
            props: {
                // 三点：默认给出一个小三点配置，初始尺寸不为固定值且可编辑
                pointA: [x !== undefined ? x - 1 : -1, y !== undefined ? y : 0, 0],
                pointB: [x !== undefined ? x : 0, y !== undefined ? y + 1 : 1, 0],
                pointC: [x !== undefined ? x + 1 : 1, y !== undefined ? y : 0, 0],
                fill_color: SECTOR_DEFAULTS.fill_color,
                fill_opacity: SECTOR_DEFAULTS.fill_opacity,
                stroke_color: SECTOR_DEFAULTS.stroke_color,
                stroke_width: SECTOR_DEFAULTS.stroke_width,
                z_order: SECTOR_DEFAULTS.z_order,
                hidden: false
            }
        };
    },

    render: function(ctx, element, editor) {
        const props = element.props;
        const circleInfo = calculateArcCircle(props.pointA, props.pointB, props.pointC);
        if (!circleInfo) return; // 共线不渲染

        const { center, radius, startAngle, endAngle, isClockwise } = circleInfo;
        const centerCanvas = editor.manimToCanvas(center.x, center.y);
        const radiusPixels = radius * 50;

        setRenderOpacity(ctx, element);

        const startRad = -startAngle * Math.PI / 180;
        const endRad = -endAngle * Math.PI / 180;
        const anticlockwise = isClockwise; // 画布Y轴反转下，与 arc 相同处理

        // 扇形路径：中心 -> A -> 圆弧 -> 回到中心
        // 注意：扇形允许使用 moveTo/closePath（Arc 禁止是为了只画弧线）
        // 计算A点画布坐标
        const aCanvas = editor.manimToCanvas(props.pointA[0], props.pointA[1]);

        ctx.beginPath();
        ctx.moveTo(centerCanvas.x, centerCanvas.y);
        ctx.lineTo(aCanvas.x, aCanvas.y);
        ctx.arc(centerCanvas.x, centerCanvas.y, radiusPixels, startRad, endRad, anticlockwise);
        ctx.closePath();

        // 填充
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : SECTOR_DEFAULTS.fill_opacity;
        if (fillOpacity > 0) {
            const savedAlpha = ctx.globalAlpha;
            ctx.fillStyle = props.fill_color || SECTOR_DEFAULTS.fill_color;
            ctx.globalAlpha = savedAlpha * fillOpacity;
            ctx.fill();
            ctx.globalAlpha = savedAlpha;
        }

        // 描边
        ctx.strokeStyle = props.stroke_color || SECTOR_DEFAULTS.stroke_color;
        ctx.lineWidth = props.stroke_width !== undefined ? props.stroke_width : SECTOR_DEFAULTS.stroke_width;
        ctx.lineCap = 'butt';
        ctx.stroke();

        // 圆心标记
        ctx.fillStyle = '#95a5a6';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(centerCanvas.x, centerCanvas.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 选中时绘制控制点 A/B/C（蓝色实心）
        if (element.id === editor.selectedElement?.id) {
            const points = [element.props.pointA, element.props.pointB, element.props.pointC];
            ctx.fillStyle = PREVIEW_STYLES.pointBColor || '#3498db';
            points.forEach(p => {
                const c = editor.manimToCanvas(p[0], p[1]);
                ctx.beginPath();
                ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    },

    onDrawClick: function(state, point, editor) {
        if (!state) {
            return { continue: true, state: { pointA: point } };
        } else if (state.pointA && !state.pointB) {
            return { continue: true, state: { pointA: state.pointA, pointB: point } };
        } else if (state.pointB) {
            const circleInfo = calculateArcCircle(state.pointA, state.pointB, point);
            if (!circleInfo) {
                alert('三点共线，无法确定扇形！请选择其他位置。');
                return { continue: true, state };
            }
            const element = {
                type: 'sector',
                name: 'sector_' + (editor.elements.length + 1),
                props: {
                    pointA: state.pointA,
                    pointB: state.pointB,
                    pointC: point,
                    fill_color: SECTOR_DEFAULTS.fill_color,
                    fill_opacity: SECTOR_DEFAULTS.fill_opacity,
                    stroke_color: SECTOR_DEFAULTS.stroke_color,
                    stroke_width: SECTOR_DEFAULTS.stroke_width,
                    z_order: SECTOR_DEFAULTS.z_order,
                    hidden: false
                }
            };
            return { continue: false, element };
        }
        return { continue: false };
    },

    onDrawDoubleClick: function(state, editor) {
        console.warn('扇形需要3次点击');
        return null;
    },

    renderDrawingPreview: function(ctx, state, editor) {
        if (!state) return;
        const previewPoint = editor.previewPoint;

        // A点
        if (state.pointA) {
            const a = editor.manimToCanvas(state.pointA[0], state.pointA[1]);
            ctx.fillStyle = PREVIEW_STYLES.pointAColor;
            ctx.beginPath();
            ctx.arc(a.x, a.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PREVIEW_STYLES.labelColor;
            ctx.font = '12px monospace';
            ctx.fillText('A(起点)', a.x + 10, a.y - 10);
        }

        // B点
        if (state.pointB) {
            const b = editor.manimToCanvas(state.pointB[0], state.pointB[1]);
            ctx.fillStyle = PREVIEW_STYLES.pointBColor;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PREVIEW_STYLES.labelColor;
            ctx.fillText('B(经过)', b.x + 10, b.y - 10);
        }

        if (state.pointB && previewPoint) {
            const circleInfo = calculateArcCircle(state.pointA, state.pointB, previewPoint);
            if (circleInfo) {
                const { center, radius, startAngle, endAngle, isClockwise } = circleInfo;
                const centerCanvas = editor.manimToCanvas(center.x, center.y);
                const radiusPixels = radius * 50;
                const startRad = -startAngle * Math.PI / 180;
                const endRad = -endAngle * Math.PI / 180;
                const anticlockwise = isClockwise;
                const aCanvas = editor.manimToCanvas(state.pointA[0], state.pointA[1]);

                ctx.globalAlpha = 0.6;
                ctx.fillStyle = PREVIEW_STYLES.previewFillColor;
                ctx.beginPath();
                ctx.moveTo(centerCanvas.x, centerCanvas.y);
                ctx.lineTo(aCanvas.x, aCanvas.y);
                ctx.arc(centerCanvas.x, centerCanvas.y, radiusPixels, startRad, endRad, anticlockwise);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = PREVIEW_STYLES.warningColor;
                ctx.font = '14px sans-serif';
                ctx.fillText('⚠️ 三点共线，请选择其他位置', 20, 50);
            }

            const c = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
            ctx.fillStyle = PREVIEW_STYLES.pointCColor;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = PREVIEW_STYLES.labelColor;
            ctx.fillText('C(终点)', c.x + 10, c.y - 10);
        } else if (state.pointA && previewPoint) {
            const a = editor.manimToCanvas(state.pointA[0], state.pointA[1]);
            const p = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
            ctx.strokeStyle = PREVIEW_STYLES.previewStrokeColor;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = PREVIEW_STYLES.pointBColor;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = PREVIEW_STYLES.labelColor;
            ctx.fillText('B(经过)', p.x + 10, p.y - 10);
        }

        ctx.fillStyle = PREVIEW_STYLES.labelColor;
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
        const dx = manimX - center.x;
        const dy = manimY - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const tolerance = HIT_RADIUS_TOLERANCE; // 至少0.3单位
        if (distance > radius + tolerance) return false; // 超出扇形半径

        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        let start = startAngle % 360; if (start < 0) start += 360;
        let end = endAngle % 360; if (end < 0) end += 360;

        if (isClockwise) {
            const angleFromStart = (angle - start + 360) % 360;
            const arcSpan = (end - start + 360) % 360;
            return angleFromStart <= arcSpan + HIT_ANGLE_TOLERANCE_DEG; // 角度容差
        } else {
            const angleFromStart = (start - angle + 360) % 360;
            const arcSpan = (start - end + 360) % 360;
            return angleFromStart <= arcSpan + HIT_ANGLE_TOLERANCE_DEG;
        }
    },

    getBounds: function(element, editor) {
        const circleInfo = calculateArcCircle(element.props.pointA, element.props.pointB, element.props.pointC);
        if (!circleInfo) {
            const points = [element.props.pointA, element.props.pointB, element.props.pointC];
            const xs = points.map(p => p[0]);
            const ys = points.map(p => p[1]);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const topLeft = editor.manimToCanvas(minX, maxY);
            const bottomRight = editor.manimToCanvas(maxX, minY);
            return { x: topLeft.x, y: topLeft.y, w: bottomRight.x - topLeft.x, h: bottomRight.y - topLeft.y };
        }
        const { center, radius } = circleInfo;
        const left = center.x - radius;
        const right = center.x + radius;
        const top = center.y + radius;
        const bottom = center.y - radius;
        const topLeft = editor.manimToCanvas(left, top);
        const bottomRight = editor.manimToCanvas(right, bottom);
        return { x: topLeft.x, y: topLeft.y, w: bottomRight.x - topLeft.x, h: bottomRight.y - topLeft.y };
    },

    handleScale: function(element, scaleInfo, editor) {
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
        const oldWidth = Math.max(1e-6, maxX - minX);
        const oldHeight = Math.max(1e-6, maxY - minY);
        const newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        const newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        const newSize = Math.max(newWidth, newHeight);
        const scale = newSize / Math.max(oldWidth, oldHeight);
        let newCornerX, newCornerY;
        if (corner === 'topLeft') { newCornerX = fixedPoint.x - newSize; newCornerY = fixedPoint.y + newSize; }
        else if (corner === 'topRight') { newCornerX = fixedPoint.x + newSize; newCornerY = fixedPoint.y + newSize; }
        else if (corner === 'bottomRight') { newCornerX = fixedPoint.x + newSize; newCornerY = fixedPoint.y - newSize; }
        else { newCornerX = fixedPoint.x - newSize; newCornerY = fixedPoint.y - newSize; }
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        const translateX = newCenterX - centerX;
        const translateY = newCenterY - centerY;
        const scalePoint = (p) => [centerX + (p[0] - centerX) * scale + translateX, centerY + (p[1] - centerY) * scale + translateY, 0];
        return {
            pointA: scalePoint(element.props.pointA),
            pointB: scalePoint(element.props.pointB),
            pointC: scalePoint(element.props.pointC)
        };
    },

    getMoveAnchor: function(element) {
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

    // 控制点：A/B/C
    getControlPoints: function(element, editor) {
        return [
            { id: 'A', x: element.props.pointA[0], y: element.props.pointA[1] },
            { id: 'B', x: element.props.pointB[0], y: element.props.pointB[1] },
            { id: 'C', x: element.props.pointC[0], y: element.props.pointC[1] }
        ];
    },

    updateControlPoint: function(element, pointId, newX, newY, editor) {
        const updated = {};
        if (pointId === 'A') updated.pointA = [newX, newY, 0];
        if (pointId === 'B') updated.pointB = [newX, newY, 0];
        if (pointId === 'C') updated.pointC = [newX, newY, 0];
        return updated;
    },

    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const circleInfo = calculateArcCircle(props.pointA, props.pointB, props.pointC);
        if (!circleInfo) return `# ${varName}: 三点共线，无法生成扇形`;
        const { center, radius, startAngle, endAngle, throughAngle } = circleInfo;
        const startRad = startAngle * Math.PI / 180;
        const spanAC = (endAngle - startAngle + 360) % 360;      // CCW A->C
        const spanAB = (throughAngle - startAngle + 360) % 360;  // CCW A->B
        const signedSpanDeg = (spanAB <= spanAC) ? spanAC : -(360 - spanAC);
        const signedSpanRad = signedSpanDeg * Math.PI / 180;
        let code = `${varName} = Sector(radius=${formatNumber(radius)}, start_angle=${formatNumber(startRad)}, angle=${formatNumber(signedSpanRad)})`;
        code += `.move_to([${formatNumber(center.x)}, ${formatNumber(center.y)}, 0])`;
        const fillColor = hexToManimColor(props.fill_color || SECTOR_DEFAULTS.fill_color);
        const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : SECTOR_DEFAULTS.fill_opacity;
        if (fillOpacity > 0) {
            code += `.set_fill(${fillColor}, ${formatNumber(fillOpacity)})`;
        } else {
            code += `.set_fill(opacity=0)`;
        }
        const strokeColor = hexToManimColor(props.stroke_color || SECTOR_DEFAULTS.stroke_color);
        const strokeWidth = formatNumber(props.stroke_width !== undefined ? props.stroke_width : SECTOR_DEFAULTS.stroke_width);
        code += `.set_stroke(${strokeColor}, width=${strokeWidth})`;
        const zOrder = props.z_order !== undefined ? props.z_order : SECTOR_DEFAULTS.z_order;
        if (zOrder !== 0) code += `.set_z_index(${zOrder})`;
        return code;
    },

    onUpgrade: function(props) {
        const upgraded = { ...props };
        if (upgraded.fill_color === undefined) upgraded.fill_color = upgraded.color || SECTOR_DEFAULTS.fill_color;
        if (upgraded.fill_opacity === undefined) upgraded.fill_opacity = upgraded.opacity !== undefined ? upgraded.opacity : SECTOR_DEFAULTS.fill_opacity;
        if (upgraded.stroke_color === undefined) upgraded.stroke_color = SECTOR_DEFAULTS.stroke_color;
        if (upgraded.stroke_width === undefined) upgraded.stroke_width = SECTOR_DEFAULTS.stroke_width;
        if (upgraded.z_order === undefined) upgraded.z_order = SECTOR_DEFAULTS.z_order;
        return upgraded;
    },

    properties: [
        { key: 'fill_color', label: '填充色', type: 'color' },
        { key: 'fill_opacity', label: '填充透明度', type: 'number', step: 0.1, min: 0, max: 1 },
        { key: 'stroke_color', label: '边框色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number', step: 0.5, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});



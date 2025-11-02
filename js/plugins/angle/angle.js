/**
 * Angle 插件 - 三点定义夹角（A 顶点一侧、B 公共顶点、C 顶点另一侧）
 * - 仅渲染小于180°的较小夹角；通过 A、B、C 调整夹角
 * - 在 B 处绘制一个小弧和 θ 符号作为标记
 * - 控制点为蓝色实心点
 */

// 默认样式集中管理
const ANGLE_DEFAULTS = {
    stroke_color: '#2c3e50',
    stroke_width: 2,
    label_color: '#2c3e50',
    radius_ratio: 0.3, // 相对半径：min(|BA|, |BC|) * ratio
    z_order: 0
};

const ANGLE_PREVIEW = {
    pointColor: '#3498db',
    helperColor: '#95a5a6'
};

// 计算从 p0 指向 p1 的角（度），范围 [0, 360)
function angleDeg(p0, p1) {
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    let a = Math.atan2(dy, dx) * 180 / Math.PI;
    if (a < 0) a += 360;
    return a;
}

// 归一化角度差到 [0, 360)
function normDeg(a) {
    let x = a % 360;
    if (x < 0) x += 360;
    return x;
}

// 取得以 start 为起点到 end 的最小夹角方向与大小
// 返回 { span: 角度(<=180), clockwise: boolean }
function shortestSpan(startDeg, endDeg) {
    const cw = normDeg(endDeg - startDeg);      // 顺时针差
    const ccw = normDeg(startDeg - endDeg);     // 逆时针差
    if (cw <= ccw) {
        return { span: cw <= 180 ? cw : 360 - cw, clockwise: cw <= 180 };
    } else {
        return { span: ccw <= 180 ? ccw : 360 - ccw, clockwise: !(ccw <= 180) };
    }
}

// 计算渲染小弧所需信息：中心=点B、半径、起止角与画布方向
function computeAngleArcInfo(pointA, pointB, pointC, radiusRatio) {
    const angA = angleDeg(pointB, pointA); // 从B指向A
    const angC = angleDeg(pointB, pointC); // 从B指向C
    // 找到更小的夹角
    let cwSpan = normDeg(angC - angA);
    if (cwSpan > 180) cwSpan = 360 - cwSpan;
    const span = cwSpan; // 保证 <= 180

    // 选择方向，使从A到C经过较小夹角
    const diff = normDeg(angC - angA);
    const clockwise = diff <= 180; // 在数学正向坐标下，顺时针为 diff<=180 的短路径

    // 半径：与两边长度相关
    const lenBA = Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]);
    const lenBC = Math.hypot(pointC[0] - pointB[0], pointC[1] - pointB[1]);
    const base = Math.max(1e-6, Math.min(lenBA, lenBC));
    const radius = base * (radiusRatio !== undefined ? radiusRatio : ANGLE_DEFAULTS.radius_ratio);

    return { center: { x: pointB[0], y: pointB[1] }, startDeg: angA, endDeg: angC, span, clockwise, radius };
}

registerShape({
    type: 'angle',
    name: '夹角',
    icon: '∠',
    version: '1.0.0',
    drawMode: 'multiClick',

    createDefault: function(x, y) {
        const bx = x !== undefined ? x : 0;
        const by = y !== undefined ? y : 0;
        return {
            type: 'angle',
            name: 'angle_' + (ManimEditor.elements.length + 1),
            props: {
                pointA: [bx - 1, by, 0],
                pointB: [bx, by, 0],
                pointC: [bx, by + 1, 0],
                stroke_color: ANGLE_DEFAULTS.stroke_color,
                stroke_width: ANGLE_DEFAULTS.stroke_width,
                label_color: ANGLE_DEFAULTS.label_color,
                radius_ratio: ANGLE_DEFAULTS.radius_ratio,
                z_order: ANGLE_DEFAULTS.z_order,
                hidden: false
            }
        };
    },

    render: function(ctx, element, editor) {
        const p = element.props;
        const ratio = p.radius_ratio !== undefined ? p.radius_ratio : ANGLE_DEFAULTS.radius_ratio;
        const info = computeAngleArcInfo(p.pointA, p.pointB, p.pointC, ratio);

        setRenderOpacity(ctx, element);

        // 画弧：中心B
        const centerCanvas = editor.manimToCanvas(info.center.x, info.center.y);
        const radiusPixels = info.radius * 50;
        const startRad = -info.startDeg * Math.PI / 180;
        const endRad = -info.endDeg * Math.PI / 180;
        const anticlockwise = info.clockwise; // 画布Y轴反转，方向取同 arc/sector 的处理

        ctx.beginPath();
        ctx.arc(centerCanvas.x, centerCanvas.y, radiusPixels, startRad, endRad, anticlockwise);
        ctx.strokeStyle = p.stroke_color || ANGLE_DEFAULTS.stroke_color;
        ctx.lineWidth = p.stroke_width !== undefined ? p.stroke_width : ANGLE_DEFAULTS.stroke_width;
        ctx.lineCap = 'butt';
        ctx.stroke();

        // 画两条边（射线）：B->A 与 B->C
        const aCanvas = editor.manimToCanvas(p.pointA[0], p.pointA[1]);
        const bCanvas = editor.manimToCanvas(p.pointB[0], p.pointB[1]);
        const cCanvas = editor.manimToCanvas(p.pointC[0], p.pointC[1]);

        ctx.strokeStyle = p.stroke_color || ANGLE_DEFAULTS.stroke_color;
        ctx.lineWidth = p.stroke_width !== undefined ? p.stroke_width : ANGLE_DEFAULTS.stroke_width;
        ctx.beginPath();
        ctx.moveTo(bCanvas.x, bCanvas.y);
        ctx.lineTo(aCanvas.x, aCanvas.y);
        ctx.moveTo(bCanvas.x, bCanvas.y);
        ctx.lineTo(cCanvas.x, cCanvas.y);
        ctx.stroke();

        // θ 符号：放在弧线中点方向上
        const midDeg = normDeg(info.startDeg + (info.clockwise ? info.span / 2 : -info.span / 2));
        const midRad = -midDeg * Math.PI / 180;
        const labelR = radiusPixels + 12; // 稍微偏外
        const lx = centerCanvas.x + Math.cos(midRad) * labelR;
        const ly = centerCanvas.y + Math.sin(midRad) * labelR;
        ctx.fillStyle = p.label_color || ANGLE_DEFAULTS.label_color;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('θ', lx, ly);

        // 选中时显示控制点（蓝色实心）
        if (element.id === editor.selectedElement?.id) {
            const points = [p.pointA, p.pointB, p.pointC];
            ctx.fillStyle = ANGLE_PREVIEW.pointColor;
            points.forEach(pt => {
                const c = editor.manimToCanvas(pt[0], pt[1]);
                ctx.beginPath();
                ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    },

    // 点击三次：A、B、C
    onDrawClick: function(state, point, editor) {
        if (!state) {
            return { continue: true, state: { pointA: point } };
        } else if (state.pointA && !state.pointB) {
            return { continue: true, state: { pointA: state.pointA, pointB: point } };
        } else if (state.pointB) {
            const element = {
                type: 'angle',
                name: 'angle_' + (editor.elements.length + 1),
                props: {
                    pointA: state.pointA,
                    pointB: state.pointB,
                    pointC: point,
                    stroke_color: ANGLE_DEFAULTS.stroke_color,
                    stroke_width: ANGLE_DEFAULTS.stroke_width,
                    label_color: ANGLE_DEFAULTS.label_color,
                    radius_ratio: ANGLE_DEFAULTS.radius_ratio,
                    z_order: ANGLE_DEFAULTS.z_order,
                    hidden: false
                }
            };
            return { continue: false, element };
        }
        return { continue: false };
    },

    onDrawDoubleClick: function(state, editor) {
        console.warn('夹角需要3次点击');
        return null;
    },

    renderDrawingPreview: function(ctx, state, editor) {
        if (!state) return;
        const previewPoint = editor.previewPoint;

        // 已放置点
        if (state.pointA) {
            const a = editor.manimToCanvas(state.pointA[0], state.pointA[1]);
            ctx.fillStyle = ANGLE_PREVIEW.pointColor;
            ctx.beginPath();
            ctx.arc(a.x, a.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        if (state.pointB) {
            const b = editor.manimToCanvas(state.pointB[0], state.pointB[1]);
            ctx.fillStyle = ANGLE_PREVIEW.pointColor;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // 预览小弧、两条边和C点
        if (state.pointB && previewPoint) {
            const ratio = ANGLE_DEFAULTS.radius_ratio;
            const info = computeAngleArcInfo(state.pointA || previewPoint, state.pointB, previewPoint, ratio);
            const centerCanvas = editor.manimToCanvas(info.center.x, info.center.y);
            const radiusPixels = info.radius * 50;
            const startRad = -info.startDeg * Math.PI / 180;
            const endRad = -info.endDeg * Math.PI / 180;
            const anticlockwise = info.clockwise;

            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = ANGLE_DEFAULTS.stroke_color;
            ctx.lineWidth = ANGLE_DEFAULTS.stroke_width;
            ctx.beginPath();
            ctx.arc(centerCanvas.x, centerCanvas.y, radiusPixels, startRad, endRad, anticlockwise);
            ctx.stroke();
            ctx.globalAlpha = 1;

            // 预览边：B->A、B->预览C
            if (state.pointA) {
                const a = editor.manimToCanvas(state.pointA[0], state.pointA[1]);
                const b = editor.manimToCanvas(state.pointB[0], state.pointB[1]);
                ctx.strokeStyle = ANGLE_PREVIEW.helperColor;
                ctx.lineWidth = ANGLE_DEFAULTS.stroke_width;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(a.x, a.y);
                ctx.stroke();
            }
            {
                const b = editor.manimToCanvas(state.pointB[0], state.pointB[1]);
                const c = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
                ctx.strokeStyle = ANGLE_PREVIEW.helperColor;
                ctx.lineWidth = ANGLE_DEFAULTS.stroke_width;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(c.x, c.y);
                ctx.stroke();
            }

            const c = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
            ctx.fillStyle = ANGLE_PREVIEW.pointColor;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (state.pointA && previewPoint) {
            // A -> B 的虚线辅助
            const a = editor.manimToCanvas(state.pointA[0], state.pointA[1]);
            const p = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
            ctx.strokeStyle = ANGLE_PREVIEW.helperColor;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 底部提示
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px sans-serif';
        const step = !state ? 0 : (!state.pointB ? 1 : 2);
        const messages = ['点击放置点 A', '点击放置公共顶点 B', '点击放置点 C（形成夹角）'];
        ctx.fillText(messages[step], 20, editor.canvas.height - 20);
    },

    hitTest: function(element, manimX, manimY, editor) {
        const p = element.props;
        const ratio = p.radius_ratio !== undefined ? p.radius_ratio : ANGLE_DEFAULTS.radius_ratio;
        const info = computeAngleArcInfo(p.pointA, p.pointB, p.pointC, ratio);
        const dx = manimX - info.center.x;
        const dy = manimY - info.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const r = info.radius;
        const tolerance = Math.max(p.stroke_width !== undefined ? p.stroke_width / 50 : ANGLE_DEFAULTS.stroke_width / 50, 0.3);
        // 先检测弧
        if (Math.abs(distance - r) <= tolerance) {
            let ang = Math.atan2(dy, dx) * 180 / Math.PI;
            if (ang < 0) ang += 360;
            const start = normDeg(info.startDeg);
            const end = normDeg(info.endDeg);
            const span = info.clockwise ? normDeg(end - start) : normDeg(start - end);
            const angFromStart = info.clockwise ? normDeg(ang - start) : normDeg(start - ang);
            const angleTol = 5; // 度
            if (angFromStart <= span + angleTol) return true;
        }

        // 再检测边（线段 BA 与 BC）
        function distPointToSegment(px, py, x1, y1, x2, y2) {
            const vx = x2 - x1, vy = y2 - y1;
            const wx = px - x1, wy = py - y1;
            const c1 = vx * wx + vy * wy;
            if (c1 <= 0) return Math.hypot(px - x1, py - y1);
            const c2 = vx * vx + vy * vy;
            if (c2 <= c1) return Math.hypot(px - x2, py - y2);
            const t = c1 / c2;
            const projx = x1 + t * vx;
            const projy = y1 + t * vy;
            return Math.hypot(px - projx, py - projy);
        }
        const tLine = Math.max(0.3, (p.stroke_width !== undefined ? p.stroke_width : ANGLE_DEFAULTS.stroke_width) / 50);
        const dBA = distPointToSegment(manimX, manimY, p.pointB[0], p.pointB[1], p.pointA[0], p.pointA[1]);
        if (dBA <= tLine) return true;
        const dBC = distPointToSegment(manimX, manimY, p.pointB[0], p.pointB[1], p.pointC[0], p.pointC[1]);
        if (dBC <= tLine) return true;
        return false;
    },

    getBounds: function(element, editor) {
        const p = element.props;
        const ratio = p.radius_ratio !== undefined ? p.radius_ratio : ANGLE_DEFAULTS.radius_ratio;
        const info = computeAngleArcInfo(p.pointA, p.pointB, p.pointC, ratio);
        // 组合边界：包含点A/B/C 与 以B为中心的弧半径框
        const xs = [p.pointA[0], p.pointB[0], p.pointC[0], info.center.x - info.radius, info.center.x + info.radius];
        const ys = [p.pointA[1], p.pointB[1], p.pointC[1], info.center.y - info.radius, info.center.y + info.radius];
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const tl = editor.manimToCanvas(minX, maxY);
        const br = editor.manimToCanvas(maxX, minY);
        return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
    },

    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint } = scaleInfo;
        const pts = [element.props.pointA, element.props.pointB, element.props.pointC];
        const xs = pts.map(p => p[0]);
        const ys = pts.map(p => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const oldW = Math.max(1e-6, maxX - minX);
        const oldH = Math.max(1e-6, maxY - minY);
        const newW = Math.abs(currentPoint.x - fixedPoint.x);
        const newH = Math.abs(currentPoint.y - fixedPoint.y);
        const newSize = Math.max(newW, newH);
        const scale = newSize / Math.max(oldW, oldH);

        let newCornerX, newCornerY;
        if (corner === 'topLeft') { newCornerX = fixedPoint.x - newSize; newCornerY = fixedPoint.y + newSize; }
        else if (corner === 'topRight') { newCornerX = fixedPoint.x + newSize; newCornerY = fixedPoint.y + newSize; }
        else if (corner === 'bottomRight') { newCornerX = fixedPoint.x + newSize; newCornerY = fixedPoint.y - newSize; }
        else { newCornerX = fixedPoint.x - newSize; newCornerY = fixedPoint.y - newSize; }
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        const tx = newCenterX - centerX;
        const ty = newCenterY - centerY;

        const scalePoint = (pt) => [centerX + (pt[0] - centerX) * scale + tx, centerY + (pt[1] - centerY) * scale + ty, 0];
        return {
            pointA: scalePoint(element.props.pointA),
            pointB: scalePoint(element.props.pointB),
            pointC: scalePoint(element.props.pointC)
        };
    },

    getMoveAnchor: function(element) {
        const pts = [element.props.pointA, element.props.pointB, element.props.pointC];
        const xs = pts.map(p => p[0]);
        const ys = pts.map(p => p[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        return { x: cx, y: cy };
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
        const p = element.props;
        const varName = sanitizeVariableName(element.name);
        const ratio = p.radius_ratio !== undefined ? p.radius_ratio : ANGLE_DEFAULTS.radius_ratio;
        const info = computeAngleArcInfo(p.pointA, p.pointB, p.pointC, ratio);
        const startRad = info.startDeg * Math.PI / 180;
        // 以B为中心的两条射线：A与C。总是选择小于等于180°的较小夹角。
        const spanAC = normDeg(info.endDeg - info.startDeg);
        const signedSpanDeg = (spanAC <= 180) ? spanAC : -(360 - spanAC);
        const angleRad = signedSpanDeg * Math.PI / 180;

        let code = `${varName}_core = Arc(radius=${formatNumber(info.radius)}, start_angle=${formatNumber(startRad)}, angle=${formatNumber(angleRad)})`;
        // 对于Arc，应使用 move_arc_center_to 精确移动圆心
        code += `.move_arc_center_to([${formatNumber(info.center.x)}, ${formatNumber(info.center.y)}, 0])`;
        const strokeColor = hexToManimColor(p.stroke_color || ANGLE_DEFAULTS.stroke_color);
        const strokeWidth = formatNumber(p.stroke_width !== undefined ? p.stroke_width : ANGLE_DEFAULTS.stroke_width);
        code += `.set_stroke(${strokeColor}, width=${strokeWidth})`;

        // θ 文本（使用 MathTex），放置在弧中点方向上
        const midDeg = normDeg(info.startDeg + (info.clockwise ? info.span / 2 : -info.span / 2));
        const midRad = midDeg * Math.PI / 180;
        const labelR = info.radius * 1.2;
        const lx = info.center.x + Math.cos(midRad) * labelR;
        const ly = info.center.y + Math.sin(midRad) * labelR;
        const labelColor = hexToManimColor(p.label_color || ANGLE_DEFAULTS.label_color);
        code += `\n${varName}_theta = MathTex(r"\\theta").scale(0.6)`;
        code += `.set_color(${labelColor}).move_to([${formatNumber(lx)}, ${formatNumber(ly)}, 0])`;

        // 分组：确保导出时 self.add(${varName}) 能同时添加弧与θ
        // 边线（B->A 与 B->C）
        const ax = formatNumber(p.pointA[0]);
        const ay = formatNumber(p.pointA[1]);
        const bx = formatNumber(p.pointB[0]);
        const by = formatNumber(p.pointB[1]);
        const cx = formatNumber(p.pointC[0]);
        const cy = formatNumber(p.pointC[1]);
        code += `\n${varName}_edge1 = Line([${bx}, ${by}, 0], [${ax}, ${ay}, 0]).set_stroke(${strokeColor}, width=${strokeWidth})`;
        code += `\n${varName}_edge2 = Line([${bx}, ${by}, 0], [${cx}, ${cy}, 0]).set_stroke(${strokeColor}, width=${strokeWidth})`;

        code += `\n${varName} = VGroup(${varName}_edge1, ${varName}_edge2, ${varName}_core, ${varName}_theta)`;
        const z = p.z_order !== undefined ? p.z_order : ANGLE_DEFAULTS.z_order;
        if (z !== 0) code += `.set_z_index(${z})`;

        return code;
    },

    onUpgrade: function(props) {
        const upgraded = { ...props };
        if (upgraded.stroke_color === undefined) upgraded.stroke_color = ANGLE_DEFAULTS.stroke_color;
        if (upgraded.stroke_width === undefined) upgraded.stroke_width = ANGLE_DEFAULTS.stroke_width;
        if (upgraded.label_color === undefined) upgraded.label_color = ANGLE_DEFAULTS.label_color;
        if (upgraded.radius_ratio === undefined) upgraded.radius_ratio = ANGLE_DEFAULTS.radius_ratio;
        if (upgraded.z_order === undefined) upgraded.z_order = ANGLE_DEFAULTS.z_order;
        return upgraded;
    },

    properties: [
        { key: 'stroke_color', label: '线条颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number', step: 0.5, min: 0.5 },
        { key: 'label_color', label: '标签颜色', type: 'color' },
        { key: 'radius_ratio', label: '相对半径', type: 'number', step: 0.01, min: 0.05, max: 0.9 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});



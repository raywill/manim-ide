/**
 * Brace 插件 - 大括号标注
 * 完全兼容 Manim 的 BraceBetweenPoints
 * - 拖动式绘制
 * - 精确 SVG 路径（贝塞尔曲线）
 * - 方向控制点
 */

// 默认值集中管理
const BRACE_DEFAULTS = {
    color: '#2c3e50',
    stroke_width: 2,
    direction: 1,           // 1 = 左侧（逆时针90度），-1 = 右侧（顺时针90度）
    buff: 0.2,             // 距离连线的间距（Manim单位）
    sharpness: 2.0,         // 大括号的尖锐度
    z_order: 0
};

const BRACE_PREVIEW = {
    color: '#3498db',
    opacity: 0.6
};

/**
 * 计算大括号的6段线段路径点
 * 简洁的几何风格，使用直线段
 */
function calculateBracePath(p1, p2, direction, buff, sharpness, pxPerUnit) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
        return null;
    }

    const ux = dx / length;
    const uy = dy / length;
    const nx = -uy;
    const ny = ux;

    const dir = direction || 1;
    const buffValue = buff !== undefined ? buff : BRACE_DEFAULTS.buff;
    const buffPx = Math.max(0, buffValue * pxPerUnit);

    const MM_TO_PX = 96 / 25.4;                 // 1mm ≈ 3.78px
    const CAP_ANGLE = Math.PI / 4;              // 45°
    const TIP_ANGLE = Math.PI / 6;              // 30°
    const BASE_SHORT_LENGTH = MM_TO_PX;         // 短线默认 1mm
    const BASE_TIP_LENGTH = 0.22 * pxPerUnit;   // 尖端基准长度（近似 Manim）

    const tipScale = sharpness !== undefined ? (sharpness / BRACE_DEFAULTS.sharpness) : 1;

    let capLength = Math.min(length / 2, BASE_SHORT_LENGTH);
    let tipLength = Math.min(length / 3, BASE_TIP_LENGTH * tipScale);

    let capAxis = capLength * Math.cos(CAP_ANGLE);
    let tipAxis = tipLength * Math.cos(TIP_ANGLE);

    let totalAxis = 2 * (capAxis + tipAxis);
    if (totalAxis > length) {
        const scale = length > 0 ? length / totalAxis : 0;
        capLength *= scale;
        tipLength *= scale;
        capAxis = capLength * Math.cos(CAP_ANGLE);
        tipAxis = tipLength * Math.cos(TIP_ANGLE);
        totalAxis = 2 * (capAxis + tipAxis);
    }

    const mainAxis = Math.max(0, length - totalAxis);
    const mainSegmentLength = mainAxis / 2;

    function rotateUnit(vec, angle) {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        return {
            x: vec.x * cosA - vec.y * sinA,
            y: vec.x * sinA + vec.y * cosA
        };
    }

    const uVec = { x: ux, y: uy };
    const startCapDir = rotateUnit(uVec, dir * CAP_ANGLE);
    const tipUpDir = rotateUnit(uVec, dir * TIP_ANGLE);
    const tipDownDir = rotateUnit(uVec, -dir * TIP_ANGLE);

    const mainVec = { x: uVec.x * mainSegmentLength, y: uVec.y * mainSegmentLength };
    const startCapVec = { x: startCapDir.x * capLength, y: startCapDir.y * capLength };
    const tipUpVec = { x: tipUpDir.x * tipLength, y: tipUpDir.y * tipLength };
    const tipDownVec = { x: tipDownDir.x * tipLength, y: tipDownDir.y * tipLength };

    let current = { x: p1.x, y: p1.y };
    const points = [current];

    function push(delta) {
        current = { x: current.x + delta.x, y: current.y + delta.y };
        points.push(current);
    }

    push(startCapVec);
    push(mainVec);
    push(tipUpVec);
    push(tipDownVec);
    push(mainVec);
    push({ x: p2.x - current.x, y: p2.y - current.y });

    if (buffPx !== 0) {
        const shiftX = nx * dir * buffPx;
        const shiftY = ny * dir * buffPx;
        for (let i = 0; i < points.length; i++) {
            points[i] = {
                x: points[i].x + shiftX,
                y: points[i].y + shiftY
            };
        }
    }

    if (typeof window !== 'undefined' && window.debugBraceSegments) {
        const lengths = [];
        for (let i = 0; i < points.length - 1; i++) {
            const dxSeg = points[i + 1].x - points[i].x;
            const dySeg = points[i + 1].y - points[i].y;
            const lenPx = Math.sqrt(dxSeg * dxSeg + dySeg * dySeg);
            lengths.push({
                index: i + 1,
                px: lenPx,
                mm: lenPx / MM_TO_PX
            });
        }
        console.log('[brace] segment lengths (px/mm):', lengths);
    }

    return points;
}

/**
 * 绘制6段直线大括号（简洁几何风格）
 */
function drawBraceSmooth(ctx, points) {
    if (!points || points.length < 7) return;
    
    ctx.beginPath();
    
    // 依次连接所有7个点（6条线段）
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
}

/**
 * 辅助函数：点到线段的距离
 */
function pointToSegmentDistance(point, segStart, segEnd) {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
        const dist = Math.sqrt(
            (point.x - segStart.x) ** 2 + (point.y - segStart.y) ** 2
        );
        return dist;
    }
    
    const t = Math.max(0, Math.min(1,
        ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSquared
    ));
    
    const projX = segStart.x + t * dx;
    const projY = segStart.y + t * dy;
    
    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

registerShape({
    type: 'brace',
    name: '大括号',
    icon: '{',
    version: '1.2.0',
    drawMode: 'drag',
    
    createDefault: function(x, y) {
        return {
            type: 'brace',
            name: 'brace_' + (ManimEditor.elements.length + 1),
            props: {
                point1: [x !== undefined ? x : 0, y !== undefined ? y : 0, 0],
                point2: [x !== undefined ? x : 1, y !== undefined ? y : 0, 0],
                direction: BRACE_DEFAULTS.direction,
                buff: BRACE_DEFAULTS.buff,
                sharpness: BRACE_DEFAULTS.sharpness,
                color: BRACE_DEFAULTS.color,
                stroke_width: BRACE_DEFAULTS.stroke_width,
                z_order: BRACE_DEFAULTS.z_order,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const p = element.props;
        setRenderOpacity(ctx, element);
        
        const p1 = editor.manimToCanvas(p.point1[0], p.point1[1]);
        const p2 = editor.manimToCanvas(p.point2[0], p.point2[1]);
        
        const direction = p.direction !== undefined ? p.direction : BRACE_DEFAULTS.direction;
        const buff = p.buff !== undefined ? p.buff : BRACE_DEFAULTS.buff;
        const sharpness = p.sharpness !== undefined ? p.sharpness : BRACE_DEFAULTS.sharpness;
        
        // 计算大括号路径
        const points = calculateBracePath(p1, p2, direction, buff, sharpness, editor.pxPerUnit);
        
        if (!points) return;
        
        // 绘制大括号（6段直线）
        ctx.strokeStyle = p.color || BRACE_DEFAULTS.color;
        ctx.lineWidth = p.stroke_width !== undefined ? p.stroke_width : BRACE_DEFAULTS.stroke_width;
        ctx.lineCap = 'butt';   // 方形端点，保持锐利
        ctx.lineJoin = 'miter'; // 尖角连接，保持几何感
        
        drawBraceSmooth(ctx, points);
        
        // 调试：绘制端点
        if (element.id === editor.selectedElement?.id) {
            ctx.fillStyle = p.color || BRACE_DEFAULTS.color;
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            if (points.length >= 4) {
                const tipPoint = points[3];
                ctx.fillStyle = '#3498db';
                ctx.strokeStyle = '#1f77c5';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(tipPoint.x, tipPoint.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const p = element.props;
        const testPoint = editor.manimToCanvas(manimX, manimY);
        
        const p1 = editor.manimToCanvas(p.point1[0], p.point1[1]);
        const p2 = editor.manimToCanvas(p.point2[0], p.point2[1]);
        
        const direction = p.direction !== undefined ? p.direction : BRACE_DEFAULTS.direction;
        const buff = p.buff !== undefined ? p.buff : BRACE_DEFAULTS.buff;
        const sharpness = p.sharpness !== undefined ? p.sharpness : BRACE_DEFAULTS.sharpness;
        
        const points = calculateBracePath(p1, p2, direction, buff, sharpness, editor.pxPerUnit);
        
        if (!points) return false;
        
        // 检测点到曲线的距离
        const threshold = 15; // 像素
        
        for (let i = 0; i < points.length - 1; i++) {
            const dist = pointToSegmentDistance(
                testPoint,
                points[i],
                points[i + 1]
            );
            if (dist < threshold) return true;
        }
        
        return false;
    },
    
    getBounds: function(element, editor) {
        const p = element.props;
        const p1 = editor.manimToCanvas(p.point1[0], p.point1[1]);
        const p2 = editor.manimToCanvas(p.point2[0], p.point2[1]);
        
        const direction = p.direction !== undefined ? p.direction : BRACE_DEFAULTS.direction;
        const buff = p.buff !== undefined ? p.buff : BRACE_DEFAULTS.buff;
        const sharpness = p.sharpness !== undefined ? p.sharpness : BRACE_DEFAULTS.sharpness;
        
        const points = calculateBracePath(p1, p2, direction, buff, sharpness, editor.pxPerUnit);
        
        if (!points || points.length === 0) {
            return { x: p1.x, y: p1.y, w: 0, h: 0 };
        }
        
        // 计算所有点的边界
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        points.forEach(pt => {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
        });
        
        // 也包括端点
        minX = Math.min(minX, p1.x, p2.x);
        minY = Math.min(minY, p1.y, p2.y);
        maxX = Math.max(maxX, p1.x, p2.x);
        maxY = Math.max(maxY, p1.y, p2.y);
        
        return {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY
        };
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        element.props.point1 = [start.manimX, start.manimY, 0];
        element.props.point2 = [current.manimX, current.manimY, 0];
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, originalProps } = scaleInfo;
        
        const p1 = { x: originalProps.point1[0], y: originalProps.point1[1] };
        const p2 = { x: originalProps.point2[0], y: originalProps.point2[1] };
        const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const originalWidth = maxX - minX;
        const originalHeight = maxY - minY;
        
        // 计算新尺寸
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        // 计算新角位置
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
        
        // 缩放端点
        const newP1 = [
            newCenterX + (p1.x - center.x) * scaleX,
            newCenterY + (p1.y - center.y) * scaleY,
            0
        ];
        const newP2 = [
            newCenterX + (p2.x - center.x) * scaleX,
            newCenterY + (p2.y - center.y) * scaleY,
            0
        ];
        
        return { point1: newP1, point2: newP2 };
    },
    
    getMoveAnchor: function(element) {
        // 使用增量移动
        return null;
    },
    
    handleMove: function(element, moveInfo, editor) {
        if (moveInfo.deltaX !== undefined && moveInfo.deltaY !== undefined) {
            return {
                point1: [
                    element.props.point1[0] + moveInfo.deltaX,
                    element.props.point1[1] + moveInfo.deltaY,
                    0
                ],
                point2: [
                    element.props.point2[0] + moveInfo.deltaX,
                    element.props.point2[1] + moveInfo.deltaY,
                    0
                ]
            };
        }
        return {};
    },
    
    getControlPoints: function(element, editor) {
        const p = element.props;
        
        // 计算中点
        const midX = (p.point1[0] + p.point2[0]) / 2;
        const midY = (p.point1[1] + p.point2[1]) / 2;
        
        // 计算法向量
        const dx = p.point2[0] - p.point1[0];
        const dy = p.point2[1] - p.point1[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) {
            return [
                { id: 'point1', x: p.point1[0], y: p.point1[1], type: 'endpoint' },
                { id: 'point2', x: p.point2[0], y: p.point2[1], type: 'endpoint' }
            ];
        }
        
        const direction = p.direction !== undefined ? p.direction : BRACE_DEFAULTS.direction;
        const buff = p.buff !== undefined ? p.buff : BRACE_DEFAULTS.buff;
        const sharpness = p.sharpness !== undefined ? p.sharpness : BRACE_DEFAULTS.sharpness;
        
        const p1Canvas = editor.manimToCanvas(p.point1[0], p.point1[1]);
        const p2Canvas = editor.manimToCanvas(p.point2[0], p.point2[1]);
        const path = calculateBracePath(
            p1Canvas,
            p2Canvas,
            direction,
            buff,
            sharpness,
            editor.pxPerUnit
        );
        
        let tipManim;
        if (path && path.length >= 4) {
            const tipCanvas = path[3];
            const converted = editor.canvasToManim(tipCanvas.x, tipCanvas.y);
            tipManim = { x: converted.x, y: converted.y };
        } else {
            tipManim = { x: midX, y: midY };
        }
        
        return [
            { id: 'point1', x: p.point1[0], y: p.point1[1], type: 'endpoint' },
            { id: 'point2', x: p.point2[0], y: p.point2[1], type: 'endpoint' },
            { id: 'tip', x: tipManim.x, y: tipManim.y, type: 'direction' }
        ];
    },
    
    updateControlPoint: function(element, pointId, newX, newY, editor) {
        const p = element.props;
        
        if (pointId === 'point1') {
            return { point1: [newX, newY, 0] };
        } else if (pointId === 'point2') {
            return { point2: [newX, newY, 0] };
        } else if (pointId === 'tip') {
            const direction = p.direction !== undefined ? p.direction : BRACE_DEFAULTS.direction;
            const sharpness = p.sharpness !== undefined ? p.sharpness : BRACE_DEFAULTS.sharpness;
            
            const p1Canvas = editor.manimToCanvas(p.point1[0], p.point1[1]);
            const p2Canvas = editor.manimToCanvas(p.point2[0], p.point2[1]);
            const basePath = calculateBracePath(
                p1Canvas,
                p2Canvas,
                direction,
                0, // 无偏移的基础形状
                sharpness,
                editor.pxPerUnit
            );
            
            if (!basePath || basePath.length < 4) {
                return {};
            }
            
            const baseTip = basePath[3];
            const newTipCanvas = editor.manimToCanvas(newX, newY);
            
            const dxCanvas = p2Canvas.x - p1Canvas.x;
            const dyCanvas = p2Canvas.y - p1Canvas.y;
            const lengthCanvas = Math.sqrt(dxCanvas * dxCanvas + dyCanvas * dyCanvas);
            if (lengthCanvas === 0) return {};
            
            const nx = -dyCanvas / lengthCanvas;
            const ny = dxCanvas / lengthCanvas;
            
            const deltaX = newTipCanvas.x - baseTip.x;
            const deltaY = newTipCanvas.y - baseTip.y;
            const normalDirX = nx * direction;
            const normalDirY = ny * direction;
            
            const projection = deltaX * normalDirX + deltaY * normalDirY;
            
            let newDirection = direction;
            let buffPx = projection;
            if (projection < 0) {
                newDirection = -direction;
                buffPx = -projection;
            }
            
            const newBuff = Math.max(0, buffPx / editor.pxPerUnit);
            
            return {
                direction: newDirection,
                buff: newBuff
            };
        }
        
        return {};
    },
    
    toManim: function(element) {
        const p = element.props;
        const varName = sanitizeVariableName(element.name);
        
        const x1 = formatNumber(p.point1[0]);
        const y1 = formatNumber(p.point1[1]);
        const x2 = formatNumber(p.point2[0]);
        const y2 = formatNumber(p.point2[1]);
        
        const color = hexToManimColor(p.color || BRACE_DEFAULTS.color);
        const direction = p.direction !== undefined ? p.direction : BRACE_DEFAULTS.direction;
        let code;
        if (direction === -1) {
            code = `${varName} = BraceBetweenPoints([${x2}, ${y2}, 0], [${x1}, ${y1}, 0])`;
        } else {
            code = `${varName} = BraceBetweenPoints([${x1}, ${y1}, 0], [${x2}, ${y2}, 0])`;
        }
        
        // 设置颜色
        code += `.set_color(${color})`;
        
        // 设置线宽
        if (p.stroke_width && p.stroke_width !== BRACE_DEFAULTS.stroke_width) {
            code += `.set_stroke(width=${formatNumber(p.stroke_width)})`;
        }
        
        // z_order
        const zOrder = p.z_order || 0;
        if (zOrder !== 0) {
            code += `.set_z_index(${zOrder})`;
        }
        
        return code;
    },
    
    onUpgrade: function(props) {
        const upgraded = { ...props };
        if (upgraded.direction === undefined) upgraded.direction = BRACE_DEFAULTS.direction;
        if (upgraded.buff === undefined) upgraded.buff = BRACE_DEFAULTS.buff;
        if (upgraded.sharpness === undefined) upgraded.sharpness = BRACE_DEFAULTS.sharpness;
        if (upgraded.color === undefined) upgraded.color = BRACE_DEFAULTS.color;
        if (upgraded.stroke_width === undefined) upgraded.stroke_width = BRACE_DEFAULTS.stroke_width;
        if (upgraded.z_order === undefined) upgraded.z_order = BRACE_DEFAULTS.z_order;
        return upgraded;
    },
    
    properties: [
        { key: 'point1[0]', label: '点1 X', type: 'number', step: 0.01 },
        { key: 'point1[1]', label: '点1 Y', type: 'number', step: 0.01 },
        { key: 'point2[0]', label: '点2 X', type: 'number', step: 0.01 },
        { key: 'point2[1]', label: '点2 Y', type: 'number', step: 0.01 },
        { 
            key: 'direction', 
            label: '方向', 
            type: 'select',
            options: [
                { value: 1, label: '左侧（逆时针90°）' },
                { value: -1, label: '右侧（顺时针90°）' }
            ]
        },
        { key: 'buff', label: '间距', type: 'number', step: 0.05, min: 0.05 },
        { key: 'sharpness', label: '尖锐度', type: 'number', step: 0.1, min: 0.5, max: 3.0 },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number', step: 0.5, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


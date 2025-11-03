/**
 * FunctionPolar 插件 - 极坐标函数可视化
 * 
 * 特点：
 * - 矩形视窗框架，(0,0) 在中心
 * - 支持用户自定义极坐标函数表达式 r = f(theta)
 * - 支持 x/y 轴独立缩放倍数
 * - 视窗透明无背景，只显示函数曲线
 */

// ═══════════════════════════════════════════
// 默认配置（集中管理）
// ═══════════════════════════════════════════
const POLAR_DEFAULT_SETTINGS = {
    expression: 'sin(3 * theta)',  // 极坐标函数表达式 r = f(theta)
    theta_max: 2 * Math.PI,  // theta 最大值（默认 2π，一圈）
    width: 4,
    height: 4,
    x_scale: 1,
    y_scale: 1,
    color: '#e74c3c',
    stroke_width: 2,
    z_order: 0
};

const POLAR_PREVIEW_STYLES = {
    viewport_color: 'rgba(231, 76, 60, 0.3)',
    viewport_line_width: 1,
    viewport_dash: [5, 5],
    center_dot_color: '#95a5a6',
    center_dot_alpha: 0.7,
    center_dot_radius: 3
};

// 辅助函数：安全计算极坐标函数表达式
function evaluatePolarFunctionSafe(expr, theta) {
    try {
        // 使用 math.js（如果可用）
        if (typeof math !== 'undefined' && math.evaluate) {
            const result = math.evaluate(expr, { theta: theta });
            if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                return result;
            }
        }
        // 回退：尝试简单的 Function 构造（仅支持基础运算）
        const func = new Function('theta', 'Math', `with(Math) { return ${expr}; }`);
        const result = func(theta, Math);
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            return result;
        }
    } catch (e) {
        // 计算失败，返回 0
    }
    return 0;
}

registerShape({
    type: 'functionPolar',
    name: '极坐标函数',
    icon: '◎',
    version: '1.0.0',
    drawMode: 'drag',
    
    createDefault: function(x, y) {
        return {
            type: 'functionPolar',
            name: 'polar_' + (ManimEditor.elements.length + 1),
            props: {
                x: x !== undefined ? x : 0,
                y: y !== undefined ? y : 0,
                width: 0,   // 视窗宽度（Manim单位），从0开始避免闪现
                height: 0,  // 视窗高度（Manim单位），从0开始避免闪现
                expression: POLAR_DEFAULT_SETTINGS.expression,
                theta_max: POLAR_DEFAULT_SETTINGS.theta_max,
                x_scale: POLAR_DEFAULT_SETTINGS.x_scale,
                y_scale: POLAR_DEFAULT_SETTINGS.y_scale,
                color: POLAR_DEFAULT_SETTINGS.color,
                stroke_width: POLAR_DEFAULT_SETTINGS.stroke_width,
                z_order: POLAR_DEFAULT_SETTINGS.z_order,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const centerX = props.x !== undefined ? props.x : 0;
        const centerY = props.y !== undefined ? props.y : 0;
        const width = props.width !== undefined ? props.width : POLAR_DEFAULT_SETTINGS.width;
        const height = props.height !== undefined ? props.height : POLAR_DEFAULT_SETTINGS.height;
        const expression = props.expression !== undefined ? props.expression : POLAR_DEFAULT_SETTINGS.expression;
        const thetaMax = props.theta_max !== undefined ? props.theta_max : POLAR_DEFAULT_SETTINGS.theta_max;
        const xScale = props.x_scale !== undefined ? props.x_scale : POLAR_DEFAULT_SETTINGS.x_scale;
        const yScale = props.y_scale !== undefined ? props.y_scale : POLAR_DEFAULT_SETTINGS.y_scale;
        
        // 动态计算采样点数：根据 theta 范围自动调整
        // 每 2π 至少 400 个点，确保平滑
        const rotations = thetaMax / (2 * Math.PI);
        const samples = Math.min(Math.max(400, Math.floor(rotations * 400)), 2000);
        
        setRenderOpacity(ctx, element);
        
        // 视窗边界（用于调试，可选）
        const center = editor.manimToCanvas(centerX, centerY);
        const w = width * editor.pxPerUnit;
        const h = height * editor.pxPerUnit;
        
        // 绘制视窗边框（透明，仅用于调试选中状态）
        if (ManimEditor.selectedElement?.id === element.id) {
            ctx.strokeStyle = POLAR_PREVIEW_STYLES.viewport_color;
            ctx.lineWidth = POLAR_PREVIEW_STYLES.viewport_line_width;
            ctx.setLineDash(POLAR_PREVIEW_STYLES.viewport_dash);
            ctx.strokeRect(center.x - w / 2, center.y - h / 2, w, h);
            ctx.setLineDash([]);
        }
        
        // 绘制极坐标函数曲线
        ctx.strokeStyle = props.color !== undefined ? props.color : POLAR_DEFAULT_SETTINGS.color;
        ctx.lineWidth = props.stroke_width !== undefined ? props.stroke_width : POLAR_DEFAULT_SETTINGS.stroke_width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        let firstPoint = true;
        
        for (let i = 0; i <= samples; i++) {
            const theta = (i / samples) * thetaMax;  // theta 从 0 到 theta_max
            const r = evaluatePolarFunctionSafe(expression, theta);  // 计算半径
            
            // 极坐标转直角坐标（视窗局部坐标系）
            const xFunc = r * Math.cos(theta);
            const yFunc = r * Math.sin(theta);
            
            // 应用缩放并转换到场景坐标
            const xGlobal = centerX + xFunc / xScale;
            const yGlobal = centerY + yFunc / yScale;
            
            // 裁剪：只绘制在视窗内的点
            if (Math.abs(xFunc / xScale) > width / 2 || Math.abs(yFunc / yScale) > height / 2) {
                if (!firstPoint) {
                    ctx.stroke();
                    ctx.beginPath();
                    firstPoint = true;
                }
                continue;
            }
            
            const canvasPos = editor.manimToCanvas(xGlobal, yGlobal);
            
            if (firstPoint) {
                ctx.moveTo(canvasPos.x, canvasPos.y);
                firstPoint = false;
            } else {
                ctx.lineTo(canvasPos.x, canvasPos.y);
            }
        }
        
        if (!firstPoint) {
            ctx.stroke();
        }
        
        // 绘制中心点标记
        ctx.fillStyle = POLAR_PREVIEW_STYLES.center_dot_color;
        ctx.globalAlpha = POLAR_PREVIEW_STYLES.center_dot_alpha;
        ctx.beginPath();
        ctx.arc(center.x, center.y, POLAR_PREVIEW_STYLES.center_dot_radius, 0, Math.PI * 2);
        ctx.fill();
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        const width = Math.abs(current.manimX - start.manimX);
        const height = Math.abs(current.manimY - start.manimY);
        const centerX = (current.manimX + start.manimX) / 2;
        const centerY = (current.manimY + start.manimY) / 2;
        
        element.props.width = width;
        element.props.height = height;
        element.props.x = centerX;
        element.props.y = centerY;
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const halfWidth = (props.width !== undefined ? props.width : POLAR_DEFAULT_SETTINGS.width) / 2;
        const halfHeight = (props.height !== undefined ? props.height : POLAR_DEFAULT_SETTINGS.height) / 2;
        
        // 基于视窗矩形进行命中检测
        return Math.abs(manimX - props.x) <= halfWidth + 0.3 &&
               Math.abs(manimY - props.y) <= halfHeight + 0.3;
    },
    
    getBounds: function(element, editor) {
        const props = element.props;
        const width = props.width !== undefined ? props.width : POLAR_DEFAULT_SETTINGS.width;
        const height = props.height !== undefined ? props.height : POLAR_DEFAULT_SETTINGS.height;
        
        // 视窗的四个角（Manim坐标）
        const left = props.x - width / 2;
        const right = props.x + width / 2;
        const top = props.y + height / 2;
        const bottom = props.y - height / 2;
        
        // 转换到Canvas坐标
        const topLeftCanvas = editor.manimToCanvas(left, top);
        const bottomRightCanvas = editor.manimToCanvas(right, bottom);
        
        return {
            x: topLeftCanvas.x,
            y: topLeftCanvas.y,
            w: bottomRightCanvas.x - topLeftCanvas.x,
            h: bottomRightCanvas.y - topLeftCanvas.y
        };
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        
        // 缩放视窗（类似 rectangle）
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        // 等比例
        if (isShift) {
            const origW = originalProps.width !== undefined ? originalProps.width : POLAR_DEFAULT_SETTINGS.width;
            const origH = originalProps.height !== undefined ? originalProps.height : POLAR_DEFAULT_SETTINGS.height;
            const originalRatio = origW / origH;
            const scaleW = newWidth / origW;
            const scaleH = newHeight / origH;
            const scale = Math.max(scaleW, scaleH);
            
            newWidth = origW * scale;
            newHeight = origH * scale;
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
        
        return {
            x: newCenterX,
            y: newCenterY,
            width: Math.max(0.1, newWidth),
            height: Math.max(0.1, newHeight)
        };
    },
    
    getMoveAnchor: function(element) {
        return { x: element.props.x, y: element.props.y };
    },
    
    handleMove: function(element, moveInfo, editor) {
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const color = hexToManimColor(props.color !== undefined ? props.color : POLAR_DEFAULT_SETTINGS.color);
        const expression = props.expression !== undefined ? props.expression : POLAR_DEFAULT_SETTINGS.expression;
        const thetaMax = props.theta_max !== undefined ? props.theta_max : POLAR_DEFAULT_SETTINGS.theta_max;
        const xScale = props.x_scale !== undefined ? props.x_scale : POLAR_DEFAULT_SETTINGS.x_scale;
        const yScale = props.y_scale !== undefined ? props.y_scale : POLAR_DEFAULT_SETTINGS.y_scale;
        
        // 转换表达式为 Python lambda（简单替换）
        let pythonExpr = expression
            .replace(/\^/g, '**')  // 幂运算
            .replace(/Math\./g, '')  // 移除 Math. 前缀
            .replace(/\bpi\b/g, 'PI')  // pi 常量 → PI (Manim)
            .replace(/exp/g, 'np.exp')
            .replace(/sin/g, 'np.sin')
            .replace(/cos/g, 'np.cos')
            .replace(/tan/g, 'np.tan')
            .replace(/sqrt/g, 'np.sqrt')
            .replace(/log/g, 'np.log')
            .replace(/abs/g, 'np.abs');
        
        // Manim 的 ParametricFunction 用于极坐标
        // lambda t: [r*cos(t), r*sin(t), 0] 其中 r = f(t)
        let code = `${varName} = ParametricFunction(`;
        code += `lambda t: [(${pythonExpr}) * np.cos(t) / ${formatNumber(xScale)}, `;
        code += `(${pythonExpr}) * np.sin(t) / ${formatNumber(yScale)}, 0], `;
        code += `t_range=[0, ${formatNumber(thetaMax)}], `;
        code += `color=${color}`;
        
        const strokeWidth = props.stroke_width !== undefined ? props.stroke_width : POLAR_DEFAULT_SETTINGS.stroke_width;
        if (strokeWidth !== POLAR_DEFAULT_SETTINGS.stroke_width) {
            code += `, stroke_width=${formatNumber(strokeWidth)}`;
        }
        
        code += ')';
        
        // 移动到视窗中心（场景坐标）
        if (props.x !== 0 || props.y !== 0) {
            code += `.shift([${formatNumber(props.x)}, ${formatNumber(props.y)}, 0])`;
        }
        
        // 设置 z-index
        const zOrder = props.z_order !== undefined ? props.z_order : 0;
        if (zOrder !== 0) {
            code += `.set_z_index(${zOrder})`;
        }
        
        return code;
    },
    
    properties: [
        { key: 'expression', label: '极坐标函数 r=f(θ)', type: 'text' },
        { key: 'theta_max', label: 'θ最大值', type: 'number', step: 0.1, min: 0.1 },
        { key: 'x', label: 'X坐标', type: 'number', step: 0.1 },
        { key: 'y', label: 'Y坐标', type: 'number', step: 0.1 },
        { key: 'width', label: '视窗宽度', type: 'number', step: 0.1, min: 0.1 },
        { key: 'height', label: '视窗高度', type: 'number', step: 0.1, min: 0.1 },
        { key: 'x_scale', label: 'X轴缩放', type: 'number', step: 0.1, min: 0.1 },
        { key: 'y_scale', label: 'Y轴缩放', type: 'number', step: 0.1, min: 0.1 },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number', step: 0.1, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


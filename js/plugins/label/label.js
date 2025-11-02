/**
 * Label 插件
 * - 单点放置文本，支持文本内容、字体大小、颜色、背景色/不透明度/内边距
 * - 其他能力尽量与 Manim Text/SurroundingRectangle 对齐
 */

const LABEL_DEFAULTS = {
    text: 'Label',
    font_size: 24,
    color: '#2c3e50',
    bg_color: '#ffffaa',
    bg_opacity: 0, // 默认无背景
    bg_padding: 8, // 画布像素内边距
    z_order: 0
};

function getCanvasCtx(editor) {
    const canvas = editor.canvas;
    return canvas.getContext('2d');
}

function measureTextPixels(editor, text, fontSizePx) {
    const ctx = getCanvasCtx(editor);
    const size = fontSizePx !== undefined ? fontSizePx : LABEL_DEFAULTS.font_size;
    ctx.font = `${size}px sans-serif`;
    const m = ctx.measureText(text || '');
    const width = m.width;
    // 优先使用真实的上/下边界（ascent/descent），否则按比例估算
    const ascent = (m.actualBoundingBoxAscent !== undefined) ? m.actualBoundingBoxAscent : size * 0.8;
    const descent = (m.actualBoundingBoxDescent !== undefined) ? m.actualBoundingBoxDescent : size * 0.2;
    const height = ascent + descent;
    return { width, height, ascent, descent };
}

registerShape({
    type: 'label',
    name: '文本',
    icon: '⌘',
    version: '1.0.0',
    drawMode: 'multiClick', // 单次点击放置

    createDefault: function(x, y) {
        return {
            type: 'label',
            name: 'label_' + (ManimEditor.elements.length + 1),
            props: {
                x: x !== undefined ? x : 0,
                y: y !== undefined ? y : 0,
                text: LABEL_DEFAULTS.text,
                font_size: LABEL_DEFAULTS.font_size,
                color: LABEL_DEFAULTS.color,
                bg_color: LABEL_DEFAULTS.bg_color,
                bg_opacity: LABEL_DEFAULTS.bg_opacity,
                bg_padding: LABEL_DEFAULTS.bg_padding,
                z_order: LABEL_DEFAULTS.z_order,
                hidden: false
            }
        };
    },

    render: function(ctx, element, editor) {
        const p = element.props;
        setRenderOpacity(ctx, element);

        const fontSize = p.font_size !== undefined ? p.font_size : LABEL_DEFAULTS.font_size;
        const color = p.color || LABEL_DEFAULTS.color;
        const text = p.text !== undefined ? p.text : LABEL_DEFAULTS.text;
        const padding = p.bg_padding !== undefined ? p.bg_padding : LABEL_DEFAULTS.bg_padding;
        const bgColor = p.bg_color || LABEL_DEFAULTS.bg_color;
        const bgOpacity = p.bg_opacity !== undefined ? p.bg_opacity : LABEL_DEFAULTS.bg_opacity;

        const canvasPos = editor.manimToCanvas(p.x !== undefined ? p.x : 0, p.y !== undefined ? p.y : 0);
        ctx.font = `${fontSize}px sans-serif`;
        const measured = measureTextPixels(editor, text, fontSize);
        const textW = measured.width;
        const ascent = measured.ascent;
        const descent = measured.descent;

        // 背景矩形（以文本左上角为 (x, y-textH)）
        if (bgOpacity > 0) {
            const saved = ctx.globalAlpha;
            ctx.globalAlpha = saved * bgOpacity;
            ctx.fillStyle = bgColor;
            ctx.fillRect(
                canvasPos.x - padding,
                canvasPos.y - ascent - padding,
                textW + padding * 2,
                (ascent + descent) + padding * 2
            );
            ctx.globalAlpha = saved;
        }

        // 绘制文本（Canvas坐标：x 向右，y 向下）
        ctx.fillStyle = color;
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillText(text, canvasPos.x, canvasPos.y);

        // 选中时绘制控制点（蓝色）
        if (element.id === editor.selectedElement?.id) {
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.arc(canvasPos.x, canvasPos.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    onDrawClick: function(state, point, editor) {
        if (!state) {
            // 第一次点击直接完成
            const element = {
                type: 'label',
                name: 'label_' + (editor.elements.length + 1),
                props: {
                    x: point[0],
                    y: point[1],
                    text: LABEL_DEFAULTS.text,
                    font_size: LABEL_DEFAULTS.font_size,
                    color: LABEL_DEFAULTS.color,
                    bg_color: LABEL_DEFAULTS.bg_color,
                    bg_opacity: LABEL_DEFAULTS.bg_opacity,
                    bg_padding: LABEL_DEFAULTS.bg_padding,
                    z_order: LABEL_DEFAULTS.z_order,
                    hidden: false
                }
            };
            return { continue: false, element };
        }
        return { continue: false };
    },

    onDrawDoubleClick: function(state, editor) {
        return null;
    },

    renderDrawingPreview: function(ctx, state, editor) {
        if (!editor.previewPoint) return;
        const p = editor.previewPoint;
        const c = editor.manimToCanvas(p[0], p[1]);
        ctx.fillStyle = '#3498db';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px sans-serif';
        ctx.fillText('点击放置文本', 20, editor.canvas.height - 20);
    },

    hitTest: function(element, manimX, manimY, editor) {
        const p = element.props;
        const text = p.text !== undefined ? p.text : LABEL_DEFAULTS.text;
        const fontSize = p.font_size !== undefined ? p.font_size : LABEL_DEFAULTS.font_size;
        const padding = p.bg_padding !== undefined ? p.bg_padding : LABEL_DEFAULTS.bg_padding;
        const measured = measureTextPixels(editor, text, fontSize);
        const x = p.x !== undefined ? p.x : 0;
        const y = p.y !== undefined ? p.y : 0;
        const ptCanvas = editor.manimToCanvas(manimX, manimY);
        const originCanvas = editor.manimToCanvas(x, y);
        const left = originCanvas.x - padding;
        const right = originCanvas.x + measured.width + padding;
        // 顶部在基线之上 ascent，底部在基线之下 descent
        const top = originCanvas.y - measured.ascent - padding;
        const bottom = originCanvas.y + measured.descent + padding;
        return ptCanvas.x >= left && ptCanvas.x <= right && ptCanvas.y >= top && ptCanvas.y <= bottom;
    },

    getBounds: function(element, editor) {
        const p = element.props;
        const text = p.text !== undefined ? p.text : LABEL_DEFAULTS.text;
        const fontSize = p.font_size !== undefined ? p.font_size : LABEL_DEFAULTS.font_size;
        const padding = p.bg_padding !== undefined ? p.bg_padding : LABEL_DEFAULTS.bg_padding;
        const measured = measureTextPixels(editor, text, fontSize);
        const canvasPos = editor.manimToCanvas(p.x !== undefined ? p.x : 0, p.y !== undefined ? p.y : 0);
        const x = canvasPos.x - padding;
        const y = canvasPos.y - measured.ascent - padding;
        const w = measured.width + padding * 2;
        const h = (measured.ascent + measured.descent) + padding * 2;
        return { x, y, w, h };
    },

    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint } = scaleInfo;
        // 按较大尺寸变化等比缩放字体，同时保持中心随bbox移动
        const p = element.props;
        const bounds = this.getBounds(element, editor);
        const oldSize = Math.max(bounds.w, bounds.h);
        const newW = Math.abs(currentPoint.x - fixedPoint.x);
        const newH = Math.abs(currentPoint.y - fixedPoint.y);
        const newSize = Math.max(newW * 50, newH * 50); // 转像素估算
        const scale = Math.max(0.1, newSize / Math.max(1e-6, oldSize));
        const newFont = Math.max(6, (p.font_size !== undefined ? p.font_size : LABEL_DEFAULTS.font_size) * scale);

        // 计算新中心（同其他插件）
        let newCornerX, newCornerY;
        if (corner === 'topLeft') { newCornerX = fixedPoint.x - newW; newCornerY = fixedPoint.y + newH; }
        else if (corner === 'topRight') { newCornerX = fixedPoint.x + newW; newCornerY = fixedPoint.y + newH; }
        else if (corner === 'bottomRight') { newCornerX = fixedPoint.x + newW; newCornerY = fixedPoint.y - newH; }
        else { newCornerX = fixedPoint.x - newW; newCornerY = fixedPoint.y - newH; }
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        const center = { x: p.x !== undefined ? p.x : 0, y: p.y !== undefined ? p.y : 0 };
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        return { font_size: newFont, x: center.x + dx, y: center.y + dy };
    },

    getMoveAnchor: function(element) {
        return { x: element.props.x !== undefined ? element.props.x : 0, y: element.props.y !== undefined ? element.props.y : 0 };
    },

    handleMove: function(element, moveInfo, editor) {
        const anchor = this.getMoveAnchor(element);
        const dx = moveInfo.currentPoint.x - moveInfo.offset.x - anchor.x;
        const dy = moveInfo.currentPoint.y - moveInfo.offset.y - anchor.y;
        return { x: element.props.x + dx, y: element.props.y + dy };
    },

    getControlPoints: function(element, editor) {
        return [ { id: 'pos', x: element.props.x, y: element.props.y } ];
    },

    updateControlPoint: function(element, pointId, newX, newY, editor) {
        if (pointId === 'pos') return { x: newX, y: newY };
        return {};
    },

    toManim: function(element) {
        const p = element.props;
        const varName = sanitizeVariableName(element.name);
        const text = (p.text !== undefined ? p.text : LABEL_DEFAULTS.text).replace(/"/g, '\\"');
        const fontSize = p.font_size !== undefined ? p.font_size : LABEL_DEFAULTS.font_size;
        const color = hexToManimColor(p.color || LABEL_DEFAULTS.color);
        const bgColor = hexToManimColor(p.bg_color || LABEL_DEFAULTS.bg_color);
        const bgOpacity = p.bg_opacity !== undefined ? p.bg_opacity : LABEL_DEFAULTS.bg_opacity;
        const padding = p.bg_padding !== undefined ? p.bg_padding : LABEL_DEFAULTS.bg_padding;

        let code = `${varName}_core = Text("${text}", font_size=${formatNumber(fontSize)})`;
        code += `.set_color(${color})`;
        code += `.move_to([${formatNumber(p.x)}, ${formatNumber(p.y)}, 0])`;
        const z = p.z_order !== undefined ? p.z_order : LABEL_DEFAULTS.z_order;

        if (bgOpacity > 0) {
            code += `\n${varName}_bg = SurroundingRectangle(${varName}_core, color=${bgColor}, fill_color=${bgColor}, fill_opacity=${formatNumber(bgOpacity)}, buff=${formatNumber(padding/50)})`;
            if (z !== 0) code += `.set_z_index(${z - 1})`;
            // 分组：主对象=VGroup，导出时 self.add(varName) 即可将文本与背景一起加入
            code += `\n${varName} = VGroup(${varName}_core, ${varName}_bg)`;
            if (z !== 0) code += `.set_z_index(${z})`;
        } else {
            // 无背景时，直接将 core 作为主对象
            code += `\n${varName} = ${varName}_core`;
            if (z !== 0) code += `.set_z_index(${z})`;
        }
        return code;
    },

    onUpgrade: function(props) {
        const up = { ...props };
        if (up.text === undefined) up.text = LABEL_DEFAULTS.text;
        if (up.font_size === undefined) up.font_size = LABEL_DEFAULTS.font_size;
        if (up.color === undefined) up.color = LABEL_DEFAULTS.color;
        if (up.bg_color === undefined) up.bg_color = LABEL_DEFAULTS.bg_color;
        if (up.bg_opacity === undefined) up.bg_opacity = LABEL_DEFAULTS.bg_opacity;
        if (up.bg_padding === undefined) up.bg_padding = LABEL_DEFAULTS.bg_padding;
        if (up.z_order === undefined) up.z_order = LABEL_DEFAULTS.z_order;
        return up;
    },

    properties: [
        { key: 'text', label: '文本', type: 'text' },
        { key: 'font_size', label: '字号(px)', type: 'number', step: 1, min: 6 },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'bg_color', label: '背景色', type: 'color' },
        { key: 'bg_opacity', label: '背景不透明度', type: 'number', step: 0.1, min: 0, max: 1 },
        { key: 'bg_padding', label: '背景内边距(px)', type: 'number', step: 1, min: 0 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});



/**
 * Sine 插件 - 正弦函数
 * 
 * 数学特征：y = A·sin(ω·x + φ) + k
 * 参数：振幅A，频率ω，相位φ，偏移k
 */

registerShape({
    type: 'sine',
    name: '正弦函数',
    icon: '～',
    version: '1.0.0',
    drawMode: 'drag',
    
    createDefault: function(x, y) {
        return {
            type: 'sine',
            name: 'sine_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,           // 中心X
                y: y || 0,           // 中心Y（垂直偏移）
                amplitude: 1,        // 振幅
                frequency: 3,        // 频率
                phase: 0,            // 相位
                x_start: -Math.PI,   // X范围起点
                x_end: Math.PI,      // X范围终点
                samples: 100,        // 采样点数
                color: '#e74c3c',
                z_order: 0,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const amplitude = props.amplitude !== undefined ? props.amplitude : 1;
        const frequency = props.frequency !== undefined ? props.frequency : 1;
        const phase = props.phase !== undefined ? props.phase : 0;
        const xStart = props.x_start !== undefined ? props.x_start : -Math.PI;
        const xEnd = props.x_end !== undefined ? props.x_end : Math.PI;
        
        // 关键优化：增加采样点数，使曲线更平滑
        // 每像素至少2个采样点
        const xRangeManim = Math.abs(xEnd - xStart);
        const xRangePixels = xRangeManim * editor.pxPerUnit;
        const optimalSamples = Math.max(200, Math.floor(xRangePixels * 2));
        const samples = Math.min(optimalSamples, 500);  // 最多500个点
        
        ctx.strokeStyle = props.color || '#e74c3c';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';  // 平滑连接
        ctx.lineCap = 'round';   // 平滑端点
        
        // 采样并绘制
        ctx.beginPath();
        let firstPoint = true;
        
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const localX = xStart + (xEnd - xStart) * t;
            const localY = amplitude * Math.sin(frequency * localX + phase);
            
            // 转换到全局坐标
            const globalX = props.x + localX;
            const globalY = props.y + localY;
            
            const canvasPos = editor.manimToCanvas(globalX, globalY);
            
            if (firstPoint) {
                ctx.moveTo(canvasPos.x, canvasPos.y);
                firstPoint = false;
            } else {
                ctx.lineTo(canvasPos.x, canvasPos.y);
            }
        }
        
        ctx.stroke();
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        const width = Math.abs(current.manimX - start.manimX);
        const centerX = (current.manimX + start.manimX) / 2;
        const centerY = (current.manimY + start.manimY) / 2;
        
        element.props.x = centerX;
        element.props.y = centerY;
        element.props.x_start = -width / 2;
        element.props.x_end = width / 2;
        element.props.amplitude = Math.abs(current.manimY - start.manimY) / 2 || 1;
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const xStart = props.x_start !== undefined ? props.x_start : -Math.PI;
        const xEnd = props.x_end !== undefined ? props.x_end : Math.PI;
        const amplitude = props.amplitude !== undefined ? props.amplitude : 1;
        
        // 简化：检查是否在X范围内和Y范围内
        const localX = manimX - (props.x || 0);
        const localY = manimY - (props.y || 0);
        
        if (localX < xStart - 0.5 || localX > xEnd + 0.5) return false;
        if (Math.abs(localY) > amplitude + 0.5) return false;
        
        return true;
    },
    
    getBounds: function(element, editor) {
        const props = element.props;
        const amplitude = props.amplitude !== undefined ? props.amplitude : 1;
        const frequency = props.frequency !== undefined ? props.frequency : 1;
        const phase = props.phase !== undefined ? props.phase : 0;
        const xStart = props.x_start !== undefined ? props.x_start : -Math.PI;
        const xEnd = props.x_end !== undefined ? props.x_end : Math.PI;
        const samples = props.samples || 100;
        
        // 关键修复：实际采样计算Y的范围，不要假设
        let minY = Infinity;
        let maxY = -Infinity;
        
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const localX = xStart + (xEnd - xStart) * t;
            const localY = amplitude * Math.sin(frequency * localX + phase);
            const globalY = props.y + localY;
            
            minY = Math.min(minY, globalY);
            maxY = Math.max(maxY, globalY);
        }
        
        // 计算全局坐标的边界框
        const topLeft = editor.manimToCanvas(props.x + xStart, maxY);
        const bottomRight = editor.manimToCanvas(props.x + xEnd, minY);
        
        return {
            x: topLeft.x,
            y: topLeft.y,
            w: bottomRight.x - topLeft.x,
            h: bottomRight.y - topLeft.y
        };
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        
        // Sine的缩放：改变X范围和振幅
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        // 计算新的X范围和振幅
        const originalXRange = (originalProps.x_end || Math.PI) - (originalProps.x_start || -Math.PI);
        const originalYRange = (originalProps.amplitude || 1) * 2;
        
        const newXRange = newWidth;
        const newAmplitude = newHeight / 2;
        
        // 新角位置
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
        
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        
        return {
            x: newCenterX,
            y: newCenterY,
            x_start: -newXRange / 2,
            x_end: newXRange / 2,
            amplitude: Math.max(0.1, newAmplitude)
        };
    },
    
    getMoveAnchor: function(element) {
        // sine：使用中心点作为锚点
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
        const color = hexToManimColor(props.color || '#e74c3c');
        const amplitude = formatNumber(props.amplitude !== undefined ? props.amplitude : 1);
        const frequency = formatNumber(props.frequency !== undefined ? props.frequency : 1);
        const xStart = formatNumber(props.x_start !== undefined ? props.x_start : -Math.PI);
        const xEnd = formatNumber(props.x_end !== undefined ? props.x_end : Math.PI);
        
        // 使用FunctionGraph
        let code = `${varName} = FunctionGraph(`;
        code += `lambda x: ${amplitude} * np.sin(${frequency} * x), `;
        code += `x_range=[${xStart}, ${xEnd}], `;
        code += `color=${color})`;
        
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
        { key: 'x', label: 'X坐标', type: 'number', step: 0.1 },
        { key: 'y', label: 'Y坐标', type: 'number', step: 0.1 },
        { key: 'amplitude', label: '振幅', type: 'number', step: 0.1, min: 0.1 },
        { key: 'frequency', label: '频率', type: 'number', step: 0.1 },
        { key: 'phase', label: '相位', type: 'number', step: 0.1 },
        { key: 'x_start', label: 'X起点', type: 'number', step: 0.1 },
        { key: 'x_end', label: 'X终点', type: 'number', step: 0.1 },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
    ]
});


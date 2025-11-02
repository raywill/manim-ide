/**
 * Manim Visual Editor - 导出模块
 * 负责生成Manim Python代码
 */

/**
 * 生成Manim代码
 */
function generateManimCode() {
    const elements = ManimEditor.elements.filter(e => !e.props.hidden);
    
    if (elements.length === 0) {
        return `from manim import *

class GeneratedScene(Scene):
    def construct(self):
        # 场景为空，请添加一些形状
        pass
`;
    }
    
    let code = `from manim import *

class GeneratedScene(Scene):
    def construct(self):
`;

    // 如果UI场景边界有缩放，使Manim相机视口与IDE一致
    const sceneScale = ManimEditor.sceneDisplayScale || 1.0;
    if (sceneScale !== 1.0) {
        const frameWidth = 14.22 * sceneScale;
        const frameHeight = 8 * sceneScale;
        code += `        # 调整相机视口以匹配IDE场景边界（兼容无 frame 的相机）\n`;
        code += `        try:\n`;
        code += `            self.camera.frame.set(width=${formatNumber(frameWidth)}, height=${formatNumber(frameHeight)})\n`;
        code += `        except Exception:\n`;
        code += `            self.camera.frame_width = ${formatNumber(frameWidth)}\n`;
        code += `            self.camera.frame_height = ${formatNumber(frameHeight)}\n`;
    }
    // 统一设置背景为白色（兼容不同Manim版本）
    code += `        # 统一设置场景背景为白色\n`;
    code += `        try:\n`;
    code += `            self.camera.set_background_color(WHITE)\n`;
    code += `        except Exception:\n`;
    code += `            self.camera.background_color = WHITE\n`;
    
    // 为每个元素生成代码
    elements.forEach(element => {
        const plugin = ManimEditor.shapeRegistry[element.type];
        if (plugin && plugin.toManim) {
            const manimCode = plugin.toManim(element) || '';
            // 缩进多行：确保每一行都有与 construct 体一致的缩进
            const indented = manimCode.split('\n').map(line => `        ${line}`).join('\n');
            code += indented + '\n';
        }
    });
    
    // 添加所有元素到场景
    code += `\n        # 添加所有元素到场景\n`;
    code += `        self.add(\n`;
    elements.forEach((element, index) => {
        const varName = sanitizeVariableName(element.name);
        code += `            ${varName}`;
        if (index < elements.length - 1) {
            code += ',';
        }
        code += '\n';
    });
    code += `        )\n`;
    
    return code;
}

/**
 * 清理变量名（移除非法字符）
 */
function sanitizeVariableName(name) {
    // 替换非字母数字字符为下划线
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // 确保不以数字开头
    if (/^\d/.test(sanitized)) {
        sanitized = 'obj_' + sanitized;
    }
    
    // 确保不是Python关键字
    const pythonKeywords = [
        'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del',
        'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
        'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or',
        'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield'
    ];
    
    if (pythonKeywords.includes(sanitized)) {
        sanitized = sanitized + '_obj';
    }
    
    return sanitized;
}

/**
 * 将颜色hex转换为Manim颜色
 */
function hexToManimColor(hex) {
    // Manim常用颜色映射
    const colorMap = {
        '#3498db': 'BLUE',
        '#e74c3c': 'RED',
        '#2ecc71': 'GREEN',
        '#f39c12': 'ORANGE',
        '#9b59b6': 'PURPLE',
        '#1abc9c': 'TEAL',
        '#34495e': 'DARK_GRAY',
        '#ecf0f1': 'LIGHT_GRAY',
        '#ffffff': 'WHITE',
        '#000000': 'BLACK',
        '#f1c40f': 'YELLOW',
        '#e91e63': 'PINK',
        '#8e44ad': 'PURPLE',
        '#16a085': 'TEAL_D',
        '#27ae60': 'GREEN_D',
        '#2980b9': 'BLUE_D',
        '#c0392b': 'RED_D'
    };
    
    const normalized = hex.toLowerCase();
    
    if (colorMap[normalized]) {
        return colorMap[normalized];
    }
    
    // 返回hex颜色字符串
    return `"${hex}"`;
}

/**
 * 格式化数字（移除不必要的小数位）
 */
function formatNumber(num, precision = 2) {
    // 处理 null, undefined, NaN
    if (num == null || isNaN(num)) {
        return '0';
    }
    if (Number.isInteger(num)) {
        return num.toString();
    }
    return num.toFixed(precision).replace(/\.?0+$/, '');
}

/**
 * 导出为HTML预览
 */
function exportToHTML() {
    const elements = ManimEditor.elements;
    
    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Manim Scene Preview</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            font-family: Arial, sans-serif;
        }
        .preview {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            margin-top: 0;
        }
        canvas {
            border: 1px solid #ddd;
            display: block;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="preview">
        <h1>Manim Scene Preview</h1>
        <canvas id="preview" width="800" height="600"></canvas>
        <h2>Elements</h2>
        <ul>
`;
    
    elements.forEach(element => {
        html += `            <li>${element.name} (${element.type})</li>\n`;
    });
    
    html += `        </ul>
    </div>
</body>
</html>`;
    
    return html;
}


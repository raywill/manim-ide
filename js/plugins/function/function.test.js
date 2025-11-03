/**
 * Function 插件测试
 */

// Mock全局
global.ManimEditor = {
    elements: [],
    canvas: { width: 800, height: 800 },
    coordSystem: {
        props: { x_range: [-7, 7, 1], y_range: [-7, 7, 1] }
    },
    pxPerUnit: 50,
    manimToCanvas: function(manimX, manimY) {
        const xRange = this.coordSystem.props.x_range;
        const yRange = this.coordSystem.props.y_range;
        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];
        return {
            x: ((manimX - xRange[0]) / xSpan) * this.canvas.width,
            y: this.canvas.height - ((manimY - yRange[0]) / ySpan) * this.canvas.height
        };
    },
    canvasToManim: function(canvasX, canvasY) {
        const xRange = this.coordSystem.props.x_range;
        const yRange = this.coordSystem.props.y_range;
        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];
        return {
            x: (canvasX / this.canvas.width) * xSpan + xRange[0],
            y: (1 - canvasY / this.canvas.height) * ySpan + yRange[0]
        };
    },
    shapeRegistry: {}
};

global.sanitizeVariableName = (name) => name.replace(/[^a-zA-Z0-9_]/g, '_');
global.formatNumber = (num) => Number(num).toFixed(2);
global.hexToManimColor = (hex) => {
    const colorMap = {
        '#e74c3c': 'RED',
        '#3498db': 'BLUE',
        '#2ecc71': 'GREEN',
        '#2c3e50': 'DARK_GRAY',
        '#000000': 'BLACK',
        '#000': 'BLACK'
    };
    const key = (hex || '').toLowerCase();
    return colorMap[key] || 'WHITE';
};
global.setRenderOpacity = () => {};
global.registerShape = (plugin) => {
    ManimEditor.shapeRegistry[plugin.type] = plugin;
};

// Mock math.js（简化版）
global.math = {
    evaluate: function(expr, scope) {
        const x = scope.x;
        // 简单模拟常见函数
        if (expr.includes('sin') && expr.includes('exp')) {
            return Math.sin(x) * Math.exp(-x/2);
        }
        if (expr === 'x^2') {
            return x * x;
        }
        return 0;
    }
};

// 加载插件
require('./function.js');

const plugin = ManimEditor.shapeRegistry['function'];
let passed = 0;
let failed = 0;

function ok(cond, msg) {
    if (cond) { console.log(`✅ ${msg}`); passed++; }
    else { console.log(`❌ ${msg}`); failed++; }
}

console.log('🧪 Function 自定义函数插件测试\n');

// 测试1: 注册
ok(!!plugin, '插件已注册');

// 测试2: createDefault
const el = plugin.createDefault(0, 0);
ok(el.type === 'function', 'createDefault 返回 function');
ok(el.props.expression === '(4/pi) * (sin(x) + (1/3)*sin(3*x) + (1/5)*sin(5*x) + (1/7)*sin(7*x))', '默认表达式正确');
ok(el.props.width === 0, '初始宽度为0');
ok(el.props.height === 0, '初始高度为0');
ok(el.props.x_scale === 1, '默认 x_scale 为 1');
ok(el.props.y_scale === 1, '默认 y_scale 为 1');

// 测试3: render 基本调用
try {
    const ctx = {
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        strokeRect: () => {},
        setLineDash: () => {},
        arc: () => {},
        fill: () => {},
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
        lineJoin: '',
        lineCap: '',
        globalAlpha: 1
    };
    plugin.render(ctx, {
        id: 't1',
        type: 'function',
        props: {
            x: 0,
            y: 0,
            width: 4,
            height: 4,
            expression: 'sin(x) * exp(-x/2)',
            x_scale: 1,
            y_scale: 1,
            color: '#3498db',
            stroke_width: 2,
            samples: 100,
            z_order: 0,
            hidden: false
        }
    }, ManimEditor);
    ok(true, 'render 无异常');
} catch (e) {
    ok(false, 'render 抛出异常: ' + e.message);
}

// 测试4: hitTest
const el2 = {
    type: 'function',
    props: {
        x: 0,
        y: 0,
        width: 4,
        height: 4,
        expression: 'x^2',
        x_scale: 1,
        y_scale: 1
    }
};
ok(plugin.hitTest(el2, 0, 0, ManimEditor) === true, 'hitTest 命中中心点');
ok(plugin.hitTest(el2, 1.5, 1.5, ManimEditor) === true, 'hitTest 命中视窗内');
ok(plugin.hitTest(el2, 3, 3, ManimEditor) === false, 'hitTest 不命中视窗外');

// 测试5: getBounds
const bounds = plugin.getBounds(el2, ManimEditor);
ok(bounds.w > 0 && bounds.h > 0, 'getBounds 返回有效边界');

// 测试6: handleScale
const scaled = plugin.handleScale(el2, {
    corner: 'bottomRight',
    fixedPoint: { x: -2, y: 2 },
    currentPoint: { x: 4, y: -2 },
    isShift: false,
    originalProps: el2.props
}, ManimEditor);
ok(scaled.width > 0, 'handleScale 返回新宽度');
ok(scaled.height > 0, 'handleScale 返回新高度');

// 测试7: handleMove
const moved = plugin.handleMove(el2, {
    currentPoint: { x: 1, y: 1 },
    offset: { x: 0.5, y: 0.5 }
}, ManimEditor);
ok(moved.x === 0.5 && moved.y === 0.5, 'handleMove 返回新位置');

// 测试8: toManim
const code = plugin.toManim({
    name: 'function_1',
    type: 'function',
    props: {
        x: 0,
        y: 0,
        width: 4,
        height: 4,
        expression: 'sin(x) * exp(-x/2)',
        x_scale: 1,
        y_scale: 2,
        color: '#3498db',
        stroke_width: 2,
        z_order: 0
    }
});
ok(code.includes('FunctionGraph'), 'toManim 包含 FunctionGraph');
ok(code.includes('lambda'), 'toManim 包含 lambda');
ok(code.includes('np.sin') && code.includes('np.exp'), 'toManim 转换函数名');
ok(code.includes('/ 2'), 'toManim 应用 y_scale');

// 测试9: properties
ok(plugin.properties.length >= 10, 'properties 包含所有属性');
const exprProp = plugin.properties.find(p => p.key === 'expression');
ok(exprProp && exprProp.type === 'text', 'expression 属性类型为 text');

console.log('\n==================================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
if (failed > 0) process.exit(1);
process.exit(0);


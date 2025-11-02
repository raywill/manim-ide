/**
 * Angle 插件测试（与现有测试框架一致的自包含样式）
 */

// Mock全局
global.ManimEditor = {
    elements: [],
    canvas: { width: 800, height: 800 },
    coordSystem: {
        props: { x_range: [-7, 7, 1], y_range: [-7, 7, 1] }
    },
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

// 加载插件
require('./angle.js');

const plugin = ManimEditor.shapeRegistry['angle'];
let passed = 0;
let failed = 0;

function ok(cond, msg) {
    if (cond) { console.log(`✅ ${msg}`); passed++; }
    else { console.log(`❌ ${msg}`); failed++; }
}

console.log('🧪 Angle 夹角插件测试');

// 测试1: 注册
ok(!!plugin, '插件已注册');

// 测试2: createDefault
const el = plugin.createDefault(0, 0);
ok(el.type === 'angle', 'createDefault 返回 angle');
ok(!!el.props.pointA && !!el.props.pointB && !!el.props.pointC, '包含A/B/C');
ok(el.props.z_order !== undefined, '包含z_order');

// 测试3: render 基本调用
try {
    // 最小渲染上下文Mock
    const ctx = {
        beginPath: () => {},
        arc: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        fillText: () => {},
        setLineDash: () => {},
        font: '',
        textAlign: '',
        textBaseline: '',
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
        lineCap: '',
        globalAlpha: 1
    };
    plugin.render(ctx, {
        id: 't1',
        type: 'angle',
        props: {
            pointA: [-1, 0, 0],
            pointB: [0, 0, 0],
            pointC: [0, 1, 0],
            stroke_color: '#000',
            stroke_width: 2,
            label_color: '#000',
            radius_ratio: 0.3,
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
    type: 'angle',
    props: {
        pointA: [1, 0, 0],
        pointB: [0, 0, 0],
        pointC: [0, 1, 0],
        radius_ratio: 0.4,
        stroke_width: 2
    }
};
const r = 0.4;
const hx = Math.cos(Math.PI/4) * r;
const hy = Math.sin(Math.PI/4) * r;
ok(plugin.hitTest(el2, hx, hy, ManimEditor) === true, 'hitTest 命中小弧');

// 测试4.1: hitTest 命中边（B->A）
ok(plugin.hitTest(el2, 0.5, 0.0, ManimEditor) === true, 'hitTest 命中边 B->A');

// 测试5: toManim
const code = plugin.toManim({
    name: 'angle_1',
    type: 'angle',
    props: {
        pointA: [1, 0, 0],
        pointB: [0, 0, 0],
        pointC: [0, 1, 0],
        radius_ratio: 0.3,
        stroke_color: '#222',
        stroke_width: 2,
        label_color: '#222',
        z_order: 0
    }
});
ok(/Arc\(/.test(code), 'toManim 包含 Arc');
ok(code.includes('MathTex(') && code.includes('theta'), 'toManim 包含 θ 标签');

console.log('\n==================================================');
console.log(`测试完成: ${passed} 通过, ${failed} 失败`);
if (failed > 0) process.exit(1);
process.exit(0);



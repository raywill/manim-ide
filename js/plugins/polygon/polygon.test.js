/**
 * Polygon 插件测试
 */

// Mock环境
global.ManimEditor = {
    elements: [],
    canvas: { width: 800, height: 800 },
    coordSystem: {
        props: {
            x_range: [-7, 7, 1],
            y_range: [-7, 7, 1]
        }
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
    }
};

global.sanitizeVariableName = (name) => name.replace(/[^a-zA-Z0-9_]/g, '_');
global.formatNumber = (num) => Number(num).toFixed(2);
global.hexToManimColor = (hex) => {
    const colorMap = {
        '#e74c3c': 'RED',
        '#3498db': 'BLUE',
        '#2ecc71': 'GREEN',
        '#2c3e50': 'DARK_GRAY'
    };
    return colorMap[hex.toLowerCase()] || 'WHITE';
};

let shapes = {};
global.registerShape = (plugin) => {
    shapes[plugin.type] = plugin;
};

// 加载插件
require('./polygon.js');

// 测试套件
console.log('🧪 正N边形插件测试\n');

const plugin = shapes['polygon'];
let testsPassed = 0;
let testsFailed = 0;

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`✅ ${message}`);
        testsPassed++;
    } else {
        console.log(`❌ ${message}`);
        console.log(`   期望: ${JSON.stringify(expected)}`);
        console.log(`   实际: ${JSON.stringify(actual)}`);
        testsFailed++;
    }
}

function assertInRange(actual, min, max, message) {
    if (actual >= min && actual <= max) {
        console.log(`✅ ${message}`);
        testsPassed++;
    } else {
        console.log(`❌ ${message}`);
        console.log(`   期望: ${min} <= ${actual} <= ${max}`);
        testsFailed++;
    }
}

// 测试1: 创建默认正六边形
console.log('测试1: createDefault');
const hexagon = plugin.createDefault(0, 0);
assertEqual(hexagon.props.n, 6, '默认边数为6');
assertEqual(hexagon.props.radius, 1.5, '默认半径为1.5');

// 测试2: getBounds计算
console.log('\n测试2: getBounds');
const bounds = plugin.getBounds(hexagon, ManimEditor);
assertEqual(bounds.w > 0, true, 'bounds宽度 > 0');
assertEqual(bounds.h > 0, true, 'bounds高度 > 0');

// 测试3: 正三角形（N=3）
console.log('\n测试3: 正三角形（N=3）');
const triangle = plugin.createDefault(0, 0);
triangle.props.n = 3;
triangle.props.radius = 1;
const triangleBounds = plugin.getBounds(triangle, ManimEditor);
assertEqual(triangleBounds.w > 0, true, '三角形bounds宽度 > 0');

// 测试4: 正方形（N=4）
console.log('\n测试4: 正方形（N=4）');
const square = plugin.createDefault(0, 0);
square.props.n = 4;
square.props.radius = 1;
const squareBounds = plugin.getBounds(square, ManimEditor);
assertInRange(squareBounds.w / squareBounds.h, 0.95, 1.05, '正方形宽高比接近1:1');

// 测试5: 大边数多边形（N=64）
console.log('\n测试5: 大边数多边形（N=64）');
const manyGon = plugin.createDefault(0, 0);
manyGon.props.n = 64;
manyGon.props.radius = 2;
const manyBounds = plugin.getBounds(manyGon, ManimEditor);
// 64边形应该接近圆形，宽高比接近1:1
assertInRange(manyBounds.w / manyBounds.h, 0.95, 1.05, '64边形宽高比接近1:1（类似圆）');

// 测试6: 缩放
console.log('\n测试6: handleScale');
const poly = plugin.createDefault(0, 0);
poly.props.radius = 1;
const newProps = plugin.handleScale(poly, {
    scaleX: 2,
    scaleY: 2,
    fixedPoint: { x: 0, y: 0 }
});
assertEqual(newProps.radius, 2, '缩放后半径加倍');

// 测试7: 等比例缩放（不同X/Y缩放因子）
console.log('\n测试7: 等比例缩放');
const poly2 = plugin.createDefault(0, 0);
poly2.props.radius = 1;
const newProps2 = plugin.handleScale(poly2, {
    scaleX: 2,
    scaleY: 3,
    fixedPoint: { x: 0, y: 0 }
});
assertEqual(newProps2.radius, 2, '使用较小的缩放因子（min(2,3)=2）');

// 测试8: 移动
console.log('\n测试8: handleMove');
const poly3 = plugin.createDefault(0, 0);
const moved = plugin.handleMove(poly3, {
    currentPoint: { x: 3, y: 2 },
    offset: { x: 1, y: 1 }
});
assertEqual(moved.x, 2, '移动后X坐标正确');
assertEqual(moved.y, 1, '移动后Y坐标正确');

// 测试9: hitTest（点在内部）
console.log('\n测试9: hitTest');
const poly4 = plugin.createDefault(0, 0);
poly4.props.radius = 2;
poly4.props.n = 6;
const hitInside = plugin.hitTest(poly4, 0, 0, ManimEditor);
assertEqual(hitInside, true, '中心点在正六边形内部');

// 测试10: hitTest（点在外部）
const hitOutside = plugin.hitTest(poly4, 5, 5, ManimEditor);
assertEqual(hitOutside, false, '远点不在正六边形内部');

// 测试11: toManim导出
console.log('\n测试11: toManim');
const poly5 = plugin.createDefault(1, 2);
poly5.props.n = 8;
poly5.props.radius = 1.5;
poly5.name = 'my_polygon';
const code = plugin.toManim(poly5);
assertEqual(code.includes('RegularPolygon(n=8'), true, 'Manim代码包含RegularPolygon(n=8');
assertEqual(code.includes('radius=1.50'), true, 'Manim代码包含radius=1.50');
assertEqual(code.includes('.move_to([1.00, 2.00, 0])'), true, 'Manim代码包含move_to');

// 测试12: 边数边界条件
console.log('\n测试12: 边数边界条件');
const poly6 = plugin.createDefault(0, 0);
poly6.props.n = 2;  // 小于最小值
const code6 = plugin.toManim(poly6);
assertEqual(code6.includes('n=3'), true, '边数<3时自动调整为3');

const poly7 = plugin.createDefault(0, 0);
poly7.props.n = 1000;  // 大于最大值
const code7 = plugin.toManim(poly7);
assertEqual(code7.includes('n=512'), true, '边数>512时自动调整为512');

// 测试13: 透明填充
console.log('\n测试13: 透明填充');
const poly8 = plugin.createDefault(0, 0);
poly8.props.fill_opacity = 0;
poly8.name = 'transparent_poly';
const code8 = plugin.toManim(poly8);
assertEqual(code8.includes('set_fill(opacity=0)'), true, '透明填充导出正确');

// 总结
console.log('\n' + '='.repeat(50));
console.log(`测试完成: ${testsPassed} 通过, ${testsFailed} 失败`);
if (testsFailed === 0) {
    console.log('✅ 所有测试通过！');
    process.exit(0);
} else {
    console.log('❌ 有测试失败');
    process.exit(1);
}


/**
 * Arc 插件测试
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
global.formatNumber = (num) => {
    if (num == null || isNaN(num)) return '0';
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(2).replace(/\.?0+$/, '');
};
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
require('./arc.js');

// 测试套件
console.log('🧪 圆弧插件测试\n');

const plugin = shapes['arc'];
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

// 测试1: 创建默认圆弧
console.log('测试1: createDefault');
const arc = plugin.createDefault(0, 0);
assertEqual(arc.props.start_angle, 0, '默认起始角度为0');
assertEqual(arc.props.end_angle, 90, '默认结束角度为90');
assertEqual(arc.props.stroke_width, 10, '默认线宽为10');

// 测试2: getBounds计算
console.log('\n测试2: getBounds');
const arc1 = plugin.createDefault(0, 0);
arc1.props.radius = 2;
arc1.props.start_angle = 0;
arc1.props.end_angle = 90;
const bounds = plugin.getBounds(arc1, ManimEditor);
assertEqual(bounds.w > 0, true, 'bounds宽度 > 0');
assertEqual(bounds.h > 0, true, 'bounds高度 > 0');

// 测试3: 半圆（0-180度）
console.log('\n测试3: 半圆');
const arc2 = plugin.createDefault(0, 0);
arc2.props.radius = 1;
arc2.props.start_angle = 0;
arc2.props.end_angle = 180;
const bounds2 = plugin.getBounds(arc2, ManimEditor);
assertEqual(bounds2.w > 0, true, '半圆bounds宽度 > 0');

// 测试4: 全圆（0-360度）
console.log('\n测试4: 全圆');
const arc3 = plugin.createDefault(0, 0);
arc3.props.radius = 1;
arc3.props.start_angle = 0;
arc3.props.end_angle = 360;
const bounds3 = plugin.getBounds(arc3, ManimEditor);
assertInRange(bounds3.w / bounds3.h, 0.95, 1.05, '全圆宽高比接近1:1');

// 测试5: hitTest（点在圆弧上）
console.log('\n测试5: hitTest');
const arc4 = plugin.createDefault(0, 0);
arc4.props.radius = 2;
arc4.props.start_angle = 0;
arc4.props.end_angle = 90;
// 测试0度方向的点（应该在圆弧上）
const hitOn = plugin.hitTest(arc4, 2, 0, ManimEditor);
assertEqual(hitOn, true, '0度方向的点应该在圆弧上');

// 测试6: hitTest（点不在圆弧角度范围内）
const hitOff = plugin.hitTest(arc4, 0, -2, ManimEditor);
assertEqual(hitOff, false, '270度方向的点不应该在圆弧上（角度范围外）');

// 测试7: 缩放（等比例）
console.log('\n测试7: handleScale');
const arc5 = plugin.createDefault(0, 0);
arc5.props.radius = 1;
arc5.props.start_angle = 0;
arc5.props.end_angle = 90;

const newProps = plugin.handleScale(arc5, {
    corner: 'bottomRight',
    fixedPoint: { x: -1, y: 1 },
    currentPoint: { x: 2, y: -2 }
}, ManimEditor);

const expectedRadius = Math.max(Math.abs(2 - (-1)), Math.abs(-2 - 1)) / 2;
assertInRange(newProps.radius, expectedRadius - 0.01, expectedRadius + 0.01, '缩放后半径正确');

// 角度不应该改变
assertEqual(newProps.start_angle, undefined, '缩放不改变 start_angle');
assertEqual(newProps.end_angle, undefined, '缩放不改变 end_angle');

// 测试8: 移动
console.log('\n测试8: handleMove');
const arc6 = plugin.createDefault(0, 0);
const moved = plugin.handleMove(arc6, {
    currentPoint: { x: 3, y: 2 },
    offset: { x: 1, y: 1 }
}, ManimEditor);
assertEqual(moved.x, 2, '移动后X坐标正确');
assertEqual(moved.y, 1, '移动后Y坐标正确');

// 测试9: toManim导出
console.log('\n测试9: toManim');
const arc7 = plugin.createDefault(1, 2);
arc7.props.radius = 1.5;
arc7.props.start_angle = 45;
arc7.props.end_angle = 135;
arc7.name = 'my_arc';
const code = plugin.toManim(arc7);
assertEqual(code.includes('Arc(radius=1.5'), true, 'Manim代码包含 Arc(radius=1.5');
assertEqual(code.includes('start_angle='), true, 'Manim代码包含 start_angle');
assertEqual(code.includes('angle='), true, 'Manim代码包含 angle（张角）');
assertEqual(code.includes('.move_to([1, 2, 0])'), true, 'Manim代码包含 move_to');

// 测试10: onUpgrade
console.log('\n测试10: onUpgrade');
const oldProps = {
    x: 1, y: 2, radius: 1.5,
    color: '#3498db'
};
const upgraded = plugin.onUpgrade(oldProps);
assertEqual(upgraded.stroke_color, '#3498db', '升级时从 color 迁移到 stroke_color');
assertEqual(upgraded.stroke_width, 10, '升级时添加默认 stroke_width=10');
assertEqual(upgraded.z_order, 0, '升级时添加默认 z_order=0');
assertEqual(upgraded.start_angle, 0, '升级时添加默认 start_angle=0');
assertEqual(upgraded.end_angle, 90, '升级时添加默认 end_angle=90');

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


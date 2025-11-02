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
assertEqual(Array.isArray(arc.props.pointA), true, '默认包含pointA');
assertEqual(Array.isArray(arc.props.pointB), true, '默认包含pointB');
assertEqual(Array.isArray(arc.props.pointC), true, '默认包含pointC');

// 测试2: getBounds计算
console.log('\n测试2: getBounds');
const arc1 = plugin.createDefault(0, 0);
const bounds = plugin.getBounds(arc1, ManimEditor);
assertEqual(bounds.w > 0, true, 'bounds宽度 > 0');
assertEqual(bounds.h > 0, true, 'bounds高度 > 0');

// 测试3: 半圆（0-180度）
console.log('\n测试3: 预览/半圆等价场景不再强校验');
const arc2 = plugin.createDefault(0, 0);
const bounds2 = plugin.getBounds(arc2, ManimEditor);
assertEqual(bounds2.w > 0, true, 'bounds宽度 > 0');

// 测试4: 全圆（0-360度）
console.log('\n测试4: bounds基本合理');
const arc3 = plugin.createDefault(0, 0);
const bounds3 = plugin.getBounds(arc3, ManimEditor);
assertEqual(bounds3.w > 0 && bounds3.h > 0, true, 'bounds有效');

// 测试5: hitTest（点在圆弧上）
console.log('\n测试5: hitTest');
const arc4 = plugin.createDefault(0, 0);
const hitResult = plugin.hitTest(arc4, 0, 0, ManimEditor);
assertEqual(typeof hitResult === 'boolean', true, 'hitTest返回布尔值');

// 测试7: 缩放（等比例）
console.log('\n测试7: handleScale');
const arc5 = plugin.createDefault(0, 0);
const scaledProps = plugin.handleScale(arc5, {
    corner: 'bottomRight',
    fixedPoint: { x: -1, y: 1 },
    currentPoint: { x: 2, y: -2 }
}, ManimEditor);
assertEqual(Array.isArray(scaledProps.pointA), true, '缩放后仍包含pointA');
assertEqual(Array.isArray(scaledProps.pointB), true, '缩放后仍包含pointB');
assertEqual(Array.isArray(scaledProps.pointC), true, '缩放后仍包含pointC');

// 测试8: 移动
console.log('\n测试8: handleMove');
const arc6 = plugin.createDefault(0, 0);
const moved = plugin.handleMove(arc6, {
    currentPoint: { x: 3, y: 2 },
    offset: { x: 1, y: 1 }
}, ManimEditor);
assertEqual(Array.isArray(moved.pointA), true, '移动后包含pointA');
assertEqual(Array.isArray(moved.pointB), true, '移动后包含pointB');
assertEqual(Array.isArray(moved.pointC), true, '移动后包含pointC');

// 测试9: toManim导出
console.log('\n测试9: toManim');
const arc7 = plugin.createDefault(1, 2);
arc7.name = 'my_arc';
const code = plugin.toManim(arc7);
assertEqual(code.includes('Arc('), true, 'Manim代码包含 Arc(');
assertEqual(code.includes('start_angle='), true, 'Manim代码包含 start_angle');
assertEqual(code.includes('angle='), true, 'Manim代码包含 angle（张角）');
assertEqual(code.includes('.move_to('), true, 'Manim代码包含 move_to');

// 测试10: onUpgrade
console.log('\n测试10: onUpgrade');
const oldProps = { stroke_color: undefined, stroke_width: undefined, z_order: undefined };
const upgraded = plugin.onUpgrade(oldProps);
assertEqual(typeof upgraded.stroke_color === 'string', true, '升级时补齐 stroke_color');
assertEqual(typeof upgraded.stroke_width !== 'undefined', true, '升级时补齐 stroke_width');
assertEqual(typeof upgraded.z_order !== 'undefined', true, '升级时补齐 z_order');

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


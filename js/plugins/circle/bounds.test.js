#!/usr/bin/env node
/**
 * 专门测试getBounds的准确性
 * 
 * 关键：getBounds应该返回图形的外接矩形
 */

const path = require('path');
const fs = require('fs');

// 加载测试框架基础
const testFramework = fs.readFileSync(path.join(__dirname, '../../../tests/plugin_test.js'), 'utf8');
eval(testFramework.split('// 加载所有插件')[0]);

// 加载所有插件（根据当前文件位置修正路径）
const plugins = ['circle', 'ellipse', 'sine', 'parabola'];
plugins.forEach(name => {
    const pluginPath = path.join(__dirname, `../${name}/${name}.js`);
    if (fs.existsSync(pluginPath)) {
        eval(fs.readFileSync(pluginPath, 'utf8'));
    }
});

let total = 0;
let passed = 0;

function test(name, fn) {
    total++;
    try {
        fn();
        console.log(`\x1b[32m  ✓ ${name}\x1b[0m`);
        passed++;
        return true;
    } catch (err) {
        console.log(`\x1b[31m  ✗ ${name}\x1b[0m`);
        console.log(`    ${err.message}`);
        return false;
    }
}

console.log('\n' + '═'.repeat(60));
console.log('getBounds 准确性测试');
console.log('═'.repeat(60));

// ═══════════════════════════════════════════
// 测试Circle的getBounds
// ═══════════════════════════════════════════
console.log('\n[Circle] getBounds测试');

const circlePlugin = ManimEditor.shapeRegistry['circle'];

test('Circle的bounds应该是外接正方形', () => {
    const element = {
        props: { x: 0, y: 0, radius: 2 }
    };
    
    const bounds = circlePlugin.getBounds(element, ManimEditor);
    
    // 圆心在(0, 0)，半径2
    // 外接正方形：左上(-2, 2)，右下(2, -2)
    const expectedTopLeft = ManimEditor.manimToCanvas(-2, 2);
    const expectedBottomRight = ManimEditor.manimToCanvas(2, -2);
    
    const expectedBounds = {
        x: expectedTopLeft.x,
        y: expectedTopLeft.y,
        w: expectedBottomRight.x - expectedTopLeft.x,
        h: expectedBottomRight.y - expectedTopLeft.y
    };
    
    if (Math.abs(bounds.x - expectedBounds.x) > 1) {
        throw new Error(`x错误: ${bounds.x} !== ${expectedBounds.x}`);
    }
    if (Math.abs(bounds.y - expectedBounds.y) > 1) {
        throw new Error(`y错误: ${bounds.y} !== ${expectedBounds.y}`);
    }
    if (Math.abs(bounds.w - expectedBounds.w) > 1) {
        throw new Error(`w错误: ${bounds.w} !== ${expectedBounds.w}`);
    }
    if (Math.abs(bounds.h - expectedBounds.h) > 1) {
        throw new Error(`h错误: ${bounds.h} !== ${expectedBounds.h}`);
    }
});

test('Circle的bounds应该是正方形', () => {
    const element = { props: { x: 0, y: 0, radius: 2 } };
    const bounds = circlePlugin.getBounds(element, ManimEditor);
    
    if (Math.abs(bounds.w - bounds.h) > 1) {
        throw new Error(`不是正方形: w=${bounds.w}, h=${bounds.h}`);
    }
});

// ═══════════════════════════════════════════
// 测试Ellipse的getBounds
// ═══════════════════════════════════════════
console.log('\n[Ellipse] getBounds测试');

const ellipsePlugin = ManimEditor.shapeRegistry['ellipse'];

test('Ellipse的bounds应该精确包含椭圆', () => {
    const element = {
        props: { x: 0, y: 0, width: 4, height: 2 }
    };
    
    const bounds = ellipsePlugin.getBounds(element, ManimEditor);
    
    // 椭圆中心(0,0)，宽4，高2
    // 外接矩形：左上(-2, 1)，右下(2, -1)
    const expectedTopLeft = ManimEditor.manimToCanvas(-2, 1);
    const expectedBottomRight = ManimEditor.manimToCanvas(2, -1);
    
    const expectedW = expectedBottomRight.x - expectedTopLeft.x;
    const expectedH = expectedBottomRight.y - expectedTopLeft.y;
    
    if (Math.abs(bounds.x - expectedTopLeft.x) > 1) {
        throw new Error(`x错误: ${bounds.x} !== ${expectedTopLeft.x}`);
    }
    if (Math.abs(bounds.w - expectedW) > 1) {
        throw new Error(`w错误: ${bounds.w} !== ${expectedW}`);
    }
    if (Math.abs(bounds.h - expectedH) > 1) {
        throw new Error(`h错误: ${bounds.h} !== ${expectedH}`);
    }
});

// ═══════════════════================================================================ // 测试Sine的getBounds
// ═══════════════════════════════════════════
console.log('\n[Sine] getBounds测试');

const sinePlugin = ManimEditor.shapeRegistry['sine'];

test('Sine的bounds应该覆盖整个函数图像', () => {
    const element = {
        props: {
            x: 0,
            y: 0,
            amplitude: 1.5,
            x_start: -Math.PI,
            x_end: Math.PI
        }
    };
    
    const bounds = sinePlugin.getBounds(element, ManimEditor);
    
    // Sine从x=-π到x=π，振幅1.5
    // Y范围：[-1.5, 1.5]（相对于中心0）
    // 外接矩形：左上(-π, 1.5)，右下(π, -1.5)
    const expectedTopLeft = ManimEditor.manimToCanvas(-Math.PI, 1.5);
    const expectedBottomRight = ManimEditor.manimToCanvas(Math.PI, -1.5);
    
    const expectedX = expectedTopLeft.x;
    const expectedY = expectedTopLeft.y;
    const expectedW = expectedBottomRight.x - expectedTopLeft.x;
    const expectedH = expectedBottomRight.y - expectedTopLeft.y;
    
    if (Math.abs(bounds.x - expectedX) > 1) {
        throw new Error(`x错误: ${bounds.x} !== ${expectedX}`);
    }
    if (Math.abs(bounds.w - expectedW) > 1) {
        throw new Error(`w错误: ${bounds.w} !== ${expectedW}`);
    }
});

// ═══════════════════════════════════════════
// 总结
// ═══════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`总计: ${total} 个测试`);
console.log(`\x1b[32m通过: ${passed}\x1b[0m`);
console.log(`\x1b[${passed === total ? '32' : '31'}m失败: ${total - passed}\x1b[0m`);
console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);

if (passed < total) {
    console.log('\n\x1b[33m⚠️ 需要修复getBounds实现！\x1b[0m');
}

process.exit(passed === total ? 0 : 1);


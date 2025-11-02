#!/usr/bin/env node
/**
 * Circle插件测试
 */

const path = require('path');
const fs = require('fs');

// 加载测试框架
const testFramework = fs.readFileSync(
    path.join(__dirname, '../../../tests/plugin_test.js'),
    'utf8'
);

// 提取公共部分（ManimEditor模拟等）
eval(testFramework.split('// 加载所有插件')[0]);

// 加载circle插件
const circleCode = fs.readFileSync(__dirname + '/circle.js', 'utf8');
eval(circleCode);

// 测试
function testCircle() {
    console.log('\n' + '═'.repeat(60));
    console.log('Circle 插件测试');
    console.log('═'.repeat(60));
    
    const plugin = ManimEditor.shapeRegistry['circle'];
    
    if (!plugin) {
        console.log('\x1b[31m✗ circle插件未注册\x1b[0m');
        process.exit(1);
    }
    
    let passed = 0;
    let total = 0;
    
    function test(name, fn) {
        total++;
        try {
            fn();
            console.log(`\x1b[32m  ✓ ${name}\x1b[0m`);
            passed++;
        } catch (err) {
            console.log(`\x1b[31m  ✗ ${name}: ${err.message}\x1b[0m`);
        }
    }
    
    // 测试1：创建
    console.log('\n[测试1] createDefault');
    test('type应该是circle', () => {
        const el = plugin.createDefault(0, 0);
        if (el.type !== 'circle') throw new Error('type错误');
    });
    
    test('默认半径应该是1', () => {
        const el = plugin.createDefault(0, 0);
        if (el.props.radius !== 1) throw new Error('默认半径错误');
    });
    
    // 测试2：getBounds
    console.log('\n[测试2] getBounds');
    test('getBounds应该返回正方形', () => {
        const el = { props: { x: 0, y: 0, radius: 2 } };
        const bounds = plugin.getBounds(el, ManimEditor);
        const expectedRadius = 2 * 50;  // 100px
        const expectedCenter = { x: 400, y: 300 };
        
        if (Math.abs(bounds.w - expectedRadius * 2) > 1) {
            throw new Error(`宽度错误: ${bounds.w} !== ${expectedRadius * 2}`);
        }
        if (Math.abs(bounds.h - expectedRadius * 2) > 1) {
            throw new Error(`高度错误: ${bounds.h} !== ${expectedRadius * 2}`);
        }
        if (Math.abs(bounds.w - bounds.h) > 0.1) {
            throw new Error('bounds应该是正方形');
        }
    });
    
    // 测试3：缩放
    console.log('\n[测试3] handleScale');
    test('缩放应该改变半径', () => {
        const el = { props: { x: 0, y: 0, radius: 1 } };
        const scaleInfo = {
            corner: 'bottomRight',
            fixedPoint: { x: -1, y: 1 },
            currentPoint: { x: 2, y: -2 },
            isShift: false,
            originalProps: el.props
        };
        
        const newProps = plugin.handleScale(el, scaleInfo, ManimEditor);
        
        // 边界框尺寸 = max(|2-(-1)|, |-2-1|) = 3
        // 半径 = 边界框尺寸 / 2 = 1.5
        const expectedRadius = Math.max(
            Math.abs(2 - (-1)),
            Math.abs(-2 - 1)
        ) / 2;  // max(3, 3) / 2 = 1.5
        
        if (Math.abs(newProps.radius - expectedRadius) > 0.01) {
            throw new Error(`新半径错误: ${newProps.radius} !== ${expectedRadius}`);
        }
    });
    
    test('缩放应保持固定点', () => {
        const el = { props: { x: 0, y: 0, radius: 1 } };
        const fixedPoint = { x: -1, y: 1 };
        const scaleInfo = {
            corner: 'bottomRight',
            fixedPoint: fixedPoint,
            currentPoint: { x: 2, y: -2 },
            isShift: false,
            originalProps: el.props
        };
        
        const newProps = plugin.handleScale(el, scaleInfo, ManimEditor);
        
        // 验证topLeft（固定点）
        const newTopLeftX = newProps.x - newProps.radius;
        const newTopLeftY = newProps.y + newProps.radius;
        
        if (Math.abs(newTopLeftX - fixedPoint.x) > 0.01) {
            throw new Error(`topLeft.x移动了: ${newTopLeftX} !== ${fixedPoint.x}`);
        }
        if (Math.abs(newTopLeftY - fixedPoint.y) > 0.01) {
            throw new Error(`topLeft.y移动了: ${newTopLeftY} !== ${fixedPoint.y}`);
        }
    });
    
    // 测试4：移动
    console.log('\n[测试4] handleMove');
    test('移动应该改变中心', () => {
        const el = { props: { x: 0, y: 0, radius: 1 } };
        const moveInfo = {
            currentPoint: { x: 2, y: 3 },
            offset: { x: 0.5, y: 0.5 }
        };
        
        const newProps = plugin.handleMove(el, moveInfo, ManimEditor);
        
        if (Math.abs(newProps.x - 1.5) > 0.01) {
            throw new Error(`新x错误: ${newProps.x} !== 1.5`);
        }
        if (Math.abs(newProps.y - 2.5) > 0.01) {
            throw new Error(`新y错误: ${newProps.y} !== 2.5`);
        }
    });
    
    // 测试5：导出
    console.log('\n[测试5] toManim');
    test('应该生成正确的Manim代码', () => {
        const el = {
            name: 'my_circle',
            props: { x: 1, y: 2, radius: 1.5, color: '#3498db', opacity: 1 }
        };
        
        const code = plugin.toManim(el);
        
        if (!code.includes('Circle')) throw new Error('应该包含Circle');
        if (!code.includes('radius=1.5')) throw new Error('应该包含radius');
        if (!code.includes('move_to([1, 2, 0])')) throw new Error('应该包含move_to');
    });
    
    // 总结
    console.log('\n' + '═'.repeat(60));
    console.log(`总计: ${total} 个测试`);
    console.log(`\x1b[32m通过: ${passed} 个\x1b[0m`);
    console.log(`\x1b[${passed === total ? '32' : '31'}m失败: ${total - passed} 个\x1b[0m`);
    console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);
    
    process.exit(passed === total ? 0 : 1);
}

testCircle();


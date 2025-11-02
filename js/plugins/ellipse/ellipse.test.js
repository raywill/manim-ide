#!/usr/bin/env node
/**
 * Ellipse插件测试
 */

const path = require('path');
const fs = require('fs');

// 加载测试框架
const testFramework = fs.readFileSync(
    path.join(__dirname, '../../../tests/plugin_test.js'),
    'utf8'
);
eval(testFramework.split('// 加载所有插件')[0]);

// 加载ellipse插件
const ellipseCode = fs.readFileSync(__dirname + '/ellipse.js', 'utf8');
eval(ellipseCode);

// 测试
function testEllipse() {
    console.log('\n' + '═'.repeat(60));
    console.log('Ellipse 插件测试');
    console.log('═'.repeat(60));
    
    const plugin = ManimEditor.shapeRegistry['ellipse'];
    let passed = 0, total = 0;
    
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
    
    // 测试
    console.log('\n[测试1] createDefault');
    test('type应该是ellipse', () => {
        const el = plugin.createDefault(0, 0);
        if (el.type !== 'ellipse') throw new Error('type错误');
    });
    
    test('默认宽度2，高度1', () => {
        const el = plugin.createDefault(0, 0);
        if (el.props.width !== 2 || el.props.height !== 1) {
            throw new Error('默认尺寸错误');
        }
    });
    
    console.log('\n[测试2] handleScale - 不等比');
    test('不按Shift可以不等比缩放', () => {
        const el = { props: { x: 0, y: 0, width: 2, height: 1 } };
        const scaleInfo = {
            corner: 'bottomRight',
            fixedPoint: { x: -1, y: 0.5 },
            currentPoint: { x: 3, y: -1 },  // 宽>高
            isShift: false,
            originalProps: el.props
        };
        
        const newProps = plugin.handleScale(el, scaleInfo, ManimEditor);
        const ratio = newProps.width / newProps.height;
        
        // 不等比缩放，比例应该改变
        if (Math.abs(ratio - 2) < 0.1) {
            throw new Error('比例不应该保持2:1');
        }
    });
    
    console.log('\n[测试3] toManim');
    test('应该生成Ellipse代码', () => {
        const el = {
            name: 'my_ellipse',
            props: { x: 0, y: 0, width: 3, height: 2, color: '#9b59b6', opacity: 1 }
        };
        
        const code = plugin.toManim(el);
        if (!code.includes('Ellipse')) throw new Error('应该包含Ellipse');
        if (!code.includes('width=3')) throw new Error('应该包含width');
        if (!code.includes('height=2')) throw new Error('应该包含height');
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log(`总计: ${total}, 通过: ${passed}, 失败: ${total - passed}`);
    process.exit(passed === total ? 0 : 1);
}

testEllipse();

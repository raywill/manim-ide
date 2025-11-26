#!/usr/bin/env node
/**
 * NumberLine插件测试
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

// 加载numberline插件
const numberlineCode = fs.readFileSync(__dirname + '/numberline.js', 'utf8');
eval(numberlineCode);

// 测试
function testNumberLine() {
    console.log('\n' + '═'.repeat(60));
    console.log('NumberLine 插件测试');
    console.log('═'.repeat(60));
    
    const plugin = ManimEditor.shapeRegistry['numberline'];
    
    if (!plugin) {
        console.log('\x1b[31m✗ numberline插件未注册\x1b[0m');
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
    test('type应该是numberline', () => {
        const el = plugin.createDefault(0, 0);
        if (el.type !== 'numberline') throw new Error('type错误');
    });
    
    test('默认起点和终点应该相同（拖动绘制避免闪现）', () => {
        const el = plugin.createDefault(1, 2);
        if (el.props.start[0] !== 1 || el.props.start[1] !== 2) {
            throw new Error('起点错误');
        }
        if (el.props.end[0] !== 1 || el.props.end[1] !== 2) {
            throw new Error('终点错误');
        }
    });
    
    test('默认min应该是0', () => {
        const el = plugin.createDefault(0, 0);
        if (el.props.min !== 0) throw new Error('默认min错误');
    });
    
    test('默认max应该是10', () => {
        const el = plugin.createDefault(0, 0);
        if (el.props.max !== 10) throw new Error('默认max错误');
    });
    
    test('默认step应该是1', () => {
        const el = plugin.createDefault(0, 0);
        if (el.props.step !== 1) throw new Error('默认step错误');
    });
    
    test('默认drawMode应该是drag', () => {
        if (plugin.drawMode !== 'drag') throw new Error('drawMode错误');
    });
    
    // 测试2：getBounds
    console.log('\n[测试2] getBounds');
    test('getBounds应该包含起点和终点', () => {
        const el = { 
            props: { 
                start: [0, 0, 0], 
                end: [4, 0, 0] 
            } 
        };
        const bounds = plugin.getBounds(el, ManimEditor);
        
        const start = ManimEditor.manimToCanvas(0, 0);
        const end = ManimEditor.manimToCanvas(4, 0);
        
        // bounds应该包含起点和终点（考虑padding）
        if (bounds.x > start.x || bounds.x + bounds.w < end.x) {
            throw new Error('bounds不包含数轴范围');
        }
    });
    
    // 测试3：updateWhileDrawing
    console.log('\n[测试3] updateWhileDrawing');
    test('updateWhileDrawing应该更新起点和终点', () => {
        const el = plugin.createDefault(0, 0);
        const start = { manimX: 0, manimY: 0 };
        const current = { manimX: 5, manimY: 0, isShift: false };
        
        plugin.updateWhileDrawing(el, start, current, ManimEditor);
        
        if (el.props.start[0] !== 0 || el.props.start[1] !== 0) {
            throw new Error('起点更新错误');
        }
        if (el.props.end[0] !== 5 || el.props.end[1] !== 0) {
            throw new Error('终点更新错误');
        }
    });
    
    // 测试4：缩放
    console.log('\n[测试4] handleScale');
    test('缩放应该改变起点和终点', () => {
        const el = { 
            props: { 
                start: [0, 0, 0], 
                end: [4, 0, 0] 
            } 
        };
        const scaleInfo = {
            corner: 'bottomRight',
            fixedPoint: { x: 0, y: 0 },
            currentPoint: { x: 8, y: 0 },
            isShift: false,
            originalProps: el.props
        };
        
        const newProps = plugin.handleScale(el, scaleInfo, ManimEditor);
        
        // 应该有新的起点和终点
        if (!newProps.start || !newProps.end) {
            throw new Error('缩放未返回新的起点和终点');
        }
        
        // 新的长度应该是原来的2倍
        const newLength = Math.abs(newProps.end[0] - newProps.start[0]);
        if (Math.abs(newLength - 8) > 0.01) {
            throw new Error(`新长度错误: ${newLength} !== 8`);
        }
    });
    
    // 测试5：移动
    console.log('\n[测试5] handleMove');
    test('移动应该平移起点和终点', () => {
        const el = { 
            props: { 
                start: [0, 0, 0], 
                end: [4, 0, 0] 
            } 
        };
        const moveInfo = {
            deltaX: 2,
            deltaY: 1
        };
        
        const newProps = plugin.handleMove(el, moveInfo, ManimEditor);
        
        if (Math.abs(newProps.start[0] - 2) > 0.01) {
            throw new Error(`起点X错误: ${newProps.start[0]} !== 2`);
        }
        if (Math.abs(newProps.start[1] - 1) > 0.01) {
            throw new Error(`起点Y错误: ${newProps.start[1]} !== 1`);
        }
        if (Math.abs(newProps.end[0] - 6) > 0.01) {
            throw new Error(`终点X错误: ${newProps.end[0]} !== 6`);
        }
        if (Math.abs(newProps.end[1] - 1) > 0.01) {
            throw new Error(`终点Y错误: ${newProps.end[1]} !== 1`);
        }
    });
    
    // 测试6：导出
    console.log('\n[测试6] toManim');
    test('应该生成正确的Manim代码', () => {
        const el = {
            name: 'my_numberline',
            props: { 
                start: [0, 0, 0], 
                end: [5, 0, 0],
                min: 0,
                max: 10,
                step: 1,
                color: '#2c3e50',
                include_numbers: true
            }
        };
        
        const code = plugin.toManim(el);
        
        if (!code.includes('NumberLine')) throw new Error('应该包含NumberLine');
        if (!code.includes('x_range=[0, 10, 1]')) throw new Error('应该包含x_range');
        if (!code.includes('length=5')) throw new Error('应该包含length');
        if (!code.includes('move_to([0, 0, 0])')) throw new Error('应该包含move_to');
    });
    
    test('不显示数字时应该包含include_numbers=False', () => {
        const el = {
            name: 'my_numberline',
            props: { 
                start: [0, 0, 0], 
                end: [5, 0, 0],
                min: 0,
                max: 10,
                step: 1,
                color: '#2c3e50',
                include_numbers: false
            }
        };
        
        const code = plugin.toManim(el);
        
        if (!code.includes('include_numbers=False')) {
            throw new Error('应该包含include_numbers=False');
        }
    });
    
    test('非水平数轴应该包含rotate', () => {
        const el = {
            name: 'my_numberline',
            props: { 
                start: [0, 0, 0], 
                end: [3, 4, 0],  // 斜线
                min: 0,
                max: 10,
                step: 1,
                color: '#2c3e50',
                include_numbers: true
            }
        };
        
        const code = plugin.toManim(el);
        
        if (!code.includes('rotate')) {
            throw new Error('非水平数轴应该包含rotate');
        }
    });
    
    // 测试7：属性
    console.log('\n[测试7] properties');
    test('应该包含min、max、step属性', () => {
        const props = plugin.properties;
        const hasMin = props.some(p => p.key === 'min');
        const hasMax = props.some(p => p.key === 'max');
        const hasStep = props.some(p => p.key === 'step');
        
        if (!hasMin) throw new Error('缺少min属性');
        if (!hasMax) throw new Error('缺少max属性');
        if (!hasStep) throw new Error('缺少step属性');
    });
    
    // 总结
    console.log('\n' + '═'.repeat(60));
    console.log(`总计: ${total} 个测试`);
    console.log(`\x1b[32m通过: ${passed} 个\x1b[0m`);
    console.log(`\x1b[${passed === total ? '32' : '31'}m失败: ${total - passed} 个\x1b[0m`);
    console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);
    
    process.exit(passed === total ? 0 : 1);
}

testNumberLine();

/**
 * Brace 插件测试
 * 在浏览器控制台运行这些测试
 */

console.log('=== Brace 插件测试套件 ===');

/**
 * 测试1：创建水平大括号（向上）
 */
function testHorizontalBraceUp() {
    console.log('\n测试1: 水平大括号（向上）');
    const brace = ManimEditor.shapeRegistry.brace.createDefault(0, 0);
    brace.props.point1 = [0, 0, 0];
    brace.props.point2 = [4, 0, 0];
    brace.props.direction = 1;  // 向上
    brace.props.color = '#e74c3c';
    const added = addElement(brace);
    console.log('✓ 创建成功，ID:', added.id);
    return added;
}

/**
 * 测试2：创建水平大括号（向下）
 */
function testHorizontalBraceDown() {
    console.log('\n测试2: 水平大括号（向下）');
    const brace = ManimEditor.shapeRegistry.brace.createDefault(0, -2);
    brace.props.point1 = [0, -2, 0];
    brace.props.point2 = [4, -2, 0];
    brace.props.direction = -1;  // 向下
    brace.props.color = '#3498db';
    const added = addElement(brace);
    console.log('✓ 创建成功，ID:', added.id);
    return added;
}

/**
 * 测试3：创建垂直大括号（向左）
 */
function testVerticalBraceLeft() {
    console.log('\n测试3: 垂直大括号（向左）');
    const brace = ManimEditor.shapeRegistry.brace.createDefault(-2, 0);
    brace.props.point1 = [-2, 0, 0];
    brace.props.point2 = [-2, 3, 0];
    brace.props.direction = 1;  // 向左
    brace.props.color = '#27ae60';
    const added = addElement(brace);
    console.log('✓ 创建成功，ID:', added.id);
    return added;
}

/**
 * 测试4：创建斜向大括号
 */
function testDiagonalBrace() {
    console.log('\n测试4: 斜向大括号');
    const brace = ManimEditor.shapeRegistry.brace.createDefault(1, 1);
    brace.props.point1 = [1, 1, 0];
    brace.props.point2 = [4, 4, 0];
    brace.props.direction = 1;  // 左侧
    brace.props.color = '#9b59b6';
    const added = addElement(brace);
    console.log('✓ 创建成功，ID:', added.id);
    return added;
}

/**
 * 测试5：测试不同的间距（buff）
 */
function testBuffVariations() {
    console.log('\n测试5: 不同间距（buff）');
    const buffs = [0.1, 0.3, 0.5];
    const results = [];
    
    buffs.forEach((buff, i) => {
        const brace = ManimEditor.shapeRegistry.brace.createDefault(0, 2 + i * 1.5);
        brace.props.point1 = [0, 2 + i * 1.5, 0];
        brace.props.point2 = [3, 2 + i * 1.5, 0];
        brace.props.buff = buff;
        brace.props.color = '#f39c12';
        const added = addElement(brace);
        results.push(added);
        console.log(`  buff=${buff}: ID=${added.id}`);
    });
    
    console.log('✓ 所有间距测试完成');
    return results;
}

/**
 * 测试6：测试不同的尖锐度（sharpness）
 */
function testSharpnessVariations() {
    console.log('\n测试6: 不同尖锐度（sharpness）');
    const sharpnesses = [1.0, 2.0, 3.0];
    const results = [];
    
    sharpnesses.forEach((sharpness, i) => {
        const brace = ManimEditor.shapeRegistry.brace.createDefault(-4, -i * 1.5);
        brace.props.point1 = [-4, -i * 1.5, 0];
        brace.props.point2 = [-1, -i * 1.5, 0];
        brace.props.sharpness = sharpness;
        brace.props.color = '#1abc9c';
        const added = addElement(brace);
        results.push(added);
        console.log(`  sharpness=${sharpness}: ID=${added.id}`);
    });
    
    console.log('✓ 所有尖锐度测试完成');
    return results;
}

/**
 * 测试7：测试碰撞检测（hitTest）
 */
function testHitTest() {
    console.log('\n测试7: 碰撞检测（hitTest）');
    const brace = ManimEditor.shapeRegistry.brace.createDefault(0, 0);
    brace.props.point1 = [0, 0, 0];
    brace.props.point2 = [3, 0, 0];
    brace.props.direction = 1;
    
    const plugin = ManimEditor.shapeRegistry.brace;
    
    // 测试点：应该命中
    const hit1 = plugin.hitTest(brace, 1.5, 0.3, ManimEditor);
    console.log(`  点(1.5, 0.3)命中: ${hit1 ? '✓' : '✗'}`);
    
    // 测试点：不应该命中
    const hit2 = plugin.hitTest(brace, 5, 5, ManimEditor);
    console.log(`  点(5, 5)命中: ${hit2 ? '✗' : '✓'}`);
    
    console.log('✓ 碰撞检测测试完成');
}

/**
 * 测试8：测试导出到 Manim 代码
 */
function testManimExport() {
    console.log('\n测试8: 导出到 Manim 代码');
    const brace = ManimEditor.shapeRegistry.brace.createDefault(0, 0);
    brace.props.point1 = [0, 0, 0];
    brace.props.point2 = [4, 0, 0];
    brace.props.direction = 1;
    brace.props.color = '#e74c3c';
    brace.name = 'test_brace';
    
    const plugin = ManimEditor.shapeRegistry.brace;
    const code = plugin.toManim(brace);
    
    console.log('  生成的代码:');
    console.log('  ' + code);
    console.log('✓ 导出测试完成');
    
    return code;
}

/**
 * 测试9：测试控制点
 */
function testControlPoints() {
    console.log('\n测试9: 控制点');
    const brace = ManimEditor.shapeRegistry.brace.createDefault(0, 0);
    brace.props.point1 = [0, 0, 0];
    brace.props.point2 = [3, 0, 0];
    brace.props.direction = 1;
    
    const plugin = ManimEditor.shapeRegistry.brace;
    const controlPoints = plugin.getControlPoints(brace, ManimEditor);
    
    console.log(`  控制点数量: ${controlPoints.length}`);
    controlPoints.forEach(cp => {
        console.log(`    - ${cp.id}: (${cp.x.toFixed(2)}, ${cp.y.toFixed(2)}), type=${cp.type}`);
    });
    
    console.log('✓ 控制点测试完成');
    return controlPoints;
}

/**
 * 测试10：测试边界框（getBounds）
 */
function testGetBounds() {
    console.log('\n测试10: 边界框');
    const brace = ManimEditor.shapeRegistry.brace.createDefault(0, 0);
    brace.props.point1 = [0, 0, 0];
    brace.props.point2 = [4, 0, 0];
    brace.props.direction = 1;
    
    const plugin = ManimEditor.shapeRegistry.brace;
    const bounds = plugin.getBounds(brace, ManimEditor);
    
    console.log(`  边界框: x=${bounds.x.toFixed(1)}, y=${bounds.y.toFixed(1)}, w=${bounds.w.toFixed(1)}, h=${bounds.h.toFixed(1)}`);
    console.log('✓ 边界框测试完成');
    
    return bounds;
}

/**
 * 运行所有测试
 */
function runAllTests() {
    console.log('\n========================================');
    console.log('开始运行所有测试...');
    console.log('========================================');
    
    try {
        testHorizontalBraceUp();
        testHorizontalBraceDown();
        testVerticalBraceLeft();
        testDiagonalBrace();
        testBuffVariations();
        testSharpnessVariations();
        testHitTest();
        testManimExport();
        testControlPoints();
        testGetBounds();
        
        console.log('\n========================================');
        console.log('✅ 所有测试通过！');
        console.log('========================================');
    } catch (error) {
        console.error('\n========================================');
        console.error('❌ 测试失败:', error);
        console.error('========================================');
    }
}

/**
 * 清理所有测试创建的元素
 */
function cleanupTests() {
    console.log('\n清理测试元素...');
    const braceElements = ManimEditor.elements.filter(e => e.type === 'brace');
    braceElements.forEach(e => deleteElement(e.id));
    console.log(`✓ 已清理 ${braceElements.length} 个大括号元素`);
}

// 导出测试函数
if (typeof window !== 'undefined') {
    window.BraceTests = {
        runAll: runAllTests,
        cleanup: cleanupTests,
        individual: {
            testHorizontalBraceUp,
            testHorizontalBraceDown,
            testVerticalBraceLeft,
            testDiagonalBrace,
            testBuffVariations,
            testSharpnessVariations,
            testHitTest,
            testManimExport,
            testControlPoints,
            testGetBounds
        }
    };
    
    console.log('\n提示：使用以下命令运行测试:');
    console.log('  - BraceTests.runAll()        // 运行所有测试');
    console.log('  - BraceTests.cleanup()       // 清理测试元素');
    console.log('  - BraceTests.individual.testHorizontalBraceUp() // 运行单个测试');
}


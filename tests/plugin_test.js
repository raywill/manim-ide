#!/usr/bin/env node
/**
 * Manim IDE 插件功能测试框架
 * 
 * 测试所有插件的核心功能，确保插件化迁移后行为正确
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    console.log(colors[color] + msg + colors.reset);
}

// 测试统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * 断言函数
 */
function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        log(`  ✓ ${message}`, 'green');
        return true;
    } else {
        failedTests++;
        log(`  ✗ ${message}`, 'red');
        return false;
    }
}

function assertEquals(actual, expected, message, tolerance = 0.001) {
    const passed = Math.abs(actual - expected) < tolerance;
    assert(passed, `${message}: expected ${expected}, got ${actual}`);
    return passed;
}

function assertNotChanged(original, current, message, tolerance = 0.001) {
    const passed = Math.abs(current - original) < tolerance;
    assert(passed, `${message}: 应该保持${original}，实际${current}`);
    return passed;
}

/**
 * 模拟ManimEditor环境
 */
global.ManimEditor = {
    canvas: { width: 800, height: 600 },
    elements: [],
    shapeRegistry: {},
    
    manimToCanvas: function(manimX, manimY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        return {
            x: centerX + manimX * 50,
            y: centerY - manimY * 50
        };
    },
    
    canvasToManim: function(canvasX, canvasY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        return {
            x: (canvasX - centerX) / 50,
            y: (centerY - canvasY) / 50
        };
    },
    
    scaleHelpers: {
        getFixedPoint: function(corner, center, width, height) {
            const halfW = width / 2;
            const halfH = height / 2;
            
            const fixedPoints = {
                'topLeft': { x: center.x + halfW, y: center.y - halfH },
                'topRight': { x: center.x - halfW, y: center.y - halfH },
                'bottomRight': { x: center.x - halfW, y: center.y + halfH },
                'bottomLeft': { x: center.x + halfW, y: center.y + halfH }
            };
            
            return fixedPoints[corner];
        },
        
        getNewCornerPosition: function(corner, fixedPoint, newWidth, newHeight) {
            const positions = {
                'topLeft': { x: fixedPoint.x - newWidth, y: fixedPoint.y + newHeight },
                'topRight': { x: fixedPoint.x + newWidth, y: fixedPoint.y + newHeight },
                'bottomRight': { x: fixedPoint.x + newWidth, y: fixedPoint.y - newHeight },
                'bottomLeft': { x: fixedPoint.x - newWidth, y: fixedPoint.y - newHeight }
            };
            
            return positions[corner];
        },
        
        maintainAspectRatio: function(newWidth, newHeight, originalWidth, originalHeight) {
            const originalRatio = originalWidth / originalHeight;
            const scaleW = newWidth / originalWidth;
            const scaleH = newHeight / originalHeight;
            const scale = Math.max(scaleW, scaleH);
            
            return {
                width: originalWidth * scale,
                height: originalHeight * scale,
                scale: scale
            };
        }
    }
};

// 注册插件函数
global.registerShape = function(config) {
    ManimEditor.shapeRegistry[config.type] = {
        type: config.type,
        name: config.name || config.type,
        icon: config.icon || '■',
        version: config.version || '1.0.0',
        createDefault: config.createDefault,
        render: config.render,
        toManim: config.toManim,
        hitTest: config.hitTest,
        getBounds: config.getBounds,
        handleScale: config.handleScale,
        handleMove: config.handleMove,
        updateWhileDrawing: config.updateWhileDrawing,
        getControlPoints: config.getControlPoints,
        updateControlPoint: config.updateControlPoint,
        properties: config.properties || [],
        capabilities: config.capabilities || {},
        drawMode: config.drawMode || 'drag',
        toJSON: config.toJSON,
        fromJSON: config.fromJSON
    };
};

// 工具函数（模拟）
global.sanitizeVariableName = function(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
};

global.hexToManimColor = function(hex) {
    return `"${hex}"`;
};

global.formatNumber = function(num, precision = 2) {
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(precision).replace(/\.?0+$/, '');
};

// 加载所有插件
function loadPlugins() {
    const pluginsDir = path.join(__dirname, '../js/plugins');
    const pluginFiles = [
        'rectangle.js',
        'square.js',
        'arrow.js',
        'line.js',
        'curve.js',
        'coordinateSystem.js'
    ];
    
    pluginFiles.forEach(file => {
        const filePath = path.join(pluginsDir, file);
        try {
            const code = fs.readFileSync(filePath, 'utf8');
            eval(code);
            log(`✓ 加载插件: ${file}`, 'green');
        } catch (err) {
            log(`✗ 加载失败: ${file} - ${err.message}`, 'red');
        }
    });
}

/**
 * ═══════════════════════════════════════════
 * 测试：Rectangle插件
 * ═══════════════════════════════════════════
 */
function testRectangle() {
    log('\n' + '═'.repeat(60), 'cyan');
    log('测试 Rectangle 插件', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    const plugin = ManimEditor.shapeRegistry['rectangle'];
    if (!plugin) {
        log('✗ rectangle插件未注册', 'red');
        return;
    }
    
    // 测试1：创建默认实例
    log('\n[测试1] createDefault', 'yellow');
    const element = plugin.createDefault(0, 0);
    assert(element.type === 'rectangle', 'type应该是rectangle');
    assert(element.props.width === 2, 'default width应该是2');
    assert(element.props.height === 1, 'default height应该是1');
    
    // 测试2：getBounds
    log('\n[测试2] getBounds', 'yellow');
    element.props.x = 0;
    element.props.y = 0;
    element.props.width = 2;
    element.props.height = 1;
    
    const bounds = plugin.getBounds(element, ManimEditor);
    assert(bounds !== null, 'bounds不应该为null');
    
    const expectedCenterX = 400;  // canvas width / 2
    const expectedCenterY = 300;  // canvas height / 2
    const expectedW = 2 * 50;  // 100px
    const expectedH = 1 * 50;  // 50px
    
    assertEquals(bounds.x, expectedCenterX - expectedW/2, 'bounds.x');
    assertEquals(bounds.y, expectedCenterY - expectedH/2, 'bounds.y');
    assertEquals(bounds.w, expectedW, 'bounds.w');
    assertEquals(bounds.h, expectedH, 'bounds.h');
    
    // 测试3：缩放 - 拖动bottomRight，固定topLeft
    log('\n[测试3] handleScale - 拖动bottomRight', 'yellow');
    
    // 原始矩形：中心(0,0)，宽2，高1
    const originalProps = {
        x: 0,
        y: 0,
        width: 2,
        height: 1
    };
    
    // 原始的四个角（Manim坐标）：
    const originalTopLeft = { x: -1, y: 0.5 };
    const originalBottomRight = { x: 1, y: -0.5 };
    
    // 固定点应该是topLeft
    const fixedPoint = { x: originalTopLeft.x, y: originalTopLeft.y };
    
    // 拖动bottomRight到(2, -1)
    const currentPoint = { x: 2, y: -1 };
    
    const scaleInfo = {
        corner: 'bottomRight',
        fixedPoint: fixedPoint,
        currentPoint: currentPoint,
        isShift: false,
        originalProps: originalProps
    };
    
    const newProps = plugin.handleScale(element, scaleInfo, ManimEditor);
    
    // 验证新尺寸
    const expectedNewWidth = Math.abs(currentPoint.x - fixedPoint.x);  // |2 - (-1)| = 3
    const expectedNewHeight = Math.abs(currentPoint.y - fixedPoint.y);  // |-1 - 0.5| = 1.5
    
    assertEquals(newProps.width, expectedNewWidth, '新width');
    assertEquals(newProps.height, expectedNewHeight, '新height');
    
    // 验证新中心
    const expectedNewCenterX = (fixedPoint.x + currentPoint.x) / 2;  // (-1 + 2) / 2 = 0.5
    const expectedNewCenterY = (fixedPoint.y + currentPoint.y) / 2;  // (0.5 + (-1)) / 2 = -0.25
    
    assertEquals(newProps.x, expectedNewCenterX, '新中心x');
    assertEquals(newProps.y, expectedNewCenterY, '新中心y');
    
    // 验证固定点是否真的固定（最关键！）
    const newTopLeftX = newProps.x - newProps.width / 2;
    const newTopLeftY = newProps.y + newProps.height / 2;
    
    assertNotChanged(originalTopLeft.x, newTopLeftX, '固定点x不应该变');
    assertNotChanged(originalTopLeft.y, newTopLeftY, '固定点y不应该变');
    
    // 测试4：缩放向内（缩小）
    log('\n[测试4] handleScale - 缩小（向内拖）', 'yellow');
    
    const shrinkPoint = { x: 0.5, y: -0.25 };  // 向内拖
    const shrinkInfo = {
        corner: 'bottomRight',
        fixedPoint: fixedPoint,
        currentPoint: shrinkPoint,
        isShift: false,
        originalProps: originalProps
    };
    
    const shrunkProps = plugin.handleScale(element, shrinkInfo, ManimEditor);
    
    const shrunkWidth = Math.abs(shrinkPoint.x - fixedPoint.x);  // |0.5 - (-1)| = 1.5
    const shrunkHeight = Math.abs(shrinkPoint.y - fixedPoint.y);  // |-0.25 - 0.5| = 0.75
    
    assertEquals(shrunkProps.width, shrunkWidth, '缩小后的width');
    assertEquals(shrunkProps.height, shrunkHeight, '缩小后的height');
    assert(shrunkProps.width < originalProps.width, 'width应该变小');
    assert(shrunkProps.height < originalProps.height, 'height应该变小');
    
    // 验证固定点仍然固定
    const shrunkTopLeftX = shrunkProps.x - shrunkProps.width / 2;
    const shrunkTopLeftY = shrunkProps.y + shrunkProps.height / 2;
    assertNotChanged(originalTopLeft.x, shrunkTopLeftX, '缩小时固定点x');
    assertNotChanged(originalTopLeft.y, shrunkTopLeftY, '缩小时固定点y');
    
    // 测试5：四个角都测试
    log('\n[测试5] handleScale - 测试所有四个角', 'yellow');
    
    const corners = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
    const fixedCornerMap = {
        'topLeft': 'bottomRight',
        'topRight': 'bottomLeft',
        'bottomRight': 'topLeft',
        'bottomLeft': 'topRight'
    };
    
    corners.forEach(corner => {
        const fixedCornerName = fixedCornerMap[corner];
        const bounds = plugin.getBounds({ props: originalProps }, ManimEditor);
        
        // 计算固定点（对角）
        const fixedCorners = {
            'topLeft': ManimEditor.canvasToManim(bounds.x + bounds.w, bounds.y + bounds.h),
            'topRight': ManimEditor.canvasToManim(bounds.x, bounds.y + bounds.h),
            'bottomRight': ManimEditor.canvasToManim(bounds.x, bounds.y),
            'bottomLeft': ManimEditor.canvasToManim(bounds.x + bounds.w, bounds.y)
        };
        
        const fixed = fixedCorners[corner];
        
        // 拖动到更远的位置（放大）
        const dragPoint = { x: fixed.x * -1.5, y: fixed.y * -1.5 };
        
        const info = {
            corner: corner,
            fixedPoint: fixed,
            currentPoint: dragPoint,
            isShift: false,
            originalProps: originalProps
        };
        
        const result = plugin.handleScale(element, info, ManimEditor);
        
        // 重新计算固定角的坐标
        const getCorner = (props, cornerName) => {
            const w = props.width / 2;
            const h = props.height / 2;
            const corners = {
                'topLeft': { x: props.x - w, y: props.y + h },
                'topRight': { x: props.x + w, y: props.y + h },
                'bottomRight': { x: props.x + w, y: props.y - h },
                'bottomLeft': { x: props.x - w, y: props.y - h }
            };
            return corners[cornerName];
        };
        
        const newFixed = getCorner(result, fixedCornerName);
        const oldFixed = getCorner(originalProps, fixedCornerName);
        
        assertNotChanged(oldFixed.x, newFixed.x, `拖动${corner}时${fixedCornerName}的x`);
        assertNotChanged(oldFixed.y, newFixed.y, `拖动${corner}时${fixedCornerName}的y`);
    });
    
    // 测试6：等比例缩放（Shift）
    log('\n[测试6] handleScale - Shift键等比例', 'yellow');
    
    const shiftInfo = {
        corner: 'bottomRight',
        fixedPoint: { x: -1, y: 0.5 },
        currentPoint: { x: 3, y: -2 },  // 不等比例的拖动
        isShift: true,
        originalProps: originalProps
    };
    
    const shiftResult = plugin.handleScale(element, shiftInfo, ManimEditor);
    const ratio = shiftResult.width / shiftResult.height;
    const originalRatio = originalProps.width / originalProps.height;
    
    assertEquals(ratio, originalRatio, '等比例缩放后的宽高比', 0.01);
}

/**
 * ═══════════════════════════════════════════
 * 测试：Arrow插件（改进版，测试完整流程）
 * ═══════════════════════════════════════════
 */
function testArrow() {
    log('\n' + '═'.repeat(60), 'cyan');
    log('测试 Arrow 插件', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    const plugin = ManimEditor.shapeRegistry['arrow'];
    if (!plugin) {
        log('✗ arrow插件未注册', 'red');
        return;
    }
    
    // 测试1：创建
    log('\n[测试1] createDefault', 'yellow');
    const element = plugin.createDefault(0, 0);
    assert(element.type === 'arrow', 'type应该是arrow');
    assert(Array.isArray(element.props.start), 'start应该是数组');
    assert(Array.isArray(element.props.end), 'end应该是数组');
    
    // 测试2：getBounds的精确性（新增！）
    log('\n[测试2] getBounds精确性', 'yellow');
    
    const testProps = {
        start: [-2, -1, 0],
        end: [2, 1, 0]
    };
    
    const bounds = plugin.getBounds({ props: testProps }, ManimEditor);
    
    // 计算预期的bounds（无padding）
    const startCanvas = ManimEditor.manimToCanvas(-2, -1);
    const endCanvas = ManimEditor.manimToCanvas(2, 1);
    const expectedMinX = Math.min(startCanvas.x, endCanvas.x);
    const expectedMinY = Math.min(startCanvas.y, endCanvas.y);
    const expectedW = Math.abs(endCanvas.x - startCanvas.x);
    const expectedH = Math.abs(endCanvas.y - startCanvas.y);
    
    assertEquals(bounds.x, expectedMinX, 'bounds.x应该精确（无padding）');
    assertEquals(bounds.y, expectedMinY, 'bounds.y应该精确（无padding）');
    assertEquals(bounds.w, expectedW, 'bounds.w应该精确（无padding）');
    assertEquals(bounds.h, expectedH, 'bounds.h应该精确（无padding）');
    
    // 测试3：完整缩放流程（使用calculateFixedPoint）
    log('\n[测试3] 完整缩放流程（含calculateFixedPoint）', 'yellow');
    
    const originalProps = {
        start: [-2, -1, 0],
        end: [2, 1, 0]
    };
    
    // 模拟calculateFixedPoint的逻辑
    const tempElement = { type: 'arrow', props: originalProps };
    const calcBounds = plugin.getBounds(tempElement, ManimEditor);
    const allCorners = {
        topLeft: ManimEditor.canvasToManim(calcBounds.x, calcBounds.y),
        topRight: ManimEditor.canvasToManim(calcBounds.x + calcBounds.w, calcBounds.y),
        bottomLeft: ManimEditor.canvasToManim(calcBounds.x, calcBounds.y + calcBounds.h),
        bottomRight: ManimEditor.canvasToManim(calcBounds.x + calcBounds.w, calcBounds.y + calcBounds.h)
    };
    const fixedPoint = allCorners.topLeft;  // 拖动bottomRight，固定topLeft
    
    log(`  计算的fixedPoint: (${fixedPoint.x.toFixed(2)}, ${fixedPoint.y.toFixed(2)})`, 'blue');
    
    // 放大
    const enlargePoint = { x: 3, y: -2 };
    const enlargeInfo = {
        corner: 'bottomRight',
        fixedPoint: fixedPoint,
        currentPoint: enlargePoint,
        isShift: false,
        originalProps: originalProps
    };
    
    const enlargedProps = plugin.handleScale(tempElement, enlargeInfo, ManimEditor);
    
    // 验证固定点（topLeft）
    const newTopLeft = {
        x: Math.min(enlargedProps.start[0], enlargedProps.end[0]),
        y: Math.max(enlargedProps.start[1], enlargedProps.end[1])
    };
    
    assertNotChanged(fixedPoint.x, newTopLeft.x, '放大时topLeft.x');
    assertNotChanged(fixedPoint.y, newTopLeft.y, '放大时topLeft.y');
    
    // 测试4：缩小操作（关键！）
    log('\n[测试4] 缩小操作（测试padding影响）', 'yellow');
    
    const shrinkPoint = { x: 1, y: -0.5 };  // 向内拖，缩小
    const shrinkInfo = {
        corner: 'bottomRight',
        fixedPoint: fixedPoint,  // 使用同样的固定点
        currentPoint: shrinkPoint,
        isShift: false,
        originalProps: originalProps
    };
    
    const shrunkProps = plugin.handleScale(tempElement, shrinkInfo, ManimEditor);
    
    // 验证缩小后固定点仍然固定
    const shrunkTopLeft = {
        x: Math.min(shrunkProps.start[0], shrunkProps.end[0]),
        y: Math.max(shrunkProps.start[1], shrunkProps.end[1])
    };
    
    assertNotChanged(fixedPoint.x, shrunkTopLeft.x, '缩小时topLeft.x');
    assertNotChanged(fixedPoint.y, shrunkTopLeft.y, '缩小时topLeft.y');
    
    const shrunkLength = Math.sqrt(
        Math.pow(shrunkProps.end[0] - shrunkProps.start[0], 2) +
        Math.pow(shrunkProps.end[1] - shrunkProps.start[1], 2)
    );
    const originalLength = Math.sqrt(
        Math.pow(originalProps.end[0] - originalProps.start[0], 2) +
        Math.pow(originalProps.end[1] - originalProps.start[1], 2)
    );
    
    assert(shrunkLength < originalLength, '缩小后长度应该变短');
    log(`  原始长度: ${originalLength.toFixed(2)}, 缩小后: ${shrunkLength.toFixed(2)}`, 'blue');
}

/**
 * ═══════════════════════════════════════════
 * 测试：Curve插件
 * ═══════════════════════════════════════════
 */
function testCurve() {
    log('\n' + '═'.repeat(60), 'cyan');
    log('测试 Curve 插件', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    const plugin = ManimEditor.shapeRegistry['curve'];
    if (!plugin) {
        log('✗ curve插件未注册', 'red');
        return;
    }
    
    // 测试：缩放曲线
    log('\n[测试] handleScale - 缩放曲线', 'yellow');
    
    const originalProps = {
        points: [
            [-2, -1, 0],  // P0
            [-1, 1, 0],   // P1
            [1, -1, 0],   // P2
            [2, 1, 0]     // P3
        ]
    };
    
    // 计算原始包围盒
    const xs = originalProps.points.map(p => p[0]);
    const ys = originalProps.points.map(p => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const originalWidth = maxX - minX;  // 4
    const originalHeight = maxY - minY;  // 2
    
    const bounds = plugin.getBounds({ props: originalProps }, ManimEditor);
    const fixedPoint = ManimEditor.canvasToManim(bounds.x, bounds.y);  // topLeft
    
    // 放大2倍
    const enlargePoint = { 
        x: fixedPoint.x + originalWidth * 2,
        y: fixedPoint.y - originalHeight * 2
    };
    
    const scaleInfo = {
        corner: 'bottomRight',
        fixedPoint: fixedPoint,
        currentPoint: enlargePoint,
        isShift: false,
        originalProps: originalProps
    };
    
    const newProps = plugin.handleScale({ props: originalProps }, scaleInfo, ManimEditor);
    
    // 验证所有控制点都缩放了
    const newXs = newProps.points.map(p => p[0]);
    const newYs = newProps.points.map(p => p[1]);
    const newWidth = Math.max(...newXs) - Math.min(...newXs);
    const newHeight = Math.max(...newYs) - Math.min(...newYs);
    
    assertEquals(newWidth / originalWidth, 2, '宽度应该是原来的2倍', 0.1);
    assertEquals(newHeight / originalHeight, 2, '高度应该是原来的2倍', 0.1);
    
    log(`  原始尺寸: ${originalWidth} × ${originalHeight}`, 'blue');
    log(`  新尺寸: ${newWidth.toFixed(2)} × ${newHeight.toFixed(2)}`, 'blue');
}

/**
 * ═══════════════════════════════════════════
 * 测试：移动功能
 * ═══════════════════════════════════════════
 */
function testMove() {
    log('\n' + '═'.repeat(60), 'cyan');
    log('测试 移动功能', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    // 测试矩形移动
    log('\n[测试] Rectangle.handleMove', 'yellow');
    const rectPlugin = ManimEditor.shapeRegistry['rectangle'];
    
    const element = {
        props: { x: 0, y: 0, width: 2, height: 1 }
    };
    
    const moveInfo = {
        currentPoint: { x: 1, y: 2 },
        offset: { x: 0.5, y: 0.5 }
    };
    
    const newProps = rectPlugin.handleMove(element, moveInfo, ManimEditor);
    
    assertEquals(newProps.x, 0.5, '移动后x坐标');
    assertEquals(newProps.y, 1.5, '移动后y坐标');
    
    // 测试箭头移动
    log('\n[测试] Arrow.handleMove', 'yellow');
    const arrowPlugin = ManimEditor.shapeRegistry['arrow'];
    
    const arrowElement = {
        props: {
            start: [-1, -1, 0],
            end: [1, 1, 0]
        }
    };
    
    const arrowMoveInfo = {
        deltaX: 2,
        deltaY: 3
    };
    
    const arrowNewProps = arrowPlugin.handleMove(arrowElement, arrowMoveInfo, ManimEditor);
    
    assertEquals(arrowNewProps.start[0], 1, '起点x移动');
    assertEquals(arrowNewProps.start[1], 2, '起点y移动');
    assertEquals(arrowNewProps.end[0], 3, '终点x移动');
    assertEquals(arrowNewProps.end[1], 4, '终点y移动');
}

/**
 * ═══════════════════════════════════════════
 * 主测试函数
 * ═══════════════════════════════════════════
 */
function runTests() {
    log('\n' + '═'.repeat(60), 'cyan');
    log('Manim IDE 插件功能测试', 'cyan');
    log('═'.repeat(60), 'cyan');
    
    // 加载插件
    log('\n加载插件...', 'yellow');
    loadPlugins();
    
    // 运行测试
    testRectangle();
    testArrow();
    testCurve();
    testMove();
    
    // 总结
    log('\n' + '═'.repeat(60), 'cyan');
    log('测试总结', 'cyan');
    log('═'.repeat(60), 'cyan');
    log(`总计: ${totalTests} 个测试`);
    log(`通过: ${passedTests} 个`, 'green');
    log(`失败: ${failedTests} 个`, failedTests > 0 ? 'red' : 'green');
    log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 
        failedTests === 0 ? 'green' : 'yellow');
    
    // 返回退出码
    process.exit(failedTests > 0 ? 1 : 0);
}

// 运行测试
runTests();


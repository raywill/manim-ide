/**
 * Manim Visual Editor - 主应用入口
 * 初始化整个应用
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Manim Visual Editor...');
    
    // 检查必要的函数是否已加载
    if (typeof initCanvas !== 'function') {
        console.error('core.js 未正确加载');
        return;
    }
    if (typeof initUI !== 'function') {
        console.error('ui.js 未正确加载');
        return;
    }
    
    // 初始化画布
    initCanvas();
    
    // 初始化UI
    initUI();
    
    // 尝试从localStorage加载之前的场景
    loadFromLocalStorage();
    
    // 初始化完成
    console.log('Manim Visual Editor initialized successfully!');
    console.log('Registered shapes:', Object.keys(ManimEditor.shapeRegistry));
    
    // 显示欢迎信息
    showWelcomeMessage();

    if (typeof window.initializeShareViewer === 'function') {
        window.initializeShareViewer();
    }
});

/**
 * 显示欢迎信息
 */
function showWelcomeMessage() {
    if (ManimEditor.elements.length === 0) {
        console.log('%c欢迎使用 Manim Visual Editor!', 'color: #3498db; font-size: 16px; font-weight: bold;');
        console.log('%c开始使用:', 'color: #2c3e50; font-size: 14px; font-weight: bold;');
        console.log('1. 从左侧工具箱选择形状');
        console.log('2. 在画布上拖拽绘制形状');
        console.log('3. 双击形状编辑属性');
        console.log('4. 点击"导出Manim代码"获取Python代码');
        console.log('\n%c快捷键:', 'color: #2c3e50; font-size: 14px; font-weight: bold;');
        console.log('Ctrl/Cmd + Z: 撤销');
        console.log('Ctrl/Cmd + Y: 重做');
        console.log('Delete: 删除选中元素');
        console.log('Esc: 切换到选择模式');
    }
}

/**
 * 处理未捕获的错误
 */
window.addEventListener('error', function(event) {
    console.error('Application error:', event.error);
});

/**
 * 在页面卸载前保存数据
 */
window.addEventListener('beforeunload', function() {
    saveToLocalStorage();
});

/**
 * 处理窗口大小变化
 */
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        resizeCanvas();
    }, 250);
});

// 暴露全局API供调试使用
window.ManimEditor = ManimEditor;
window.exportManimCode = generateManimCode;
window.clearScene = clearScene;

// 切换响应区域调试显示
window.toggleHandleDebug = function() {
    ManimEditor.showHandleDebug = !ManimEditor.showHandleDebug;
    render();
    console.log(`控制点响应区域显示: ${ManimEditor.showHandleDebug ? '开启' : '关闭'}`);
};

// 缩放调试工具
window.debugScale = {
    enabled: false,
    history: [],
    
    enable: function() {
        this.enabled = true;
        this.history = [];
        console.log('%c缩放调试已启用', 'color: #2ecc71; font-weight: bold;');
    },
    
    disable: function() {
        this.enabled = false;
        console.log('%c缩放调试已禁用', 'color: #95a5a6;');
    },
    
    log: function(event, data) {
        if (!this.enabled) return;
        
        this.history.push({ event, data, time: Date.now() });
        
        if (event === 'mousedown') {
            console.log('%c━━━ 开始新的拖动 ━━━', 'color: #3498db; font-weight: bold;');
            console.log('[mousedown] fixedPoint=', data.fixedPoint);
        } else if (event === 'mousemove') {
            console.log('[mousemove] fixedPoint=', data.fixedPoint, 'currentPoint=', data.currentPoint);
        } else if (event === 'mouseup') {
            console.log('%c━━━ 拖动结束 ━━━', 'color: #3498db;');
            this.analyze();
        }
    },
    
    analyze: function() {
        const mousedowns = this.history.filter(h => h.event === 'mousedown');
        const mousemoves = this.history.filter(h => h.event === 'mousemove');
        
        if (mousedowns.length > 1) {
            console.warn('%c⚠️ 一次拖动中有多次mousedown！', 'color: #e74c3c; font-weight: bold;');
        }
        
        if (mousemoves.length > 0) {
            const firstFixed = mousedowns[0]?.data.fixedPoint;
            let moved = false;
            
            mousemoves.forEach((h, i) => {
                const diff = {
                    x: Math.abs(h.data.fixedPoint.x - firstFixed.x),
                    y: Math.abs(h.data.fixedPoint.y - firstFixed.y)
                };
                
                if (diff.x > 0.001 || diff.y > 0.001) {
                    moved = true;
                    console.error(`%c✗ 第${i+1}次mousemove: fixedPoint移动了 Δx=${diff.x.toFixed(4)}, Δy=${diff.y.toFixed(4)}`, 'color: #e74c3c;');
                }
            });
            
            if (!moved) {
                console.log('%c✓ fixedPoint在整个拖动过程中保持不变', 'color: #2ecc71; font-weight: bold;');
            }
        }
    }
};

console.log('%cDebug commands available:', 'color: #95a5a6; font-size: 12px;');
console.log('- ManimEditor: 访问编辑器状态');
console.log('- exportManimCode(): 生成Manim代码');
console.log('- clearScene(): 清空场景');
console.log('- toggleHandleDebug(): 切换控制点响应区域显示（默认开启）');
console.log('- debugScale.enable(): 启用缩放调试（诊断固定点问题）');


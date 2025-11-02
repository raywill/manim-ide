/**
 * Manim Visual Editor - 主应用入口
 * 初始化整个应用
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Manim Visual Editor...');
    
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

console.log('%cDebug commands available:', 'color: #95a5a6; font-size: 12px;');
console.log('- ManimEditor: 访问编辑器状态');
console.log('- exportManimCode(): 生成Manim代码');
console.log('- clearScene(): 清空场景');


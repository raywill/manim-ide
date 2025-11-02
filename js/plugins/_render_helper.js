/**
 * 插件渲染辅助函数
 * 
 * 在每个插件的render()开头调用
 */

// 设置渲染透明度（考虑hidden属性）
function setRenderOpacity(ctx, element) {
    const props = element.props;
    
    if (props.hidden) {
        // hidden元素：使用0.1透明度（便于找回）
        ctx.globalAlpha = 0.1;
    } else {
        // 正常元素：使用props.opacity
        ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
    }
}

// 在window上暴露，供插件使用
window.setRenderOpacity = setRenderOpacity;

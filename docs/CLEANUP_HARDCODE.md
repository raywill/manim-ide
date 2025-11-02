# 清除框架硬编码计划

## 发现的硬编码

### ui.js（7处）
1. Line 234: `if (clickedElement.type === 'arrow' || clickedElement.type === 'line')`
2. Line 242: `else if (clickedElement.type === 'curve')`
3. Line 250: `else if (clickedElement.type === 'parabola' || clickedElement.type === 'sine')`
4. Line 298: 同上（重复代码）
5. Line 306: 同上
6. Line 314: 同上
7. Line 403: `if (element.type === 'curve' && element.props.points)`

## 解决方案

### 方案1：添加getMoveAnchor()插件方法

```javascript
// 在插件中定义
getMoveAnchor: function(element) {
    // 返回移动的锚点（用于计算offset）
    return { x: element.props.x, y: element.props.y };
}

// arrow/line插件
getMoveAnchor: function(element) {
    // 不需要锚点，使用增量移动
    return null;
}

// parabola插件
getMoveAnchor: function(element) {
    return {
        x: element.props.vertex_x,
        y: element.props.vertex_y
    };
}
```

### 方案2：统一移动接口

所有插件使用相同的moveInfo格式：
```javascript
moveInfo = {
    currentPoint: {x, y},
    startPoint: {x, y},  // mousedown时的点
    deltaX, deltaY       // 增量
}
```

插件自己决定用哪个。

## 建议

由于时间和token限制，建议：
1. 先记录这些硬编码
2. 在下一个会话中完整清理
3. 或者您告诉我是否立即清理


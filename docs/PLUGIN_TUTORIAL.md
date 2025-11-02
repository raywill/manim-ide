# 插件开发教程

## 🎓 从零开始创建一个Circle插件

本教程将带您一步步创建一个完整的圆形（Circle）插件。

---
## 📋 AI 编程

推荐使用 AI 编程，用最简单的提示词就可以完成一个插件。根目录下已经配置好 .cursorrules，你只需要简单描述你的需求，并给出一些实现要点即可。例如：


圆:
```
我需要实现一个圆，点击画布的位置为圆心，绘制过程中可以调整圆的大小，调整大小时圆心为不动点。
```
更复杂一些的，比如夹角:
```
我需要实现一个夹角，采用三点法来定义夹角：第一条边的顶点A，公共顶点B，第三条边的顶点C。夹角定义好后，还需要绘制一个小弧形以及 theta 符号来标记夹角。夹角的大小始终小于180度。通过调整A、B、C，来调整夹角的大小。
```

提示词要点：描述清楚交互方式，一些特殊的角度、方向计算方式，是否需要添加控制点（比如贝塞尔曲线，弧线等，允许后期调整）。

---

## 📋 需求定义

### 圆形图形的特征
- **绘制方式：** 从中心拖动到边缘（确定半径）
- **属性：** 中心点(x, y)、半径(radius)、颜色、透明度
- **缩放：** 改变半径，中心可能移动（取决于固定点）
- **移动：** 移动中心点
- **导出：** `Circle(radius=r).move_to([x, y, 0])`

---

## 步骤1：创建插件文件

```bash
touch js/plugins/circle.js
```

---

## 步骤2：基础框架

```javascript
/**
 * Circle 插件 - 圆形
 */

registerShape({
    type: 'circle',
    name: '圆形',
    icon: '⭕',
    version: '1.0.0',
    
    // 后续步骤会逐步实现各个方法
});
```

---

## 步骤3：实现createDefault

创建默认的圆形实例。

```javascript
createDefault: function(x, y) {
    return {
        type: 'circle',
        name: 'circle_' + (ManimEditor.elements.length + 1),
        props: {
            x: x || 0,
            y: y || 0,
            radius: 1,            // 默认半径
            color: '#3498db',     // 蓝色
            opacity: 1,
            hidden: false
        }
    };
}
```

**要点：**
- 使用提供的x, y作为中心
- 设置合理的默认值
- 包含hidden属性（用于隐藏/显示）

---

## 步骤4：实现render

在Canvas上绘制圆形。

```javascript
render: function(ctx, element, editor) {
    const props = element.props;
    
    // 1. 坐标转换：Manim → Canvas
    const pos = editor.manimToCanvas(props.x, props.y);
    const radius = (props.radius || 1) * 50;  // Manim单位 → 像素
    
    // 2. 设置样式
    ctx.fillStyle = props.color || '#3498db';
    ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    
    // 3. 绘制圆形
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 4. 绘制中心点（可选，用于调试）
    ctx.fillStyle = '#e74c3c';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
    ctx.fill();
}
```

**要点：**
- 始终使用 `editor.manimToCanvas()` 转换坐标
- Manim单位 → 像素：通常乘以50
- 设置globalAlpha处理透明度
- 绘制中心点有助于调试

---

## 步骤5：实现hitTest

检测点击是否在圆形上。

```javascript
hitTest: function(element, manimX, manimY, editor) {
    const props = element.props;
    
    // 计算点到圆心的距离
    const dx = manimX - props.x;
    const dy = manimY - props.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 判断是否在圆内
    return distance <= props.radius;
}
```

**要点：**
- 参数是Manim坐标，直接与props比较
- 圆形：检查距离是否小于半径
- 可以加一点容差：`distance <= props.radius + 0.1`

---

## 步骤6：实现getBounds

计算圆形的边界框。

```javascript
getBounds: function(element, editor) {
    const props = element.props;
    const pos = editor.manimToCanvas(props.x, props.y);
    const radius = (props.radius || 1) * 50;  // 像素
    
    // 边界框：正方形，边长 = 直径
    return {
        x: pos.x - radius,
        y: pos.y - radius,
        w: radius * 2,
        h: radius * 2
    };
}
```

**要点：**
- 返回Canvas坐标（像素）
- x, y是左上角坐标
- 圆形的边界框是正方形

---

## 步骤7：实现updateWhileDrawing

拖动绘制时更新圆形。

```javascript
updateWhileDrawing: function(element, start, current, editor) {
    // 中心保持在起点
    element.props.x = start.manimX;
    element.props.y = start.manimY;
    
    // 半径 = 起点到当前点的距离
    const dx = current.manimX - start.manimX;
    const dy = current.manimY - start.manimY;
    element.props.radius = Math.sqrt(dx * dx + dy * dy);
}
```

**要点：**
- 从中心拖动半径（常见绘制方式）
- 也可以从边缘拖动直径（取决于设计）

---

## 步骤8：实现handleScale

处理缩放操作。

```javascript
handleScale: function(element, scaleInfo, editor) {
    const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
    
    // 圆形缩放：改变半径
    // 由于是圆形，不区分宽高，总是等比例
    
    const newWidth = Math.abs(currentPoint.x - fixedPoint.x);
    const newHeight = Math.abs(currentPoint.y - fixedPoint.y);
    
    // 取较大值作为新半径（保持圆形）
    const newRadius = Math.max(newWidth, newHeight);
    
    // 计算新中心（对角中点）
    const helpers = editor.scaleHelpers;
    const newCorner = helpers.getNewCornerPosition(corner, fixedPoint, newRadius, newRadius);
    const newCenterX = (fixedPoint.x + newCorner.x) / 2;
    const newCenterY = (fixedPoint.y + newCorner.y) / 2;
    
    return {
        radius: Math.max(0.1, newRadius),
        x: newCenterX,
        y: newCenterY
    };
}
```

**要点：**
- 圆形总是等比例（忽略isShift）
- 使用辅助函数计算新角位置
- 新中心 = (固定点 + 新角) / 2

---

## 步骤9：实现handleMove

处理拖动移动。

```javascript
handleMove: function(element, moveInfo, editor) {
    // 圆形：简单移动中心点
    return {
        x: moveInfo.currentPoint.x - moveInfo.offset.x,
        y: moveInfo.currentPoint.y - moveInfo.offset.y
    };
}
```

**要点：**
- 简单图形：直接移动中心
- 复杂图形：可能需要移动多个点

---

## 步骤10：实现toManim

生成Manim代码。

```javascript
toManim: function(element) {
    const props = element.props;
    const varName = sanitizeVariableName(element.name);
    const radius = formatNumber(props.radius || 1);
    const color = hexToManimColor(props.color || '#3498db');
    const x = formatNumber(props.x);
    const y = formatNumber(props.y);
    
    let code = `${varName} = Circle(radius=${radius}, color=${color})`;
    
    if (props.x !== 0 || props.y !== 0) {
        code += `.move_to([${x}, ${y}, 0])`;
    }
    
    if (props.opacity !== undefined && props.opacity !== 1) {
        code += `.set_opacity(${formatNumber(props.opacity)})`;
    }
    
    return code;
}
```

**要点：**
- 使用全局辅助函数
- 链式调用
- 只在必要时添加move_to

---

## 步骤11：定义properties

配置属性面板。

```javascript
properties: [
    { key: 'x', label: 'X坐标', type: 'number', step: 0.1 },
    { key: 'y', label: 'Y坐标', type: 'number', step: 0.1 },
    { key: 'radius', label: '半径', type: 'number', step: 0.1, min: 0.1 },
    { key: 'color', label: '颜色', type: 'color' },
    { key: 'opacity', label: '不透明度', type: 'number', step: 0.1, min: 0, max: 1 }
]
```

---

## 步骤12：引入插件

在 `index.html` 中添加：

```html
<!-- 形状插件 -->
<script src="js/plugins/square.js"></script>
<script src="js/plugins/rectangle.js"></script>
<script src="js/plugins/arrow.js"></script>
<script src="js/plugins/line.js"></script>
<script src="js/plugins/curve.js"></script>
<script src="js/plugins/coordinateSystem.js"></script>
<script src="js/plugins/circle.js"></script>  <!-- 新增 -->
```

---

## 步骤13：测试

### 测试清单

```
基础功能：
- [ ] 工具箱显示"⭕ 圆形"按钮
- [ ] 点击按钮进入绘制模式
- [ ] 拖动绘制圆形
- [ ] 圆形正确显示

交互功能：
- [ ] 点击选中圆形
- [ ] 拖动移动圆形
- [ ] 拖动四角缩放圆形
- [ ] 对角保持固定
- [ ] Shift键（圆形总是等比例）

编辑功能：
- [ ] 双击打开属性面板
- [ ] 修改半径，实时更新
- [ ] 修改颜色，实时更新

导出功能：
- [ ] 导出Manim代码正确
- [ ] 在Manim中渲染一致
- [ ] 导出/导入JSON正常
```

---

## 完整代码

### circle.js（完整版）

```javascript
/**
 * Circle 插件 - 圆形
 */

registerShape({
    type: 'circle',
    name: '圆形',
    icon: '⭕',
    version: '1.0.0',
    drawMode: 'drag',
    
    capabilities: {
        movable: true,
        scalable: true,
        rotatable: false,
        editable: true,
        deletable: true,
        hasControlPoints: false
    },
    
    createDefault: function(x, y) {
        return {
            type: 'circle',
            name: 'circle_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,
                y: y || 0,
                radius: 1,
                color: '#3498db',
                opacity: 1,
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const radius = (props.radius || 1) * 50;
        
        ctx.fillStyle = props.color || '#3498db';
        ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 中心点
        ctx.fillStyle = '#e74c3c';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        element.props.x = start.manimX;
        element.props.y = start.manimY;
        
        const dx = current.manimX - start.manimX;
        const dy = current.manimY - start.manimY;
        element.props.radius = Math.sqrt(dx * dx + dy * dy);
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        const props = element.props;
        const dx = manimX - props.x;
        const dy = manimY - props.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= props.radius;
    },
    
    getBounds: function(element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const radius = (props.radius || 1) * 50;
        
        return {
            x: pos.x - radius,
            y: pos.y - radius,
            w: radius * 2,
            h: radius * 2
        };
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, originalProps } = scaleInfo;
        const helpers = editor.scaleHelpers;
        
        const newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        const newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        const newRadius = Math.max(newWidth, newHeight);
        
        const newCorner = helpers.getNewCornerPosition(corner, fixedPoint, newRadius, newRadius);
        const newCenterX = (fixedPoint.x + newCorner.x) / 2;
        const newCenterY = (fixedPoint.y + newCorner.y) / 2;
        
        return {
            radius: Math.max(0.1, newRadius),
            x: newCenterX,
            y: newCenterY
        };
    },
    
    handleMove: function(element, moveInfo, editor) {
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const radius = formatNumber(props.radius || 1);
        const color = hexToManimColor(props.color || '#3498db');
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        let code = `${varName} = Circle(radius=${radius}, color=${color})`;
        
        if (props.x !== 0 || props.y !== 0) {
            code += `.move_to([${x}, ${y}, 0])`;
        }
        
        if (props.opacity !== undefined && props.opacity !== 1) {
            code += `.set_opacity(${formatNumber(props.opacity)})`;
        }
        
        return code;
    },
    
    properties: [
        { key: 'x', label: 'X坐标', type: 'number', step: 0.1 },
        { key: 'y', label: 'Y坐标', type: 'number', step: 0.1 },
        { key: 'radius', label: '半径', type: 'number', step: 0.1, min: 0.1 },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'opacity', label: '不透明度', type: 'number', step: 0.1, min: 0, max: 1 }
    ]
});
```

---

## 步骤14：在index.html中引入

```html
<script src="js/plugins/circle.js"></script>
```

---

## 步骤15：测试

1. **刷新浏览器**
2. **验证工具箱**：应该看到"⭕ 圆形"按钮
3. **测试绘制**：点击按钮，拖动绘制
4. **测试移动**：选中圆形，拖动移动
5. **测试缩放**：拖动四角，观察半径变化
6. **测试属性**：双击，修改半径
7. **测试导出**：导出Manim代码，检查格式

---

## 🎓 进阶：添加控制点

### 需求：圆形带有半径控制点

可以拖动圆周上的一个点来调整半径。

### 实现getControlPoints

```javascript
getControlPoints: function(element, editor) {
    const props = element.props;
    
    // 在圆的右侧添加一个半径控制点
    return [
        {
            id: 'radiusHandle',
            x: props.x + props.radius,  // 右侧边缘
            y: props.y,
            type: 'handle',
            render: function(ctx, canvasX, canvasY, isSelected) {
                // 绘制正方形手柄
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#3498db';
                ctx.lineWidth = 2;
                ctx.fillRect(canvasX - 5, canvasY - 5, 10, 10);
                ctx.strokeRect(canvasX - 5, canvasY - 5, 10, 10);
            }
        }
    ];
}
```

### 实现updateControlPoint

```javascript
updateControlPoint: function(element, pointId, newX, newY, editor) {
    if (pointId === 'radiusHandle') {
        // 计算新半径：中心到新点的距离
        const dx = newX - element.props.x;
        const dy = newY - element.props.y;
        const newRadius = Math.sqrt(dx * dx + dy * dy);
        
        return { radius: Math.max(0.1, newRadius) };
    }
    
    return {};
}
```

### 启用控制点

```javascript
capabilities: {
    hasControlPoints: true,  // 声明有控制点
    // ...
}
```

---

## 📊 开发检查清单

### 必需实现
- [x] type
- [x] name
- [x] icon
- [x] createDefault
- [x] render
- [x] hitTest
- [x] toManim

### 推荐实现
- [x] getBounds
- [x] handleScale
- [x] handleMove
- [x] updateWhileDrawing
- [x] properties

### 可选实现
- [ ] getControlPoints
- [ ] updateControlPoint
- [ ] toJSON
- [ ] fromJSON
- [ ] capabilities
- [ ] drawMode

### 测试验证
- [ ] 绘制正常
- [ ] 移动正常
- [ ] 缩放正常
- [ ] 属性编辑正常
- [ ] Manim导出正确
- [ ] JSON序列化正常

---

## 💡 最佳实践

### 1. 使用辅助函数

```javascript
// 好：使用框架提供的辅助函数
const helpers = editor.scaleHelpers;
const newCorner = helpers.getNewCornerPosition(...);

// 不好：手动计算
const newCornerX = fixedPoint.x + newWidth; // 可能出错
```

### 2. 错误处理

```javascript
render: function(ctx, element, editor) {
    if (!element.props.radius || element.props.radius <= 0) {
        console.warn(`[circle] 无效的半径: ${element.props.radius}`);
        return;  // 不渲染
    }
    // ... 正常渲染
}
```

### 3. 性能优化

```javascript
// 缓存计算结果
const radius = (props.radius || 1) * 50;  // 只计算一次

// 避免在循环中调用manimToCanvas
```

### 4. 代码注释

```javascript
handleScale: function(element, scaleInfo, editor) {
    // 步骤1：计算新尺寸
    const newRadius = ...;
    
    // 步骤2：计算新中心
    const newCenter = ...;
    
    // 步骤3：返回新属性
    return { radius: newRadius, ... };
}
```

---

## 🧪 调试技巧

### 使用console.log

```javascript
render: function(ctx, element, editor) {
    console.log(`[circle] 渲染: ${element.name}, 半径=${element.props.radius}`);
    // ...
}
```

### 在控制台测试

```javascript
// 浏览器控制台
const plugin = ManimEditor.shapeRegistry['circle'];
console.log(plugin);

// 测试方法
const testElement = plugin.createDefault(0, 0);
console.log(testElement);
```

### 使用调试模式

```javascript
// 临时启用调试可视化
ManimEditor.showHandleDebug = true;
render();
```

---

## 📚 参考资料

- `PLUGIN_SYSTEM_DESIGN.md` - 插件系统设计
- `PLUGIN_API_REFERENCE.md` - 完整API参考
- `MIGRATION_GUIDE.md` - 迁移指南
- 现有插件代码：
  - `js/plugins/rectangle.js` - 简单图形示例
  - `js/plugins/curve.js` - 复杂图形示例

---

## 🎉 恭喜！

您已经创建了一个完整的插件！

**下一步：**
1. 创建更多插件（多边形、文本等）
2. 分享您的插件
3. 改进现有插件

---

**教程版本：** 1.0.0  
**适用于：** Manim IDE v1.1.0+  
**难度：** 中级


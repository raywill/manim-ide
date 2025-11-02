# 插件化迁移指南

## 🎯 迁移目标

将现有的硬编码逻辑从框架层（ui.js, core.js）迁移到插件层（plugins/）。

### 迁移前
```
ui.js (2000行)
├─ 通用逻辑 (500行)
└─ 硬编码逻辑 (1500行) ← 需要移除
    ├─ if (type === 'rectangle') { 缩放逻辑 }
    ├─ if (type === 'square') { 缩放逻辑 }
    ├─ if (type === 'curve') { 移动逻辑 }
    └─ if (type === 'arrow') { ... }
```

### 迁移后
```
ui.js (800行)
└─ 通用逻辑 (800行) ✓
    └─ plugin.handleScale(...) ← 调用插件

plugins/rectangle.js (200行)
└─ handleScale() { 矩形的缩放逻辑 }

plugins/square.js (180行)
└─ handleScale() { 正方形的缩放逻辑 }

... 其他插件
```

---

## 📋 迁移步骤

### 步骤1：添加辅助函数到core.js

在 `core.js` 的 `ManimEditor` 对象中添加：

```javascript
// core.js
const ManimEditor = {
    // ... 现有属性
    
    // 新增：缩放辅助函数
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
```

---

### 步骤2：重构ui.js的handleScaleDrag

**旧代码（删除）：**
```javascript
function handleScaleDrag(element, dragOffset, currentCoord) {
    // 300行的硬编码逻辑
    if (element.type === 'square') {
        // 50行
    } else if (element.type === 'rectangle') {
        // 60行
    } else if (element.type === 'arrow') {
        // 70行
    } ...
}
```

**新代码（替换）：**
```javascript
function handleScaleDrag(element, dragOffset, currentCoord) {
    const plugin = ManimEditor.shapeRegistry[element.type];
    
    if (!plugin) {
        console.error(`未找到插件: ${element.type}`);
        return;
    }
    
    // 准备缩放信息
    const scaleInfo = {
        corner: dragOffset.corner,
        fixedPoint: calculateFixedPoint(element, dragOffset.corner),
        currentPoint: currentCoord,
        isShift: window.isShiftPressed || false,
        originalProps: dragOffset.originalProps
    };
    
    // 调用插件的缩放处理
    if (plugin.handleScale) {
        const newProps = plugin.handleScale(element, scaleInfo, ManimEditor);
        updateElement(element.id, newProps);
    } else {
        // 默认缩放逻辑（基于getBounds）
        console.warn(`插件 ${element.type} 未实现 handleScale，使用默认缩放`);
        const newProps = defaultScaleHandler(element, scaleInfo, ManimEditor);
        updateElement(element.id, newProps);
    }
}

// 辅助函数：计算固定点
function calculateFixedPoint(element, corner) {
    const plugin = ManimEditor.shapeRegistry[element.type];
    
    if (plugin && plugin.getBounds) {
        const bounds = plugin.getBounds(element, ManimEditor);
        // 根据bounds和corner计算固定点
        // ... 通用逻辑
    }
    
    // 回退：基于元素的x, y, width, height
    // ...
}
```

---

### 步骤3：为现有插件添加新方法

以 `rectangle.js` 为例：

```javascript
// js/plugins/rectangle.js

registerShape({
    type: 'rectangle',
    name: '矩形',
    icon: '▭',
    
    // ═══ 已有方法 ═══
    createDefault: function(x, y) { ... },
    render: function(ctx, element, editor) { ... },
    hitTest: function(element, manimX, manimY, editor) { ... },
    toManim: function(element) { ... },
    properties: [ ... ],
    
    // ═══ 新增方法 ═══
    
    getBounds: function(element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const w = props.width * 50;
        const h = props.height * 50;
        return { x: pos.x - w/2, y: pos.y - h/2, w, h };
    },
    
    updateWhileDrawing: function(element, start, current, editor) {
        const width = Math.abs(current.manimX - start.manimX);
        const height = Math.abs(current.manimY - start.manimY);
        element.props.width = width;
        element.props.height = height;
        element.props.x = (current.manimX + start.manimX) / 2;
        element.props.y = (current.manimY + start.manimY) / 2;
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        const helpers = editor.scaleHelpers;
        
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        if (isShift) {
            const result = helpers.maintainAspectRatio(
                newWidth, newHeight,
                originalProps.width, originalProps.height
            );
            newWidth = result.width;
            newHeight = result.height;
        }
        
        const newCorner = helpers.getNewCornerPosition(corner, fixedPoint, newWidth, newHeight);
        const newCenterX = (fixedPoint.x + newCorner.x) / 2;
        const newCenterY = (fixedPoint.y + newCorner.y) / 2;
        
        return {
            width: Math.max(0.1, newWidth),
            height: Math.max(0.1, newHeight),
            x: newCenterX,
            y: newCenterY
        };
    },
    
    handleMove: function(element, moveInfo, editor) {
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    }
});
```

---

### 步骤4：重构core.js的getElementBounds

**旧代码（删除）：**
```javascript
// core.js
function getElementBounds(element) {
    if (element.type === 'rectangle') {
        // ...
    } else if (element.type === 'square') {
        // ...
    }
    // ... 很多硬编码
}
```

**新代码（替换）：**
```javascript
// core.js
function getElementBounds(element) {
    const plugin = ManimEditor.shapeRegistry[element.type];
    
    if (plugin && plugin.getBounds) {
        return plugin.getBounds(element, ManimEditor);
    }
    
    // 默认行为：返回null
    console.warn(`插件 ${element.type} 未实现 getBounds`);
    return null;
}
```

---

### 步骤5：重构ui.js的拖动移动逻辑

**旧代码（删除）：**
```javascript
// ui.js 中的拖动处理
if (dragElement.type === 'arrow' || dragElement.type === 'line') {
    // 30行逻辑
} else if (dragElement.type === 'curve') {
    // 30行逻辑
} else {
    // 默认逻辑
}
```

**新代码（替换）：**
```javascript
// ui.js 中的拖动处理
const plugin = ManimEditor.shapeRegistry[dragElement.type];

if (plugin && plugin.handleMove) {
    const moveInfo = {
        currentPoint: manimCoord,
        offset: dragOffset,
        deltaX: manimCoord.x - dragOffset.x,
        deltaY: manimCoord.y - dragOffset.y
    };
    
    const newProps = plugin.handleMove(dragElement, moveInfo, ManimEditor);
    updateElement(dragElement.id, newProps);
} else {
    // 默认移动逻辑
    updateElement(dragElement.id, {
        x: manimCoord.x - dragOffset.x,
        y: manimCoord.y - dragOffset.y
    });
}
```

---

## 🧪 迁移验证

### 验证清单

迁移每个方法后，验证：

- [ ] 工具箱是否正常显示
- [ ] 拖动绘制是否正常
- [ ] 点击选中是否正常
- [ ] 拖动移动是否正常
- [ ] 四角缩放是否正常
- [ ] Shift键等比例是否正常
- [ ] 控制点拖动是否正常（曲线）
- [ ] 属性面板是否正常
- [ ] 导出Manim代码是否正确
- [ ] 导出JSON是否正常
- [ ] 撤销/重做是否正常

### 测试用例

每个插件都应该通过以下测试：

```javascript
// 测试1：基本绘制
1. 点击工具
2. 拖动绘制
3. ✓ 图形正确显示

// 测试2：移动
1. 选中图形
2. 拖动移动
3. ✓ 位置正确更新

// 测试3：缩放
1. 选中图形
2. 拖动四个角
3. ✓ 每个角都能缩放
4. ✓ 对角保持固定
5. ✓ Shift键等比例

// 测试4：导出
1. 导出Manim代码
2. 在Manim中渲染
3. ✓ 结果一致

// 测试5：持久化
1. 创建图形
2. 刷新浏览器
3. ✓ 图形恢复
```

---

## ⚠️ 注意事项

### 常见陷阱

1. **坐标系混淆**
   ```javascript
   // 错误：直接使用Canvas坐标
   element.props.x = canvasX;  // ❌
   
   // 正确：使用Manim坐标
   const manim = editor.canvasToManim(canvasX, canvasY);
   element.props.x = manim.x;  // ✓
   ```

2. **Y轴方向**
   ```javascript
   // Manim: Y轴向上
   // top = y值大，bottom = y值小
   
   topY = center.y + height/2     // ✓
   bottomY = center.y - height/2  // ✓
   ```

3. **边界框计算**
   ```javascript
   // 必须返回Canvas坐标（像素）
   getBounds: function(element, editor) {
       const pos = editor.manimToCanvas(props.x, props.y);  // ✓
       return { x: pos.x, y: pos.y, ... };
   }
   ```

4. **缩放的固定点**
   ```javascript
   // 使用辅助函数，不要手动计算
   const fixed = editor.scaleHelpers.getFixedPoint(...);  // ✓
   ```

---

## 🔄 迁移优先级

### 阶段1：核心图形（优先）
1. rectangle - 最常用
2. square - 最常用
3. arrow - 常用
4. line - 常用

### 阶段2：复杂图形
5. curve - 有控制点，复杂
6. coordinateSystem - 特殊逻辑

### 阶段3：清理
7. 删除ui.js中的硬编码
8. 删除core.js中的硬编码
9. 添加默认处理器

---

## 📊 迁移进度追踪

### 方法迁移矩阵

| 插件 | getBounds | handleScale | handleMove | updateWhileDrawing | 状态 |
|------|-----------|-------------|------------|-------------------|------|
| square | ❌ | ❌ | ❌ | ❌ | 待迁移 |
| rectangle | ❌ | ❌ | ❌ | ❌ | 待迁移 |
| arrow | ❌ | ❌ | ❌ | ❌ | 待迁移 |
| line | ❌ | ❌ | ❌ | ❌ | 待迁移 |
| curve | ❌ | ❌ | ❌ | ❌ | 待迁移 |
| coordinateSystem | ❌ | ❌ | ❌ | ❌ | 待迁移 |

### 框架迁移矩阵

| 文件 | 函数 | 状态 | 说明 |
|------|------|------|------|
| core.js | scaleHelpers | ❌ | 需添加 |
| core.js | getElementBounds | ❌ | 需重构 |
| ui.js | handleScaleDrag | ❌ | 需重构 |
| ui.js | 移动逻辑 | ❌ | 需重构 |
| ui.js | updateTempElement | ❌ | 需重构 |
| ui.js | findControlPoint | ⚠️ | 部分重构 |

---

## 🎯 迁移示例：矩形插件

### 当前代码位置

**ui.js 中的矩形缩放逻辑（第454-518行）：**
```javascript
} else if (element.type === 'rectangle') {
    const halfWidth = props.width / 2;
    const halfHeight = props.height / 2;
    const center = { x: props.x, y: props.y };
    
    // ... 60行缩放逻辑
}
```

### 迁移后

**ui.js（重构后）：**
```javascript
// 通用调用，所有图形适用
const plugin = ManimEditor.shapeRegistry[element.type];
if (plugin && plugin.handleScale) {
    const newProps = plugin.handleScale(element, scaleInfo, ManimEditor);
    updateElement(element.id, newProps);
}
```

**rectangle.js（添加）：**
```javascript
handleScale: function(element, scaleInfo, editor) {
    // 这里是之前ui.js中的逻辑
    // 复制粘贴后稍作调整即可
    const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
    // ... 缩放逻辑
    return { width: newWidth, height: newHeight, x: newX, y: newY };
}
```

---

## 🛠️ 默认处理器

对于未实现某些方法的插件，框架提供默认处理器。

### defaultScaleHandler

```javascript
// core.js
function defaultScaleHandler(element, scaleInfo, editor) {
    const bounds = getElementBounds(element);
    if (!bounds) return {};
    
    // 基于边界框的通用缩放
    // ... 实现通用逻辑
    
    return { x: newX, y: newY };
}
```

### defaultMoveHandler

```javascript
// core.js
function defaultMoveHandler(element, moveInfo, editor) {
    // 默认：移动中心点
    return {
        x: moveInfo.currentPoint.x - moveInfo.offset.x,
        y: moveInfo.currentPoint.y - moveInfo.offset.y
    };
}
```

---

## 📝 迁移检查表

完成每个插件的迁移后，勾选：

### square.js
- [ ] 添加 `getBounds()`
- [ ] 添加 `handleScale()`
- [ ] 添加 `handleMove()`
- [ ] 添加 `updateWhileDrawing()`
- [ ] 测试所有功能
- [ ] 从ui.js删除硬编码

### rectangle.js
- [ ] 添加 `getBounds()`
- [ ] 添加 `handleScale()`
- [ ] 添加 `handleMove()`
- [ ] 添加 `updateWhileDrawing()`
- [ ] 测试所有功能
- [ ] 从ui.js删除硬编码

### arrow.js
- [ ] 添加 `getBounds()`
- [ ] 添加 `handleScale()`
- [ ] 添加 `handleMove()`
- [ ] 添加 `updateWhileDrawing()`
- [ ] 测试所有功能
- [ ] 从ui.js删除硬编码

### line.js
- [ ] 添加 `getBounds()`
- [ ] 添加 `handleScale()`
- [ ] 添加 `handleMove()`
- [ ] 添加 `updateWhileDrawing()`
- [ ] 测试所有功能
- [ ] 从ui.js删除硬编码

### curve.js
- [ ] 添加 `getBounds()`
- [ ] 添加 `handleScale()`
- [ ] 添加 `handleMove()`
- [ ] 实现 `getControlPoints()`
- [ ] 实现 `updateControlPoint()`
- [ ] 测试所有功能
- [ ] 从ui.js删除硬编码

### coordinateSystem.js
- [ ] 添加 `getBounds()`
- [ ] 添加 `handleScale()`
- [ ] 添加 `handleMove()`
- [ ] 添加 `updateWhileDrawing()`
- [ ] 测试所有功能
- [ ] 从ui.js删除硬编码

---

## 🚀 迁移后的好处

### 1. 代码组织
```
之前：
ui.js - 2000行（混乱）

之后：
ui.js - 800行（清晰）
plugins/*.js - 各200行（模块化）
```

### 2. 扩展性
```
添加新图形：
之前：修改3-5个文件
之后：创建1个插件文件 ✓
```

### 3. 可维护性
```
修复矩形bug：
之前：在ui.js中查找相关代码（困难）
之后：直接修改rectangle.js（简单）
```

### 4. 可测试性
```
测试矩形缩放：
之前：需要运行整个应用
之后：可以单元测试rectangle.handleScale()
```

---

**文档版本：** 1.0.0  
**最后更新：** 2025-11-02  
**预计迁移时间：** 4-6小时


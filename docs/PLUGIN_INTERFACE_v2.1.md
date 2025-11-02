# 插件接口规范 v2.2

最后更新：2025-11-02

## 概述

本文档定义Manim IDE v1.2.2的完整插件接口。

## 插件接口层次

### 必需接口（最小可用）
- `createDefault(x, y)` - 创建默认实例
- `render(ctx, element, editor)` - 渲染图形
- `hitTest(element, manimX, manimY, editor)` - 碰撞检测
- `toManim(element)` - 导出Manim代码

### 推荐接口（完整功能）
- `getBounds(element, editor)` - 计算边界框
- `handleScale(element, scaleInfo, editor)` - 处理缩放
- `handleMove(element, moveInfo, editor)` - 处理移动
- `updateWhileDrawing(element, start, current, editor)` - 拖动绘制更新

### 高级接口（特殊功能）
- `getControlPoints(element, editor)` - 获取可拖动控制点
- `updateControlPoint(element, pointId, newX, newY, editor)` - 更新控制点
- `getMoveAnchor(element)` - 获取移动锚点

### v2.1新增接口（点击式绘制）
- `onDrawClick(state, point, editor)` - 处理点击事件
- `onDrawDoubleClick(state, editor)` - 处理双击完成
- `renderDrawingPreview(ctx, state, editor)` - 绘制预览

### v2.2新增接口（数据升级）⚠️
- `onUpgrade(props)` - 升级旧版本数据（重要！）

## 配置项

- `type` (必需) - 唯一标识
- `name` (必需) - 显示名称
- `icon` (必需) - 工具箱图标
- `version` - 版本号
- `drawMode` - 绘制模式：'drag' | 'click' | 'multiClick'
- `properties` - 属性定义数组
- `capabilities` - 能力声明对象

## 点击式绘制详解（v2.1新增）

### 适用场景
- 需要精确放置多个点的图形（曲线、多边形）
- 不适合拖动绘制的图形

### 接口定义

#### onDrawClick(state, point, editor)
处理每次点击事件。

**参数：**
- `state` - 当前绘制状态（第一次为null）
- `point` - 点击的点 `[x, y, 0]` (Manim坐标)
- `editor` - ManimEditor对象

**返回：**
```javascript
{
    continue: boolean,    // true=继续绘制, false=完成
    state: object,        // 新的绘制状态
    element: object       // 如果continue=false，返回完成的元素
}
```

**示例：**
```javascript
onDrawClick: function(state, point, editor) {
    if (!state) {
        return { continue: true, state: { points: [point] } };
    }
    
    const newState = { points: [...state.points, point] };
    return { continue: true, state: newState };
}
```

#### onDrawDoubleClick(state, editor)
处理双击完成绘制。

**参数：**
- `state` - 当前绘制状态
- `editor` - ManimEditor对象

**返回：**
- 完成的element对象，或null（如果不能完成）

**示例：**
```javascript
onDrawDoubleClick: function(state, editor) {
    if (!state || state.points.length < 2) {
        return null;
    }
    
    return {
        type: 'curve',
        name: 'curve_' + editor.elements.length,
        props: { points: state.points, ... }
    };
}
```

#### renderDrawingPreview(ctx, state, editor)
绘制绘制中的预览。

**参数：**
- `ctx` - Canvas 2D上下文
- `state` - 当前绘制状态
- `editor` - ManimEditor对象（包含previewPoint）

**示例：**
```javascript
renderDrawingPreview: function(ctx, state, editor) {
    const points = state.points || [];
    const previewPoint = editor.previewPoint;
    
    // 绘制已放置的点
    points.forEach((point, i) => {
        const pos = editor.manimToCanvas(point[0], point[1]);
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // 绘制预览点
    if (previewPoint) {
        const pos = editor.manimToCanvas(previewPoint[0], previewPoint[1]);
        ctx.globalAlpha = 0.5;
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}
```

## 完整示例：Curve插件

见 `js/plugins/curve/curve.js`

## 框架支持

### ManimEditor.drawingState
通用绘制状态，由插件自定义结构。

### ManimEditor.previewPoint
鼠标预览点 `[x, y, 0]`，框架自动更新。

### 框架调用流程

```
点击画布 →
  plugin.onDrawClick(state, point) →
    返回{continue: true, state} →
      更新drawingState →
        render() →
          plugin.renderDrawingPreview(state)

双击画布 →
  plugin.onDrawDoubleClick(state) →
    返回element →
      addElement(element) →
        完成绘制
```

## onUpgrade(props) - 数据升级 ⚠️重要

**v2.2新增**

### 作用
当插件新增或修改属性时，用于升级旧版本保存的数据，确保向后兼容。

### 何时调用
- 从 localStorage 加载场景时
- 从 JSON 文件导入场景时

### 参数
- `props` - 旧版本的属性对象（可能缺少新属性）

### 返回值
- 升级后的属性对象（包含所有新属性的默认值）

### 实现示例

```javascript
onUpgrade: function(props) {
    // 为旧数据补充新属性的默认值
    const upgraded = { ...props };
    
    // v2.0 新增：fill/stroke 分离
    if (upgraded.fill_color === undefined) {
        upgraded.fill_color = upgraded.color || '#3498db';
    }
    if (upgraded.stroke_color === undefined) {
        upgraded.stroke_color = '#2c3e50';
    }
    if (upgraded.fill_opacity === undefined) {
        upgraded.fill_opacity = upgraded.opacity !== undefined ? upgraded.opacity : 1;
    }
    if (upgraded.stroke_width === undefined) {
        upgraded.stroke_width = 2;
    }
    
    // v2.1 新增：z_order
    if (upgraded.z_order === undefined) {
        upgraded.z_order = 0;
    }
    
    return upgraded;
}
```

### 注意事项

⚠️ **当你新增属性时，必须实现此方法！**

1. **复制旧属性**：使用 `{ ...props }` 避免修改原对象
2. **检查缺失**：用 `=== undefined` 检查属性是否存在
3. **提供默认值**：为缺失的属性设置合理的默认值
4. **兼容旧名称**：如果属性改名，从旧名称迁移值
5. **返回新对象**：返回完整的升级后属性对象

### 常见升级场景

#### 场景1：新增属性
```javascript
// 插件新增了 z_order 属性
if (upgraded.z_order === undefined) {
    upgraded.z_order = 0;
}
```

#### 场景2：属性改名
```javascript
// color → fill_color
if (upgraded.fill_color === undefined) {
    upgraded.fill_color = upgraded.color || '#3498db';
}
```

#### 场景3：拆分属性
```javascript
// opacity → fill_opacity
if (upgraded.fill_opacity === undefined) {
    upgraded.fill_opacity = upgraded.opacity !== undefined ? upgraded.opacity : 1;
}
```

#### 场景4：属性类型变化
```javascript
// 从数组改为对象
if (Array.isArray(upgraded.position)) {
    upgraded.x = upgraded.position[0];
    upgraded.y = upgraded.position[1];
    delete upgraded.position;
}
```

### 版本管理建议

使用注释标记每个版本的新增属性：

```javascript
onUpgrade: function(props) {
    const upgraded = { ...props };
    
    // v1.0 → v2.0：fill/stroke 分离
    if (upgraded.fill_color === undefined) {
        upgraded.fill_color = upgraded.color || '#3498db';
    }
    
    // v2.0 → v2.1：z_order 支持
    if (upgraded.z_order === undefined) {
        upgraded.z_order = 0;
    }
    
    // v2.1 → v2.2：新功能（未来示例）
    // if (upgraded.newProp === undefined) {
    //     upgraded.newProp = defaultValue;
    // }
    
    return upgraded;
}
```

---

## 版本历史

- v1.0 - 基础接口
- v2.0 - 插件化迁移（getBounds, handleScale等）
- v2.1 - 点击式绘制支持（onDrawClick等）
- v2.2 - 数据升级支持（onUpgrade）⚠️

---

**文档版本：** 2.2.0  
**最后更新：** 2025-11-02


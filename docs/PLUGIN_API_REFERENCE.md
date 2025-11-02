# 插件API完整参考

## 📖 目录

1. [基础信息](#基础信息)
2. [生命周期方法](#生命周期方法)
3. [交互方法](#交互方法)
4. [导出方法](#导出方法)
5. [配置选项](#配置选项)
6. [辅助工具](#辅助工具)

---

## 基础信息

### type (必需)
- **类型：** `string`
- **说明：** 图形的唯一标识符
- **示例：** `'rectangle'`, `'circle'`, `'polygon'`
- **注意：** 必须全局唯一，建议使用小写字母和下划线

### name (必需)
- **类型：** `string`
- **说明：** 显示在工具箱中的名称
- **示例：** `'矩形'`, `'圆形'`, `'多边形'`

### icon (必需)
- **类型：** `string`
- **说明：** 工具箱中显示的图标（Emoji或Unicode字符）
- **示例：** `'▭'`, `'⭕'`, `'⬡'`

### version (可选)
- **类型：** `string`
- **说明：** 插件版本号
- **默认：** `'1.0.0'`
- **示例：** `'2.1.0'`

---

## 生命周期方法

### createDefault(x, y) (必需)

创建图形的默认实例。

**参数：**
- `x` (number): 初始X坐标（Manim坐标系）
- `y` (number): 初始Y坐标（Manim坐标系）

**返回：** `object` - 元素对象
```javascript
{
    type: string,
    name: string,
    props: {
        // 图形特定的属性
        x: number,
        y: number,
        // ... 其他属性
        hidden: boolean  // 建议包含
    }
}
```

**示例：**
```javascript
createDefault: function(x, y) {
    return {
        type: 'rectangle',
        name: 'rect_' + (ManimEditor.elements.length + 1),
        props: {
            x: x || 0,
            y: y || 0,
            width: 2,
            height: 1,
            color: '#3498db',
            opacity: 1,
            hidden: false
        }
    };
}
```

---

### render(ctx, element, editor) (必需)

在Canvas上渲染图形。

**参数：**
- `ctx` (CanvasRenderingContext2D): Canvas 2D上下文
- `element` (object): 元素对象
- `editor` (ManimEditor): 全局编辑器对象

**返回：** 无

**可用的editor方法：**
```javascript
editor.manimToCanvas(manimX, manimY)  // 坐标转换
editor.selectedElement                 // 当前选中的元素
editor.canvas                          // Canvas元素
```

**示例：**
```javascript
render: function(ctx, element, editor) {
    const props = element.props;
    const pos = editor.manimToCanvas(props.x, props.y);
    const width = props.width * 50;  // Manim单位转像素
    const height = props.height * 50;
    
    ctx.fillStyle = props.color;
    ctx.globalAlpha = props.opacity || 1;
    
    ctx.fillRect(
        pos.x - width / 2,
        pos.y - height / 2,
        width,
        height
    );
}
```

**注意事项：**
- 使用 `ctx.save()` 和 `ctx.restore()` 保护上下文状态（框架已处理）
- Manim单位转Canvas像素：通常 1 Manim单位 = 50像素
- 坐标转换必须使用 `editor.manimToCanvas()`

---

### updateWhileDrawing(element, startCoord, currentCoord, editor) (可选)

拖动绘制时更新临时元素。

**参数：**
- `element` (object): 临时元素对象（可直接修改）
- `startCoord` (object): 起点坐标
  ```javascript
  {
      canvasX: number,
      canvasY: number,
      manimX: number,
      manimY: number
  }
  ```
- `currentCoord` (object): 当前坐标（格式同上）
- `editor` (ManimEditor): 编辑器对象

**返回：** 无（直接修改element.props）

**示例：**
```javascript
updateWhileDrawing: function(element, start, current, editor) {
    // 矩形：计算中心和尺寸
    const width = Math.abs(current.manimX - start.manimX);
    const height = Math.abs(current.manimY - start.manimY);
    
    element.props.width = width;
    element.props.height = height;
    element.props.x = (current.manimX + start.manimX) / 2;
    element.props.y = (current.manimY + start.manimY) / 2;
}
```

**如果不提供：**
- 图形不支持拖动绘制
- 或使用点击绘制（如曲线）

---

## 交互方法

### hitTest(element, manimX, manimY, editor) (必需)

检测点击是否在图形上。

**参数：**
- `element` (object): 元素对象
- `manimX, manimY` (number): 点击位置（Manim坐标）
- `editor` (ManimEditor): 编辑器对象

**返回：** `boolean` - true表示点击在图形上

**示例：**
```javascript
hitTest: function(element, manimX, manimY, editor) {
    const props = element.props;
    const halfWidth = props.width / 2;
    const halfHeight = props.height / 2;
    
    return Math.abs(manimX - props.x) <= halfWidth &&
           Math.abs(manimY - props.y) <= halfHeight;
}
```

---

### getBounds(element, editor) (推荐)

计算图形的边界框（Canvas坐标）。

**参数：**
- `element` (object): 元素对象
- `editor` (ManimEditor): 编辑器对象

**返回：** `object | null`
```javascript
{
    x: number,  // 左上角X（Canvas坐标）
    y: number,  // 左上角Y（Canvas坐标）
    w: number,  // 宽度（像素）
    h: number   // 高度（像素）
}
```

**用途：**
- 绘制选择框
- 显示缩放手柄
- 计算缩放的固定点

**示例：**
```javascript
getBounds: function(element, editor) {
    const props = element.props;
    const pos = editor.manimToCanvas(props.x, props.y);
    const w = props.width * 50;
    const h = props.height * 50;
    
    return {
        x: pos.x - w/2,
        y: pos.y - h/2,
        w,
        h
    };
}
```

**如果不提供：**
- 框架会尝试基于hitTest猜测边界
- 或不显示缩放手柄

---

### handleScale(element, scaleInfo, editor) (推荐)

处理缩放操作。

**参数：**
- `element` (object): 被缩放的元素
- `scaleInfo` (object): 缩放信息
  ```javascript
  {
      corner: 'topLeft'|'topRight'|'bottomRight'|'bottomLeft',
      fixedPoint: { x: number, y: number },  // Manim坐标
      currentPoint: { x: number, y: number }, // Manim坐标
      isShift: boolean,
      originalProps: object  // 开始缩放时的props快照
  }
  ```
- `editor` (ManimEditor): 编辑器对象

**返回：** `object` - 新的props（只包含需要更新的属性）

**辅助工具：**
```javascript
editor.scaleHelpers.getFixedPoint(corner, center, width, height)
editor.scaleHelpers.getNewCornerPosition(corner, fixedPoint, width, height)
editor.scaleHelpers.maintainAspectRatio(newW, newH, oldW, oldH)
```

**示例：**
```javascript
handleScale: function(element, scaleInfo, editor) {
    const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
    const helpers = editor.scaleHelpers;
    
    // 1. 计算新尺寸
    let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
    let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
    
    // 2. 处理等比例
    if (isShift) {
        const result = helpers.maintainAspectRatio(
            newWidth, newHeight,
            originalProps.width, originalProps.height
        );
        newWidth = result.width;
        newHeight = result.height;
    }
    
    // 3. 计算新中心
    const newCorner = helpers.getNewCornerPosition(corner, fixedPoint, newWidth, newHeight);
    const newCenterX = (fixedPoint.x + newCorner.x) / 2;
    const newCenterY = (fixedPoint.y + newCorner.y) / 2;
    
    // 4. 返回新属性
    return {
        width: Math.max(0.1, newWidth),
        height: Math.max(0.1, newHeight),
        x: newCenterX,
        y: newCenterY
    };
}
```

**如果不提供：**
- 使用默认缩放逻辑（基于getBounds）
- 或不支持缩放

---

### handleMove(element, moveInfo, editor) (推荐)

处理拖动移动操作。

**参数：**
- `element` (object): 被移动的元素
- `moveInfo` (object): 移动信息
  ```javascript
  {
      currentPoint: { x, y },  // 当前鼠标Manim坐标
      offset: { x, y },        // 初始偏移量
      deltaX: number,          // X方向增量（可选）
      deltaY: number           // Y方向增量（可选）
  }
  ```
- `editor` (ManimEditor): 编辑器对象

**返回：** `object` - 新的props

**示例：**
```javascript
// 简单图形：移动中心点
handleMove: function(element, moveInfo, editor) {
    return {
        x: moveInfo.currentPoint.x - moveInfo.offset.x,
        y: moveInfo.currentPoint.y - moveInfo.offset.y
    };
}

// 复杂图形：移动所有控制点
handleMove: function(element, moveInfo, editor) {
    const dx = moveInfo.deltaX;
    const dy = moveInfo.deltaY;
    
    const newPoints = element.props.points.map(p => [
        p[0] + dx,
        p[1] + dy,
        0
    ]);
    
    return { points: newPoints };
}
```

**如果不提供：**
- 使用默认移动逻辑（移动x, y属性）

---

### getControlPoints(element, editor) (可选)

返回图形的可拖动控制点（用于曲线等）。

**参数：**
- `element` (object): 元素对象
- `editor` (ManimEditor): 编辑器对象

**返回：** `array | null`
```javascript
[
    {
        id: string,           // 唯一标识，如 'p0', 'handle1'
        x: number,            // Manim X坐标
        y: number,            // Manim Y坐标
        type: string,         // 'endpoint' | 'control' | 'handle' | 'custom'
        render: function(ctx, canvasX, canvasY, isSelected) {
            // 可选：自定义渲染此控制点
            // 默认：根据type使用不同颜色的圆点
        }
    }
]
```

**示例：**
```javascript
getControlPoints: function(element, editor) {
    if (!element.props.points) return null;
    
    return element.props.points.map((point, index) => ({
        id: `p${index}`,
        x: point[0],
        y: point[1],
        type: index === 0 || index === element.props.points.length - 1
            ? 'endpoint'
            : 'control'
    }));
}
```

**如果不提供：**
- 图形没有可拖动的控制点
- 只支持整体移动和缩放

---

### updateControlPoint(element, pointId, newX, newY, editor) (可选)

更新控制点位置。

**前提：** 必须先实现 `getControlPoints()`

**参数：**
- `element` (object): 元素对象
- `pointId` (string): 控制点ID
- `newX, newY` (number): 新的Manim坐标
- `editor` (ManimEditor): 编辑器对象

**返回：** `object` - 新的props

**示例：**
```javascript
updateControlPoint: function(element, pointId, newX, newY, editor) {
    const index = parseInt(pointId.substring(1)); // 'p0' → 0
    const newPoints = [...element.props.points];
    newPoints[index] = [newX, newY, 0];
    
    return { points: newPoints };
}
```

---

## 导出方法

### toManim(element) (必需)

生成Manim Python代码。

**参数：**
- `element` (object): 元素对象

**返回：** `string` - Python代码（不包含前导空格）

**可用的全局辅助函数：**
```javascript
sanitizeVariableName(name)      // 清理变量名
hexToManimColor(hex)            // 颜色转换
formatNumber(num, precision)    // 数字格式化
```

**示例：**
```javascript
toManim: function(element) {
    const props = element.props;
    const varName = sanitizeVariableName(element.name);
    const width = formatNumber(props.width);
    const height = formatNumber(props.height);
    const color = hexToManimColor(props.color);
    const x = formatNumber(props.x);
    const y = formatNumber(props.y);
    
    let code = `${varName} = Rectangle(width=${width}, height=${height}, color=${color})`;
    
    if (props.x !== 0 || props.y !== 0) {
        code += `.move_to([${x}, ${y}, 0])`;
    }
    
    if (props.opacity !== 1) {
        code += `.set_opacity(${formatNumber(props.opacity)})`;
    }
    
    return code;
}
```

**注意：**
- 代码应该是单行或多行，但不包含最终的换行符
- 不要添加前导空格（框架会统一添加缩进）
- 使用链式调用让代码更简洁

---

### toJSON(element) (可选)

自定义JSON序列化。

**参数：**
- `element` (object): 元素对象

**返回：** `object` - 可序列化的对象

**示例：**
```javascript
toJSON: function(element) {
    // 默认行为已经足够，通常不需要自定义
    return {
        type: element.type,
        name: element.name,
        props: element.props
    };
}
```

**如果不提供：**
- 使用默认的JSON序列化（推荐）

---

### fromJSON(jsonData) (可选)

从JSON恢复元素。

**参数：**
- `jsonData` (object): JSON数据

**返回：** `object` - 元素对象

**示例：**
```javascript
fromJSON: function(jsonData) {
    // 默认行为已经足够
    return jsonData;
}
```

**如果不提供：**
- 使用默认的反序列化

---

## 配置选项

### properties (推荐)

定义可编辑的属性（用于属性面板）。

**类型：** `array`

**格式：**
```javascript
[
    {
        key: string,          // 属性键名，支持数组索引如 'start[0]'
        label: string,        // 显示标签
        type: string,         // 'number'|'text'|'color'|'checkbox'|'select'
        step: number,         // 可选：数字步长
        min: number,          // 可选：最小值
        max: number,          // 可选：最大值
        options: array,       // 可选：下拉选项 [{value, label}]
        group: string,        // 可选：分组名称
        validator: function   // 可选：自定义验证
    }
]
```

**示例：**
```javascript
properties: [
    { 
        key: 'x', 
        label: 'X坐标', 
        type: 'number', 
        step: 0.1,
        group: 'position'
    },
    { 
        key: 'width', 
        label: '宽度', 
        type: 'number', 
        step: 0.1,
        min: 0.1,
        group: 'size'
    },
    { 
        key: 'color', 
        label: '颜色', 
        type: 'color' 
    },
    {
        key: 'style',
        label: '样式',
        type: 'select',
        options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' }
        ]
    }
]
```

**如果不提供：**
- 属性面板会显示所有props的键值对
- 使用默认的类型推断

---

### capabilities (可选)

声明图形支持的能力。

**类型：** `object`

**默认值：**
```javascript
{
    movable: true,           // 可移动
    scalable: true,          // 可缩放
    rotatable: false,        // 可旋转（暂未实现）
    editable: true,          // 可编辑属性
    deletable: true,         // 可删除
    copyable: true,          // 可复制（暂未实现）
    hasControlPoints: false  // 有自定义控制点
}
```

**示例：**
```javascript
capabilities: {
    movable: true,
    scalable: true,
    hasControlPoints: true,  // 曲线有控制点
    rotatable: false
}
```

**用途：**
- 框架根据capabilities决定显示哪些控制点
- 禁用不支持的操作

---

### drawMode (可选)

指定绘制模式。

**类型：** `string`

**可选值：**
- `'drag'`: 拖动绘制（默认）- 矩形、正方形
- `'click'`: 单击放置 - 圆形、点
- `'multiClick'`: 多次点击 - 曲线、多边形
- `'custom'`: 自定义逻辑

**示例：**
```javascript
drawMode: 'drag'  // 拖动绘制
```

**如果不提供：**
- 默认使用 `'drag'` 模式

---

## 辅助工具

### 框架提供的全局函数

#### 坐标转换
```javascript
editor.manimToCanvas(manimX, manimY)
// 返回：{ x: canvasX, y: canvasY }

editor.canvasToManim(canvasX, canvasY)
// 返回：{ x: manimX, y: manimY }
```

#### 缩放辅助
```javascript
editor.scaleHelpers.getFixedPoint(corner, center, width, height)
// 返回：{ x, y } - 固定点的Manim坐标

editor.scaleHelpers.getNewCornerPosition(corner, fixedPoint, newWidth, newHeight)
// 返回：{ x, y } - 新角位置的Manim坐标

editor.scaleHelpers.maintainAspectRatio(newWidth, newHeight, oldWidth, oldHeight)
// 返回：{ width, height, scale }
```

#### 格式化工具
```javascript
sanitizeVariableName(name)
// 清理变量名，移除非法字符
// 'my-shape' → 'my_shape'

hexToManimColor(hex)
// 转换颜色
// '#3498db' → 'BLUE'
// '#ABCDEF' → '"#ABCDEF"'

formatNumber(num, precision = 2)
// 格式化数字
// 1.0 → '1'
// 3.14159 → '3.14'

roundNumbersInObject(obj, decimals = 2)
// 递归四舍五入对象中的所有数字
```

---

## 🎯 完整的插件模板

### 基础模板（最小实现）

```javascript
registerShape({
    // 基础信息（必需）
    type: 'myshape',
    name: '我的图形',
    icon: '🔷',
    
    // 创建（必需）
    createDefault: function(x, y) {
        return {
            type: 'myshape',
            name: 'myshape_' + (ManimEditor.elements.length + 1),
            props: { x, y }
        };
    },
    
    // 渲染（必需）
    render: function(ctx, element, editor) {
        // 绘制逻辑
    },
    
    // 碰撞检测（必需）
    hitTest: function(element, manimX, manimY, editor) {
        return true; // 简化实现
    },
    
    // 导出（必需）
    toManim: function(element) {
        return `${sanitizeVariableName(element.name)} = MyShape()`;
    }
});
```

### 完整模板（推荐实现）

```javascript
registerShape({
    // ═══ 基础信息 ═══
    type: 'myshape',
    name: '我的图形',
    icon: '🔷',
    version: '1.0.0',
    drawMode: 'drag',
    
    // ═══ 能力声明 ═══
    capabilities: {
        movable: true,
        scalable: true,
        editable: true,
        deletable: true,
        hasControlPoints: false
    },
    
    // ═══ 生命周期 ═══
    createDefault: function(x, y) { ... },
    render: function(ctx, element, editor) { ... },
    updateWhileDrawing: function(element, start, current, editor) { ... },
    
    // ═══ 交互 ═══
    hitTest: function(element, manimX, manimY, editor) { ... },
    getBounds: function(element, editor) { ... },
    handleScale: function(element, scaleInfo, editor) { ... },
    handleMove: function(element, moveInfo, editor) { ... },
    
    // ═══ 导出 ═══
    toManim: function(element) { ... },
    
    // ═══ 配置 ═══
    properties: [ ... ]
});
```

---

## 🔍 调试技巧

### 日志输出

```javascript
render: function(ctx, element, editor) {
    console.log(`[${this.type}] 渲染元素:`, element.name);
    // ... 渲染逻辑
}

handleScale: function(element, scaleInfo, editor) {
    console.log(`[${this.type}] 缩放:`, scaleInfo.corner);
    // ... 缩放逻辑
}
```

### 验证数据

```javascript
createDefault: function(x, y) {
    const element = { /* ... */ };
    
    // 验证
    if (!element.props.width || element.props.width <= 0) {
        console.warn('Invalid width, using default');
        element.props.width = 1;
    }
    
    return element;
}
```

---

## 📚 版本兼容性

### v1.0 插件（当前）
- 只实现基础方法：createDefault, render, hitTest, toManim
- 缩放和移动逻辑在框架层硬编码

### v2.0 插件（目标）
- 实现完整接口：handleScale, handleMove, getBounds等
- 完全自主处理所有逻辑
- 框架层零硬编码

### 兼容策略
```javascript
// 框架会检查方法是否存在
if (plugin.handleScale) {
    // 使用插件的缩放逻辑
} else {
    // 回退到默认逻辑
}
```

---

**API版本：** 2.0.0  
**最后更新：** 2025-11-02  
**状态：** 设计完成，待实现


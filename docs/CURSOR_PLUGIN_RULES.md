# Manim IDE 插件开发 Cursor Rules

## 核心原则

### 1. 插件自治原则 ⚠️ 最重要
- **绝对禁止**在框架代码（core.js, ui.js, export.js）中硬编码形状类型
- **所有**形状特定逻辑必须在插件内实现
- 框架只负责调用插件接口，不关心具体实现

### 2. 接口完整性原则
必须实现所有必需接口，推荐实现所有可选接口以获得完整功能。

---

## 必需接口（4个）⚠️ 缺一不可

### ✅ createDefault(x, y)
```javascript
createDefault: function(x, y) {
    return {
        type: 'myshape',
        name: 'myshape_' + (ManimEditor.elements.length + 1),
        props: {
            // ⚠️ 使用 !== undefined 而不是 ||
            x: x !== undefined ? x : 0,
            y: y !== undefined ? y : 0,
            
            // ⚠️ 拖动绘制的图形，初始尺寸设为 0（避免闪现）
            radius: 0,  // 或 width: 0, height: 0
            
            // ⚠️ 必须包含的标准属性
            z_order: 0,
            hidden: false,
            
            // 图形特定属性...
        }
    };
}
```

**常见错误：**
- ❌ 使用 `x: x || 0` → 当x=0时会被当作falsy
- ❌ 初始尺寸不是0 → 绘制时会闪现默认大小
- ❌ 缺少 z_order → 导出时报错

---

### ✅ render(ctx, element, editor)
```javascript
render: function(ctx, element, editor) {
    const props = element.props;
    
    // ⚠️ 使用 !== undefined 而不是 ||
    const x = props.x !== undefined ? props.x : 0;
    const radius = props.radius !== undefined ? props.radius : 1;
    
    // ⚠️ 必须调用 setRenderOpacity 处理 hidden
    setRenderOpacity(ctx, element);
    
    // 坐标转换
    const pos = editor.manimToCanvas(x, y);
    const radiusPixels = radius * 50;  // Manim单位 → 像素
    
    // 绘制...
    ctx.beginPath();
    // ...
    ctx.stroke();
}
```

**常见错误：**
- ❌ 使用 `props.x || 0` → 0值会出错
- ❌ 忘记调用 `setRenderOpacity` → hidden属性无效
- ❌ 忘记坐标转换 → 位置错误

---

### ✅ hitTest(element, manimX, manimY, editor)
```javascript
hitTest: function(element, manimX, manimY, editor) {
    const props = element.props;
    
    // ⚠️ 必须有合理的容差（用户友好）
    const tolerance = 0.3;  // 至少0.3 Manim单位
    
    // 几何判断...
    return distance < radius + tolerance;
}
```

**常见错误：**
- ❌ 容差太小 → 难以选中
- ❌ Arc: 角度判断没有考虑 isClockwise → 选中补线而不是圆弧

---

### ✅ toManim(element)
```javascript
toManim: function(element) {
    const props = element.props;
    const varName = sanitizeVariableName(element.name);
    
    // ⚠️ 使用 formatNumber()，它会处理 null/undefined
    const x = formatNumber(props.x);
    const radius = formatNumber(props.radius);
    
    let code = `${varName} = Circle(radius=${radius})`;
    
    // ⚠️ z_order=0 时不导出（保持简洁）
    const zOrder = props.z_order !== undefined ? props.z_order : 0;
    if (zOrder !== 0) {
        code += `.set_z_index(${zOrder})`;
    }
    
    return code;
}
```

**常见错误：**
- ❌ 直接调用 num.toFixed() → num为null时崩溃
- ❌ 总是导出 z_order → 代码冗余

---

## 推荐接口（4个）⚠️ 强烈建议实现

### ✅ getMoveAnchor(element) ⚠️ 非常重要
```javascript
getMoveAnchor: function(element) {
    const props = element.props;
    return {
        x: props.x !== undefined ? props.x : 0,
        y: props.y !== undefined ? props.y : 0
    };
}
```

**为什么重要：**
- ❌ **不实现会导致点击后元素跳到(0,0)！**
- 框架依赖此方法计算拖动偏移量
- Circle插件曾因缺少此方法出现跳回bug

**特殊情况：**
- 箭头/线段：返回 `null` → 使用增量移动
- 多点图形：返回几何中心

---

### ✅ getBounds(element, editor)
```javascript
getBounds: function(element, editor) {
    const props = element.props;
    
    // ⚠️ 在Manim坐标计算边界，然后转换为Canvas
    const left = props.x - props.radius;
    const right = props.x + props.radius;
    const top = props.y + props.radius;
    const bottom = props.y - props.radius;
    
    const topLeft = editor.manimToCanvas(left, top);
    const bottomRight = editor.manimToCanvas(right, bottom);
    
    return {
        x: topLeft.x,
        y: topLeft.y,
        w: bottomRight.x - topLeft.x,
        h: bottomRight.y - topLeft.y
    };
}
```

**常见错误：**
- ❌ 直接在Canvas坐标计算 → 不准确
- ❌ 圆形的bounds太小 → 控制点在圆内

---

### ✅ handleScale(element, scaleInfo, editor)
```javascript
handleScale: function(element, scaleInfo, editor) {
    const { corner, fixedPoint, currentPoint } = scaleInfo;
    
    // ⚠️ 注意参数签名（不是旧的 scaleX, scaleY）
    // 参数：corner, fixedPoint, currentPoint, isShift, originalProps
    
    // 计算新尺寸...
    const newRadius = ...;
    
    // 返回需要更新的属性
    return {
        radius: Math.max(0.1, newRadius),
        x: newCenterX,
        y: newCenterY
    };
}
```

**常见错误：**
- ❌ 使用旧接口 {scaleX, scaleY} → Polygon曾因此缩放消失
- ❌ 返回负数或NaN → 图形消失

---

### ✅ handleMove(element, moveInfo, editor)
```javascript
handleMove: function(element, moveInfo, editor) {
    return {
        x: moveInfo.currentPoint.x - moveInfo.offset.x,
        y: moveInfo.currentPoint.y - moveInfo.offset.y
    };
}
```

---

## 点击绘制接口（3个）⚠️ multiClick 模式必需

### ✅ onDrawClick(state, point, editor)
```javascript
onDrawClick: function(state, point, editor) {
    if (!state) {
        // 第1次点击
        return {
            continue: true,
            state: { points: [point] }
        };
    }
    // ...
    return { continue: false, element: element };
}
```

**常见错误：**
- ❌ Arc: 使用 this._calculateCircle → this指向错误，改用外部函数

---

### ✅ renderDrawingPreview(ctx, state, editor) ⚠️ 参数签名
```javascript
renderDrawingPreview: function(ctx, state, editor) {
    // ⚠️ 正确参数：(ctx, state, editor)
    // ❌ 错误：(ctx, state, previewPoint, editor) → 多了参数
    
    const previewPoint = editor.previewPoint;  // ← 从这里获取
    
    // 绘制预览...
}
```

**常见错误：**
- ❌ Arc最初：参数签名错误，多了previewPoint参数

---

## 数据升级接口 ⚠️ 新增属性时必需

### ✅ onUpgrade(props)
```javascript
onUpgrade: function(props) {
    const upgraded = { ...props };  // ⚠️ 使用展开运算符，不修改原对象
    
    // v2.0 新增属性
    if (upgraded.fill_color === undefined) {
        upgraded.fill_color = upgraded.color || '#3498db';
    }
    
    // v2.1 新增属性
    if (upgraded.z_order === undefined) {
        upgraded.z_order = 0;
    }
    
    return upgraded;
}
```

**为什么重要：**
- 用户的旧数据缺少新属性
- 不实现会导致导出时 formatNumber(undefined) 报错
- Circle已实现示例

---

## 配置项

### ✅ properties
```javascript
properties: [
    { key: 'x', label: 'X坐标', type: 'number', step: 0.01 },
    { key: 'n', label: '边数', type: 'number', step: 1, min: 3, max: 512 },
    // ⚠️ step 会应用到输入框，不要硬编码
    { key: 'z_order', label: 'Z序', type: 'number', step: 1 }
]
```

**常见错误：**
- ❌ ui.js 硬编码 input.step='0.01' → 边数一次增加0.01而不是1

---

## 常见陷阱总结

### 1. || 运算符陷阱 ⚠️ 非常常见
```javascript
// ❌ 错误
const x = props.x || 0;  // 当 x=0 时会被当作 falsy

// ✅ 正确
const x = props.x !== undefined ? props.x : 0;
```

**影响范围：**
- createDefault
- render
- 所有访问 props 的地方

---

### 2. 坐标系转换陷阱
```javascript
// ❌ 错误：在Canvas坐标计算bounds
const bounds = { x: pos.x - w/2, y: pos.y - h/2, w, h };

// ✅ 正确：在Manim坐标计算，然后转换
const topLeft = editor.manimToCanvas(manimLeft, manimTop);
const bottomRight = editor.manimToCanvas(manimRight, manimBottom);
```

---

### 3. 初始尺寸陷阱
```javascript
// ❌ 错误：非零初始尺寸
props: { radius: 1 }  // 绘制时会闪现

// ✅ 正确：零初始尺寸
props: { radius: 0 }  // 平滑增长
```

---

### 4. 方向判断陷阱（Arc特有）
```javascript
// ⚠️ 三点定义的圆弧，方向由三点决定
const isClockwise = spanAB < spanAC;

// ⚠️ Canvas绘制时
const anticlockwise = isClockwise;  // 不取反！

// ⚠️ hitTest 必须同步
if (isClockwise) { 顺时针判断 }
else { 逆时针判断 }
```

---

### 5. 绘制模式陷阱
```javascript
// Arc/Curve: multiClick 模式
drawMode: 'multiClick',

// ⚠️ 参数签名必须正确
renderDrawingPreview: function(ctx, state, editor) {
    // 不是 (ctx, state, previewPoint, editor)
    const previewPoint = editor.previewPoint;  // 从这里获取
}
```

---

## 完整检查清单

### 创建插件时必须检查：

#### 基础配置
- [ ] type: 唯一字符串
- [ ] name: 中文显示名
- [ ] icon: Emoji图标
- [ ] drawMode: 'drag' | 'multiClick'

#### 必需接口（4个）
- [ ] createDefault: 正确处理x, y, 初始尺寸为0
- [ ] render: 使用 !== undefined, 调用 setRenderOpacity
- [ ] hitTest: 有合理容差
- [ ] toManim: 使用 formatNumber, z_order=0不导出

#### 推荐接口（4个）
- [ ] getMoveAnchor: ⚠️ 非常重要，避免跳回(0,0)
- [ ] getBounds: 在Manim坐标计算后转换
- [ ] handleScale: 使用新接口 {corner, fixedPoint, currentPoint}
- [ ] handleMove: 返回新坐标

#### 点击绘制（如果 drawMode='multiClick'）
- [ ] onDrawClick: 正确的状态管理
- [ ] onDrawDoubleClick: 备用完成
- [ ] renderDrawingPreview: 正确参数 (ctx, state, editor)

#### 数据升级
- [ ] onUpgrade: 新增属性时必须实现

#### 配置
- [ ] properties: 包含所有可编辑属性，正确的 step
- [ ] z_order 在 properties 中

---

## 特殊图形的注意事项

### 圆弧（Arc）类图形
- **绘制**：只用 ctx.arc() + stroke，不用 moveTo/closePath/fill
- **边缘**：lineCap = 'butt' 方角
- **方向**：根据几何自动判断，不强制
- **三点定义**：必须使用外部辅助函数（避免this指向问题）

### 函数图形（Sine, Parabola）
- **采样**：动态采样（至少2点/像素，min200, max500）
- **平滑**：lineCap='round', lineJoin='round'
- **移动锚点**：使用函数中心，不是起点

### 多点图形（Curve, Triangle）
- **控制点**：可拖动，蓝色实心圆
- **移动**：整体移动所有点
- **缩放**：等比例缩放所有点

---

## 开发流程

### 1. 规划阶段
- 确定数学模型（圆的方程、贝塞尔公式等）
- 确定绘制模式（drag/multiClick）
- 确定属性结构

### 2. 实现阶段
按顺序实现：
1. createDefault + render（先看到效果）
2. hitTest + getBounds（可选中）
3. getMoveAnchor + handleMove（可移动）⚠️ 重要
4. handleScale（可缩放）
5. 点击绘制接口（如需要）
6. toManim（可导出）
7. onUpgrade（数据兼容）
8. properties（可编辑）

### 3. 测试阶段
- 绘制测试
- 选中测试（包括边缘和中心）
- 移动测试（检查是否跳回0,0）⚠️
- 缩放测试
- 导出测试
- 属性面板测试（step是否正确）

### 4. 文档阶段
- README.md
- 测试文件
- 更新 index.html

---

## 调试技巧

### 添加调试日志
```javascript
render: function(ctx, element, editor) {
    console.log('[MyShape.render] props:', element.props);
    // ...
}

handleMove: function(element, moveInfo, editor) {
    console.log('[MyShape.handleMove] offset:', moveInfo.offset);
    const result = { x: ..., y: ... };
    console.log('[MyShape.handleMove] result:', result);
    return result;
}
```

### 检查点
- 绘制后立即点击 → 是否跳回(0,0)？→ 检查 getMoveAnchor
- 修改属性面板 → 图形是否改变？→ 检查 !== undefined
- 边数等整数 → step是否为1？→ 检查 properties 定义
- 导出报错 → 是否有null值？→ 检查 formatNumber 使用

---

## 性能优化

### 只在必要时触发重排序
- addElement → 需要排序
- deleteElement → **不需要排序**（删除不改变顺序）
- updateElement(z_order变化) → 需要排序
- updateElement(其他属性) → **不需要排序**

---

## 示例：完整的插件模板

```javascript
// ⚠️ 辅助函数定义在外部（避免 this 指向问题）
function myShapeHelper(a, b, c) {
    // ...
}

registerShape({
    type: 'myshape',
    name: '我的图形',
    icon: '🔷',
    version: '1.0.0',
    drawMode: 'drag',
    
    createDefault: function(x, y) {
        return {
            type: 'myshape',
            name: 'myshape_' + (ManimEditor.elements.length + 1),
            props: {
                x: x !== undefined ? x : 0,  // ⚠️ !== undefined
                y: y !== undefined ? y : 0,
                size: 0,  // ⚠️ 初始为0
                stroke_color: '#3498db',
                stroke_width: 2,
                z_order: 0,  // ⚠️ 必须
                hidden: false
            }
        };
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const size = props.size !== undefined ? props.size : 1;  // ⚠️
        
        setRenderOpacity(ctx, element);  // ⚠️ 必须
        
        // 绘制...
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        // 有合理容差
        const tolerance = 0.3;
        // ...
    },
    
    getBounds: function(element, editor) {
        // Manim坐标 → Canvas坐标
    },
    
    getMoveAnchor: function(element) {  // ⚠️ 必须实现
        return { x: element.props.x, y: element.props.y };
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { corner, fixedPoint, currentPoint } = scaleInfo;  // ⚠️ 新接口
        // ...
    },
    
    handleMove: function(element, moveInfo, editor) {
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    },
    
    toManim: function(element) {
        const varName = sanitizeVariableName(element.name);
        const size = formatNumber(element.props.size);  // ⚠️ formatNumber
        
        let code = `${varName} = MyShape(size=${size})`;
        
        const zOrder = element.props.z_order || 0;
        if (zOrder !== 0) {  // ⚠️ 0时不导出
            code += `.set_z_index(${zOrder})`;
        }
        
        return code;
    },
    
    onUpgrade: function(props) {  // ⚠️ 新增属性时必须
        const upgraded = { ...props };
        
        if (upgraded.z_order === undefined) {
            upgraded.z_order = 0;
        }
        
        return upgraded;
    },
    
    properties: [
        { key: 'x', label: 'X坐标', type: 'number', step: 0.01 },
        { key: 'size', label: '大小', type: 'number', step: 0.01, min: 0.1 },
        { key: 'stroke_color', label: '颜色', type: 'color' },
        { key: 'stroke_width', label: '线宽', type: 'number', step: 0.5, min: 0.5 },
        { key: 'z_order', label: 'Z序', type: 'number', step: 1 }  // ⚠️ 必须
    ]
});
```

---

## 总结：绝对不能犯的错误

1. ❌ **缺少 getMoveAnchor** → 点击跳回(0,0)
2. ❌ **使用 || 运算符** → 0值出错
3. ❌ **初始尺寸非0** → 绘制闪现
4. ❌ **忘记 setRenderOpacity** → hidden无效
5. ❌ **formatNumber 不处理 null** → 导出崩溃
6. ❌ **step 硬编码** → 边数增加0.01
7. ❌ **缺少 onUpgrade** → 旧数据不兼容
8. ❌ **arc 用 moveTo+closePath** → 画成扇形
9. ❌ **renderDrawingPreview 参数错误** → 崩溃
10. ❌ **使用旧的 handleScale 接口** → 缩放失败

---

**遵循这些规则，插件开发将一次成功！** 🎯


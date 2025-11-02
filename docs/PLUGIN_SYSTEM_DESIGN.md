# Manim IDE 插件系统设计文档

## 🎯 设计目标

### 核心原则
1. **开闭原则**：对扩展开放，对修改封闭
2. **零侵入**：添加新图形不修改框架代码（core.js, ui.js）
3. **完全自主**：插件完全控制自己的行为
4. **统一接口**：所有插件遵循相同的接口规范

### 目标
- ✅ 添加新图形：只需在 `js/plugins/` 下创建新文件
- ✅ 删除图形：只需删除插件文件
- ✅ 修改图形：只需修改对应插件
- ✅ 不修改框架：core.js, ui.js, export.js 保持稳定

---

## 📋 插件接口规范 v2.0

### 完整接口定义

```javascript
registerShape({
    // ═══════════════════════════════════════════
    // 基础信息
    // ═══════════════════════════════════════════
    type: string,              // 唯一标识符，如 'rectangle'
    name: string,              // 显示名称，如 '矩形'
    icon: string,              // 工具箱图标，如 '▭'
    version: string,           // 插件版本，如 '1.0.0'
    
    // ═══════════════════════════════════════════
    // 生命周期：创建
    // ═══════════════════════════════════════════
    createDefault: function(x, y) {
        // 创建默认实例
        // 参数：x, y - Manim坐标
        // 返回：element对象
        return {
            type: 'myShape',
            name: 'shape_1',
            props: { x, y, ... }
        };
    },
    
    // ═══════════════════════════════════════════
    // 生命周期：绘制（必需）
    // ═══════════════════════════════════════════
    render: function(ctx, element, editor) {
        // 在Canvas上绘制图形
        // 参数：
        //   ctx - Canvas 2D context
        //   element - 元素对象
        //   editor - ManimEditor全局对象
        // 返回：无
    },
    
    // ═══════════════════════════════════════════
    // 生命周期：拖动绘制（可选）
    // ═══════════════════════════════════════════
    updateWhileDrawing: function(element, startCoord, currentCoord, editor) {
        // 拖动绘制时更新临时元素
        // 参数：
        //   element - 临时元素对象
        //   startCoord - 起点{manimX, manimY, canvasX, canvasY}
        //   currentCoord - 当前点{manimX, manimY, canvasX, canvasY}
        //   editor - ManimEditor对象
        // 返回：更新后的element（或直接修改element.props）
        
        // 示例：矩形
        const width = Math.abs(currentCoord.manimX - startCoord.manimX);
        const height = Math.abs(currentCoord.manimY - startCoord.manimY);
        element.props.width = width;
        element.props.height = height;
        element.props.x = (currentCoord.manimX + startCoord.manimX) / 2;
        element.props.y = (currentCoord.manimY + startCoord.manimY) / 2;
    },
    
    // ═══════════════════════════════════════════
    // 交互：碰撞检测（必需）
    // ═══════════════════════════════════════════
    hitTest: function(element, manimX, manimY, editor) {
        // 检测点击是否在图形上
        // 参数：manimX, manimY - Manim坐标
        // 返回：boolean
        return true/false;
    },
    
    // ═══════════════════════════════════════════
    // 交互：边界框计算（用于选择框和缩放）
    // ═══════════════════════════════════════════
    getBounds: function(element, editor) {
        // 计算图形的边界框（Canvas坐标）
        // 返回：{ x, y, w, h } 或 null
        // x, y: 左上角Canvas坐标
        // w, h: 宽度和高度（像素）
        
        const pos = editor.manimToCanvas(element.props.x, element.props.y);
        const w = element.props.width * 50;
        const h = element.props.height * 50;
        return { 
            x: pos.x - w/2, 
            y: pos.y - h/2, 
            w, 
            h 
        };
    },
    
    // ═══════════════════════════════════════════
    // 交互：缩放处理（新增，关键！）
    // ═══════════════════════════════════════════
    handleScale: function(element, scaleInfo, editor) {
        // 处理缩放操作
        // 参数：
        //   element - 被缩放的元素
        //   scaleInfo - {
        //       corner: 'topLeft'|'topRight'|'bottomRight'|'bottomLeft',
        //       fixedPoint: {x, y},  // Manim坐标
        //       currentPoint: {x, y}, // 鼠标当前Manim坐标
        //       isShift: boolean,     // 是否按住Shift
        //       originalProps: {...}  // 原始属性
        //   }
        //   editor - ManimEditor对象
        // 返回：新的props对象（只包含需要更新的属性）
        
        // 示例：矩形缩放
        const { fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        if (isShift) {
            const ratio = originalProps.width / originalProps.height;
            const scale = Math.max(
                newWidth / originalProps.width,
                newHeight / originalProps.height
            );
            newWidth = originalProps.width * scale;
            newHeight = originalProps.height * scale;
        }
        
        // 计算新角位置和新中心
        const newCornerX = fixedPoint.x + (/* 根据corner计算 */);
        const newCornerY = fixedPoint.y - (/* 根据corner计算 */);
        const newCenterX = (fixedPoint.x + newCornerX) / 2;
        const newCenterY = (fixedPoint.y + newCornerY) / 2;
        
        return {
            width: newWidth,
            height: newHeight,
            x: newCenterX,
            y: newCenterY
        };
    },
    
    // ═══════════════════════════════════════════
    // 交互：拖动移动（新增）
    // ═══════════════════════════════════════════
    handleMove: function(element, moveInfo, editor) {
        // 处理拖动移动操作
        // 参数：
        //   element - 被移动的元素
        //   moveInfo - {
        //       currentPoint: {x, y},  // 当前鼠标Manim坐标
        //       offset: {x, y},        // 偏移量
        //       deltaX: number,        // 增量X
        //       deltaY: number         // 增量Y
        //   }
        // 返回：新的props对象
        
        // 示例：简单中心点移动
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    },
    
    // ═══════════════════════════════════════════
    // 交互：控制点管理（新增，用于曲线等）
    // ═══════════════════════════════════════════
    getControlPoints: function(element, editor) {
        // 返回图形的可拖动控制点
        // 返回：null 或 [
        //   { 
        //     id: string,           // 控制点唯一标识
        //     x: number,            // Manim X坐标
        //     y: number,            // Manim Y坐标
        //     type: 'endpoint'|'control'|'custom',
        //     render: function(ctx, canvasX, canvasY) {...}  // 可选的自定义渲染
        //   }
        // ]
        
        // 示例：曲线的4个控制点
        if (!element.props.points) return null;
        
        return element.props.points.map((point, index) => ({
            id: `p${index}`,
            x: point[0],
            y: point[1],
            type: index === 0 || index === element.props.points.length - 1 
                ? 'endpoint' 
                : 'control'
        }));
    },
    
    updateControlPoint: function(element, pointId, newX, newY, editor) {
        // 更新控制点位置
        // 参数：
        //   pointId - 控制点ID
        //   newX, newY - 新的Manim坐标
        // 返回：新的props
        
        const index = parseInt(pointId.substring(1));
        const newPoints = [...element.props.points];
        newPoints[index] = [newX, newY, 0];
        
        return { points: newPoints };
    },
    
    // ═══════════════════════════════════════════
    // 导出：Manim代码（必需）
    // ═══════════════════════════════════════════
    toManim: function(element) {
        // 生成Manim Python代码
        // 返回：string - Python代码
        
        const varName = sanitizeVariableName(element.name);
        return `${varName} = Rectangle(...)`;
    },
    
    // ═══════════════════════════════════════════
    // 导出：JSON序列化（可选）
    // ═══════════════════════════════════════════
    toJSON: function(element) {
        // 自定义JSON序列化
        // 如果不提供，使用默认的JSON.stringify
        // 返回：object
        
        return {
            type: element.type,
            name: element.name,
            props: element.props
        };
    },
    
    fromJSON: function(jsonData) {
        // 从JSON恢复
        // 返回：element对象
        
        return {
            type: jsonData.type,
            name: jsonData.name,
            props: jsonData.props
        };
    },
    
    // ═══════════════════════════════════════════
    // 配置：属性定义（用于属性面板）
    // ═══════════════════════════════════════════
    properties: [
        {
            key: 'x',
            label: 'X坐标',
            type: 'number',         // number|text|color|checkbox|select
            step: 0.1,              // 可选：数字步长
            min: -10,               // 可选：最小值
            max: 10,                // 可选：最大值
            options: [...],         // 可选：下拉选项
            group: 'position',      // 可选：分组
            validator: function(value) {  // 可选：自定义验证
                return value > 0;
            }
        }
    ],
    
    // ═══════════════════════════════════════════
    // 配置：绘制模式（可选）
    // ═══════════════════════════════════════════
    drawMode: 'drag',  // 'drag' | 'click' | 'multiClick' | 'custom'
    // drag: 拖动绘制（矩形、正方形）
    // click: 单击绘制（待实现的Circle）
    // multiClick: 多次点击（曲线）
    // custom: 自定义逻辑
    
    // ═══════════════════════════════════════════
    // 配置：支持的操作（可选，默认全部支持）
    // ═══════════════════════════════════════════
    capabilities: {
        movable: true,          // 可移动
        scalable: true,         // 可缩放
        rotatable: false,       // 可旋转（待实现）
        editable: true,         // 可编辑属性
        deletable: true,        // 可删除
        copyable: true,         // 可复制（待实现）
        hasControlPoints: false // 有控制点（如曲线）
    }
});
```

---

## 🏗️ 插件系统架构

### 架构图

```
┌─────────────────────────────────────────────────┐
│                  Application                     │
│                  (index.html)                    │
└──────────────────┬──────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │               │
┌───▼────┐   ┌────▼────┐   ┌─────▼─────┐
│ core.js│   │  ui.js  │   │ export.js │
│ 框架层 │   │  框架层 │   │  框架层   │
└───┬────┘   └────┬────┘   └─────┬─────┘
    │             │               │
    └──────┬──────┴───────┬───────┘
           │              │
    ┌──────▼──────────────▼──────┐
    │   Plugin Registry API       │
    │   (registerShape)           │
    └──────┬──────────────────────┘
           │
    ┌──────┴──────────────────────┐
    │                             │
┌───▼────────┐  ┌────────────┐  ┌─────────────┐
│ square.js  │  │rectangle.js│  │  curve.js   │
│  插件层    │  │   插件层   │  │   插件层    │
└────────────┘  └────────────┘  └─────────────┘
```

### 调用流程

```
用户操作 → 框架层 → 插件注册表 → 具体插件

示例：缩放矩形
1. 用户拖动矩形角手柄
2. ui.js 检测到缩放操作
3. ui.js 调用：plugin.handleScale(element, scaleInfo)
4. rectangle.js 处理缩放逻辑
5. rectangle.js 返回新的props
6. ui.js 更新元素并重新渲染
```

---

## 📝 框架层职责

### core.js（画布管理）
```javascript
职责：
✓ 管理elements数组
✓ 注册/查找插件（registerShape, getPlugin）
✓ 坐标转换（manimToCanvas, canvasToManim）
✓ 渲染循环（遍历elements，调用plugin.render）
✓ 历史管理（undo/redo）
✓ 数据持久化（localStorage）

禁止：
✗ 包含特定图形的逻辑（if type === 'rectangle'）
✗ 硬编码图形属性
```

### ui.js（交互管理）
```javascript
职责：
✓ 事件监听（鼠标、键盘）
✓ 工具箱管理（遍历插件生成按钮）
✓ 属性面板管理（根据plugin.properties生成）
✓ 拖动/缩放调度（检测操作类型，调用插件方法）

禁止：
✗ 直接计算特定图形的缩放（if type === 'rectangle'）
✗ 硬编码图形的移动逻辑
```

### export.js（导出管理）
```javascript
职责：
✓ 遍历elements，调用plugin.toManim()
✓ 组装完整的Python代码
✓ JSON导出（调用plugin.toJSON或默认序列化）

禁止：
✗ 包含特定图形的导出逻辑
```

---

## 🔌 插件层职责

### 插件完全自主处理

```javascript
一个完整的插件应该能够：

1. 创建 ✓
   - createDefault(): 创建默认实例

2. 显示 ✓
   - render(): Canvas绘制
   - getControlPoints(): 返回控制点（可选）

3. 交互 ✓
   - hitTest(): 碰撞检测
   - getBounds(): 边界框
   - handleScale(): 缩放逻辑
   - handleMove(): 移动逻辑
   - updateControlPoint(): 控制点更新（可选）

4. 绘制 ✓
   - updateWhileDrawing(): 拖动绘制时更新

5. 导出 ✓
   - toManim(): 生成Python代码
   - toJSON(): 序列化（可选）

6. 导入 ✓
   - fromJSON(): 反序列化（可选）

7. 配置 ✓
   - properties: 属性定义
   - capabilities: 能力声明
   - drawMode: 绘制模式
```

---

## 🔄 通用缩放算法（框架提供）

### 框架提供辅助函数

```javascript
// 在 core.js 中提供通用缩放辅助
ManimEditor.scaleHelpers = {
    // 计算固定点
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
    
    // 计算新角位置
    getNewCornerPosition: function(corner, fixedPoint, newWidth, newHeight) {
        const positions = {
            'topLeft': { 
                x: fixedPoint.x - newWidth, 
                y: fixedPoint.y + newHeight 
            },
            'topRight': { 
                x: fixedPoint.x + newWidth, 
                y: fixedPoint.y + newHeight 
            },
            'bottomRight': { 
                x: fixedPoint.x + newWidth, 
                y: fixedPoint.y - newHeight 
            },
            'bottomLeft': { 
                x: fixedPoint.x - newWidth, 
                y: fixedPoint.y - newHeight 
            }
        };
        
        return positions[corner];
    },
    
    // 保持宽高比
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
};
```

**插件使用示例：**
```javascript
handleScale: function(element, scaleInfo, editor) {
    const { corner, fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
    
    // 使用框架提供的辅助函数
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
    
    return { width: newWidth, height: newHeight, x: newCenterX, y: newCenterY };
}
```

---

## 📦 插件示例

### 示例1：简单矩形插件（完整版）

```javascript
// js/plugins/rectangle.js

registerShape({
    type: 'rectangle',
    name: '矩形',
    icon: '▭',
    version: '2.0.0',
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
    },
    
    render: function(ctx, element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const width = (props.width || 2) * 50;
        const height = (props.height || 1) * 50;
        
        ctx.fillStyle = props.color || '#3498db';
        ctx.globalAlpha = props.opacity !== undefined ? props.opacity : 1;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        const x = pos.x - width / 2;
        const y = pos.y - height / 2;
        
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        
        // 中心点
        ctx.fillStyle = '#e74c3c';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    
    updateWhileDrawing: function(element, startCoord, currentCoord) {
        const width = Math.abs(currentCoord.manimX - startCoord.manimX);
        const height = Math.abs(currentCoord.manimY - startCoord.manimY);
        const centerX = (currentCoord.manimX + startCoord.manimX) / 2;
        const centerY = (currentCoord.manimY + startCoord.manimY) / 2;
        
        element.props.width = width;
        element.props.height = height;
        element.props.x = centerX;
        element.props.y = centerY;
    },
    
    hitTest: function(element, manimX, manimY) {
        const props = element.props;
        const halfWidth = props.width / 2;
        const halfHeight = props.height / 2;
        
        return Math.abs(manimX - props.x) <= halfWidth &&
               Math.abs(manimY - props.y) <= halfHeight;
    },
    
    getBounds: function(element, editor) {
        const props = element.props;
        const pos = editor.manimToCanvas(props.x, props.y);
        const w = (props.width || 2) * 50;
        const h = (props.height || 1) * 50;
        
        return { 
            x: pos.x - w/2, 
            y: pos.y - h/2, 
            w, 
            h 
        };
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
    
    handleMove: function(element, moveInfo) {
        return {
            x: moveInfo.currentPoint.x - moveInfo.offset.x,
            y: moveInfo.currentPoint.y - moveInfo.offset.y
        };
    },
    
    toManim: function(element) {
        const props = element.props;
        const varName = sanitizeVariableName(element.name);
        const width = formatNumber(props.width || 2);
        const height = formatNumber(props.height || 1);
        const color = hexToManimColor(props.color || '#3498db');
        const x = formatNumber(props.x);
        const y = formatNumber(props.y);
        
        let code = `${varName} = Rectangle(width=${width}, height=${height}, color=${color})`;
        
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
        { key: 'width', label: '宽度', type: 'number', step: 0.1, min: 0.1 },
        { key: 'height', label: '高度', type: 'number', step: 0.1, min: 0.1 },
        { key: 'color', label: '颜色', type: 'color' },
        { key: 'opacity', label: '不透明度', type: 'number', step: 0.1, min: 0, max: 1 }
    ]
});
```

---

### 示例2：曲线插件（带控制点）

```javascript
// js/plugins/curve.js

registerShape({
    type: 'curve',
    name: '曲线',
    icon: '〰️',
    drawMode: 'multiClick',
    
    capabilities: {
        hasControlPoints: true,  // 关键：声明有控制点
        scalable: true
    },
    
    // ... createDefault, render 等基础方法
    
    getControlPoints: function(element, editor) {
        if (!element.props.points) return null;
        
        return element.props.points.map((point, index) => ({
            id: `p${index}`,
            x: point[0],
            y: point[1],
            type: index === 0 || index === element.props.points.length - 1 
                ? 'endpoint' 
                : 'control',
            // 自定义渲染（可选）
            render: function(ctx, canvasX, canvasY, isSelected) {
                const color = this.type === 'endpoint' ? '#e74c3c' : '#3498db';
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }));
    },
    
    updateControlPoint: function(element, pointId, newX, newY) {
        const index = parseInt(pointId.substring(1));
        const newPoints = [...element.props.points];
        newPoints[index] = [newX, newY, 0];
        return { points: newPoints };
    },
    
    handleScale: function(element, scaleInfo, editor) {
        // 曲线的缩放：缩放所有控制点
        const { fixedPoint, currentPoint, isShift, originalProps } = scaleInfo;
        const points = originalProps.points;
        
        // 计算包围盒
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        const width = maxX - minX;
        const height = maxY - minY;
        
        // 计算缩放比例
        let newWidth = Math.abs(currentPoint.x - fixedPoint.x);
        let newHeight = Math.abs(currentPoint.y - fixedPoint.y);
        
        if (isShift) {
            const result = editor.scaleHelpers.maintainAspectRatio(
                newWidth, newHeight, width, height
            );
            newWidth = result.width;
            newHeight = result.height;
        }
        
        const scaleX = width > 0 ? newWidth / width : 1;
        const scaleY = height > 0 ? newHeight / height : 1;
        
        // 计算新中心
        const newCorner = editor.scaleHelpers.getNewCornerPosition(
            scaleInfo.corner, fixedPoint, newWidth, newHeight
        );
        const newCenterX = (fixedPoint.x + newCorner.x) / 2;
        const newCenterY = (fixedPoint.y + newCorner.y) / 2;
        
        // 缩放所有控制点
        const newPoints = points.map(p => [
            newCenterX + (p[0] - center.x) * scaleX,
            newCenterY + (p[1] - center.y) * scaleY,
            0
        ]);
        
        return { points: newPoints };
    }
});
```

---

## 🚀 框架层重构计划

### 步骤1：提取缩放辅助函数

```javascript
// 在 core.js 中添加
ManimEditor.scaleHelpers = {
    getFixedPoint(corner, center, width, height) { ... },
    getNewCornerPosition(corner, fixedPoint, width, height) { ... },
    maintainAspectRatio(newW, newH, oldW, oldH) { ... }
};
```

### 步骤2：重构ui.js的handleScaleDrag

```javascript
// 旧代码（硬编码）：
if (element.type === 'square') {
    // 100行的缩放逻辑
} else if (element.type === 'rectangle') {
    // 100行的缩放逻辑
} ...

// 新代码（插件化）：
const plugin = ManimEditor.shapeRegistry[element.type];
if (plugin && plugin.handleScale) {
    const newProps = plugin.handleScale(element, scaleInfo, ManimEditor);
    updateElement(element.id, newProps);
} else {
    // 使用默认缩放逻辑（基于getBounds）
    const newProps = defaultScaleHandler(element, scaleInfo);
    updateElement(element.id, newProps);
}
```

### 步骤3：重构拖动逻辑

```javascript
// ui.js 中
const plugin = ManimEditor.shapeRegistry[element.type];
if (plugin && plugin.handleMove) {
    const newProps = plugin.handleMove(element, moveInfo, ManimEditor);
    updateElement(element.id, newProps);
}
```

### 步骤4：重构绘制更新逻辑

```javascript
// ui.js 中
function updateTempElement(canvasX, canvasY) {
    if (!ManimEditor.tempElement) return;
    
    const plugin = ManimEditor.shapeRegistry[ManimEditor.tempElement.type];
    if (plugin && plugin.updateWhileDrawing) {
        plugin.updateWhileDrawing(
            ManimEditor.tempElement,
            ManimEditor.drawStart,
            { canvasX, canvasY, manimX: ..., manimY: ... },
            ManimEditor
        );
    }
    
    render();
}
```

---

## 📋 迁移检查清单

### 现有插件需要添加的方法

- [x] square.js
  - [ ] getBounds()
  - [ ] handleScale()
  - [ ] handleMove()
  - [ ] updateWhileDrawing()

- [x] rectangle.js
  - [ ] getBounds()
  - [ ] handleScale()
  - [ ] handleMove()
  - [ ] updateWhileDrawing()

- [x] arrow.js
  - [ ] getBounds()
  - [ ] handleScale()
  - [ ] handleMove()
  - [ ] updateWhileDrawing()

- [x] line.js
  - [ ] getBounds()
  - [ ] handleScale()
  - [ ] handleMove()
  - [ ] updateWhileDrawing()

- [x] curve.js
  - [ ] getBounds()
  - [ ] handleScale()
  - [ ] handleMove()
  - [ ] getControlPoints()
  - [ ] updateControlPoint()

- [x] coordinateSystem.js
  - [ ] getBounds()
  - [ ] handleScale()
  - [ ] handleMove()
  - [ ] updateWhileDrawing()

### 框架层需要重构的函数

- [ ] ui.js
  - [ ] handleScaleDrag() → 调用plugin.handleScale()
  - [ ] 拖动移动逻辑 → 调用plugin.handleMove()
  - [ ] updateTempElement() → 调用plugin.updateWhileDrawing()
  - [ ] findControlPoint() → 调用plugin.getControlPoints()

- [ ] core.js
  - [ ] 添加scaleHelpers辅助函数
  - [ ] getElementBounds() → 调用plugin.getBounds()

---

## 🎯 迁移策略

### 阶段1：向后兼容（当前）
```javascript
// 保持现有代码工作
// 同时添加插件接口

if (plugin.handleScale) {
    // 新接口
    plugin.handleScale(...)
} else {
    // 旧的硬编码逻辑（兜底）
    if (element.type === 'rectangle') { ... }
}
```

### 阶段2：逐步迁移
```javascript
// 一个个插件添加新方法
// 测试通过后移除硬编码
```

### 阶段3：完全插件化
```javascript
// 移除所有硬编码
// 完全依赖插件接口
```

---

## 🔮 未来扩展示例

### 新图形：Circle（圆形）

```javascript
// js/plugins/circle.js

registerShape({
    type: 'circle',
    name: '圆形',
    icon: '⭕',
    drawMode: 'drag',  // 从中心拖动半径
    
    createDefault: function(x, y) {
        return {
            type: 'circle',
            props: { x, y, radius: 1, color: '#3498db' }
        };
    },
    
    updateWhileDrawing: function(element, start, current) {
        const dx = current.manimX - start.manimX;
        const dy = current.manimY - start.manimY;
        element.props.radius = Math.sqrt(dx*dx + dy*dy);
    },
    
    handleScale: function(element, scaleInfo, editor) {
        const { fixedPoint, currentPoint, originalProps } = scaleInfo;
        
        // 圆形：改变半径，中心移动
        const newRadius = Math.abs(currentPoint.x - fixedPoint.x);
        const newCenterX = (fixedPoint.x + currentPoint.x) / 2;
        const newCenterY = (fixedPoint.y + currentPoint.y) / 2;
        
        return { radius: newRadius, x: newCenterX, y: newCenterY };
    },
    
    toManim: function(element) {
        const r = formatNumber(element.props.radius);
        const x = formatNumber(element.props.x);
        const y = formatNumber(element.props.y);
        const color = hexToManimColor(element.props.color);
        
        let code = `${varName} = Circle(radius=${r}, color=${color})`;
        if (x !== 0 || y !== 0) {
            code += `.move_to([${x}, ${y}, 0])`;
        }
        return code;
    },
    
    properties: [
        { key: 'x', label: 'X坐标', type: 'number' },
        { key: 'y', label: 'Y坐标', type: 'number' },
        { key: 'radius', label: '半径', type: 'number', min: 0.1 },
        { key: 'color', label: '颜色', type: 'color' }
    ]
});

// 完成！不需要修改任何框架代码！
```

---

## 📊 插件接口兼容性矩阵

| 方法 | 必需 | 可选 | 默认行为 |
|------|------|------|----------|
| type | ✅ | - | - |
| name | ✅ | - | 使用type |
| icon | ✅ | - | 使用'■' |
| createDefault | ✅ | - | - |
| render | ✅ | - | - |
| hitTest | ✅ | - | - |
| toManim | ✅ | - | - |
| getBounds | - | ✅ | 使用hitTest猜测 |
| handleScale | - | ✅ | 基于getBounds的默认缩放 |
| handleMove | - | ✅ | 移动中心点 |
| updateWhileDrawing | - | ✅ | 不支持拖动绘制 |
| getControlPoints | - | ✅ | null |
| updateControlPoint | - | ✅ | 不支持 |
| properties | - | ✅ | 空数组 |
| capabilities | - | ✅ | 全部true |

---

## 🎓 插件开发指南

### 开发流程

1. **创建插件文件**
   ```bash
   touch js/plugins/myshape.js
   ```

2. **实现接口**
   ```javascript
   registerShape({
       type: 'myshape',
       name: '我的图形',
       // ... 实现各个方法
   });
   ```

3. **引入插件**
   ```html
   <!-- index.html -->
   <script src="js/plugins/myshape.js"></script>
   ```

4. **测试**
   - 刷新浏览器
   - 工具箱自动出现新按钮
   - 测试绘制、移动、缩放、导出

### 最佳实践

1. **使用辅助函数**
   - `editor.scaleHelpers.*` 处理缩放
   - `editor.manimToCanvas()` 坐标转换
   - `formatNumber()`, `hexToManimColor()` 格式化

2. **错误处理**
   ```javascript
   render: function(ctx, element, editor) {
       if (!element.props.radius || element.props.radius <= 0) {
           console.warn('Invalid radius');
           return;
       }
       // ... 正常渲染
   }
   ```

3. **性能优化**
   ```javascript
   // 缓存计算结果
   // 避免在render中进行复杂计算
   ```

---

## 📚 相关文档

- `PLUGIN_API_REFERENCE.md` - 完整API参考（待创建）
- `PLUGIN_TUTORIAL.md` - 插件开发教程（待创建）
- `MIGRATION_GUIDE.md` - 迁移指南（待创建）

---

**文档版本：** 2.0.0  
**最后更新：** 2025-11-02  
**状态：** 设计阶段


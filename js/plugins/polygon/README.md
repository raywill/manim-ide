# Polygon 插件 - 正N边形

## 功能描述

正N边形（Regular Polygon）插件，支持绘制任意边数的正多边形。

## 特性

- **灵活的边数**：支持3到512边的正多边形
- **默认正六边形**：N=6
- **拖动绘制**：从中心点向外拖动定义半径
- **填充与边框**：支持分离的填充色和边框色
- **透明填充**：支持设置填充透明度（0-1）
- **等比例缩放**：保持正多边形的形状

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `x` | number | 0 | 中心X坐标（Manim单位） |
| `y` | number | 0 | 中心Y坐标（Manim单位） |
| `radius` | number | 1.5 | 外接圆半径（Manim单位） |
| `n` | number | 6 | 边数（3-512） |
| `fill_color` | color | #e74c3c | 填充颜色 |
| `fill_opacity` | number | 1 | 填充不透明度（0-1） |
| `stroke_color` | color | #2c3e50 | 边框颜色 |
| `stroke_width` | number | 2 | 边框宽度 |

## 使用方法

### 绘制

1. 点击工具栏的"正多边形"按钮（⬡图标）
2. 在画布上点击并拖动：
   - 起点：多边形中心
   - 拖动距离：多边形半径

### 修改边数

1. 选中正多边形
2. 在属性面板修改"边数"（N）
3. 常见值：
   - N=3: 正三角形（等边三角形）
   - N=4: 正方形
   - N=5: 正五边形
   - N=6: 正六边形
   - N=8: 正八边形
   - N=12: 正十二边形

### 导出到Manim

正N边形导出为Manim的 `RegularPolygon` 类：

```python
polygon_1 = RegularPolygon(n=6, radius=1.50).move_to([0.00, 0.00, 0]).set_fill(RED, 1.00).set_stroke(BLACK, width=2.00)
```

## 实现细节

### 顶点计算

顶点均匀分布在外接圆上，从12点钟方向开始：

```javascript
for (let i = 0; i < n; i++) {
    const angle = (Math.PI / 2) + (2 * Math.PI * i / n);
    const vx = centerX + radius * Math.cos(angle);
    const vy = centerY + radius * Math.sin(angle);
}
```

### 碰撞检测

使用射线法（Ray Casting Algorithm）判断点是否在多边形内部。

### 缩放行为

正多边形采用等比例缩放，使用较小的缩放因子以保持形状：

```javascript
const scale = Math.min(Math.abs(scaleX), Math.abs(scaleY));
newRadius = radius * scale;
```

## 测试

运行测试：

```bash
node js/plugins/polygon/polygon.test.js
```

## 兼容性

- **Manim版本**：需要 `RegularPolygon` 类支持
- **浏览器**：现代浏览器（支持Canvas API）


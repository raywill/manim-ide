# Arc 插件 - 圆弧

## 功能描述

Arc（圆弧）插件，支持绘制任意角度范围的圆弧。

## 特性

- **灵活的角度**：支持 0-360 度的圆弧
- **可调半径**：支持任意半径
- **粗线条**：默认线宽 30，适合强调
- **等比例缩放**：缩放只改变半径，不改变角度
- **Z-Order 支持**：可控制显示层级

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `x` | number | 0 | 中心X坐标（Manim单位） |
| `y` | number | 0 | 中心Y坐标（Manim单位） |
| `radius` | number | 1 | 半径（Manim单位） |
| `start_angle` | number | 0 | 起始角度（度数，0-360） |
| `end_angle` | number | 90 | 结束角度（度数，0-360） |
| `stroke_color` | color | #e74c3c | 线条颜色 |
| `stroke_width` | number | 30 | 线宽 |
| `z_order` | number | 0 | Z序 |

## 使用方法

### 绘制

1. 点击工具栏的"圆弧"按钮（◡图标）
2. 在画布上点击并拖动：
   - 起点：圆弧中心
   - 拖动距离：圆弧半径

### 调整角度

1. 选中圆弧
2. 在属性面板修改：
   - **起始角度**：圆弧开始的角度
   - **结束角度**：圆弧结束的角度

### 角度说明

- **0度**：指向右侧（3点钟方向）
- **90度**：指向上方（12点钟方向）
- **180度**：指向左侧（9点钟方向）
- **270度**：指向下方（6点钟方向）

### 常见圆弧

- 1/4 圆：start=0, end=90
- 半圆：start=0, end=180
- 3/4 圆：start=0, end=270
- 全圆：start=0, end=360
- 下半圆：start=180, end=360

### 缩放行为

- **等比例缩放**：只改变半径
- **角度不变**：start_angle 和 end_angle 保持不变
- 拖动任意角 → 半径按比例缩放

### 导出到Manim

圆弧导出为Manim的 `Arc` 类：

```python
arc_1 = Arc(radius=1.50, start_angle=0.00, angle=1.57).move_to([0.00, 0.00, 0]).set_stroke(RED, width=10.00)
```

**注意**：
- Manim 使用弧度制
- `start_angle`：起始角度（弧度）
- `angle`：圆弧张角（弧度），即 (end_angle - start_angle)

## 实现细节

### 角度转换

IDE 使用度数（0-360），Manim 使用弧度：

```javascript
startRad = startAngle * PI / 180
angleSpan = (endAngle - startAngle) * PI / 180
```

### 坐标系适配

- **Manim**：Y轴向上，逆时针为正
- **Canvas**：Y轴向下，顺时针为正
- **转换**：`canvasAngle = -manimAngle`

### 碰撞检测

使用两步检测：
1. 径向检测：距离圆心的距离是否接近半径
2. 角度检测：角度是否在 [start_angle, end_angle] 范围内

### 边界框计算

计算圆弧涉及的极值点：
- 起点和终点
- 0°, 90°, 180°, 270° 的交点（如果在范围内）

## 测试

运行测试：

```bash
node js/plugins/arc/arc.test.js
```

## 使用示例

```javascript
// 创建 1/4 圆弧
const arc = {
    type: 'arc',
    props: {
        x: 0, y: 0,
        radius: 2,
        start_angle: 0,
        end_angle: 90,
        stroke_color: '#e74c3c',
        stroke_width: 10
    }
};
```

## 版本

- 1.0.0 (2025-11-02) - 初始版本

## 兼容性

- **Manim版本**：需要 `Arc` 类支持
- **浏览器**：现代浏览器（支持Canvas API）


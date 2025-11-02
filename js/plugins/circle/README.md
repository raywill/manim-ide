# Circle 插件

圆形图形插件，支持拖动绘制、缩放和移动。

## 数学特征

**方程：** `(x-h)² + (y-k)² = r²`

**参数：**
- 中心：(h, k)
- 半径：r

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| x | number | 0 | 中心X坐标 |
| y | number | 0 | 中心Y坐标 |
| radius | number | 1 | 半径 |
| color | string | #3498db | 颜色 |
| opacity | number | 1 | 不透明度 |

## 交互方式

### 绘制
1. 点击"圆形"工具
2. 在画布上按下鼠标（确定中心）
3. 拖动到边缘（确定半径）
4. 释放鼠标

### 移动
- 拖动圆形可移动中心点

### 缩放
- 拖动四角手柄改变半径
- 始终保持圆形（等比例）
- 对角保持固定

## Manim导出

```python
circle_1 = Circle(radius=1.5, color=BLUE).move_to([0, 0, 0])
```

## 测试

```bash
node js/plugins/circle/circle.test.js
```

## 使用示例

```javascript
// 创建圆形
const circle = ManimEditor.shapeRegistry['circle'].createDefault(0, 0);
circle.props.radius = 2;
circle.props.color = '#e74c3c';

// 添加到场景
addElement(circle);
```

## 版本

- 1.0.0 (2025-11-02) - 初始版本

## 作者

Manim IDE Team


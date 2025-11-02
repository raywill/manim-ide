# Ellipse 插件

椭圆图形插件，支持拖动绘制、不等比缩放。

## 数学特征

**方程：** `(x-h)²/a² + (y-k)²/b² = 1`

**参数：**
- 中心：(h, k)
- 长半轴：a = width/2
- 短半轴：b = height/2

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| x | number | 0 | 中心X坐标 |
| y | number | 0 | 中心Y坐标 |
| width | number | 2 | 宽度（2a） |
| height | number | 1 | 高度（2b） |
| color | string | #9b59b6 | 颜色 |
| opacity | number | 1 | 不透明度 |

## 交互方式

### 绘制
类似矩形：拖动设置宽度和高度

### 缩放
- 不按Shift：可以不等比缩放（变成扁或高的椭圆）
- 按Shift：等比例缩放（保持原始宽高比）

## Manim导出

```python
ellipse_1 = Ellipse(width=3, height=2, color=PURPLE).move_to([0, 0, 0])
```

## 测试

```bash
node js/plugins/ellipse/ellipse.test.js
```

## 版本

- 1.0.0 (2025-11-02) - 初始版本


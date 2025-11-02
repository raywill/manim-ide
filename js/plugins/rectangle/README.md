# Rectangle 插件

矩形图形插件。

## 属性

| 属性 | 默认值 | 说明 |
|------|--------|------|
| x | 0 | 中心X坐标 |
| y | 0 | 中心Y坐标 |
| width | 2 | 宽度 |
| height | 1 | 高度 |
| color | #3498db | 颜色 |
| opacity | 1 | 不透明度 |

## 交互

- **绘制：** 拖动绘制
- **移动：** 拖动中心
- **缩放：** 拖动四角，Shift键等比例

## Manim导出

```python
rect_1 = Rectangle(width=2, height=1, color=BLUE).move_to([0, 0, 0])
```

## 版本

- 2.0.0-migrated - 插件化v2.0

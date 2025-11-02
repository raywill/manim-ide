# Parabola 插件

抛物线函数图形插件。

## 数学特征

**方程：** `y = a(x-h)² + k`

**参数：**
- (h, k)：顶点坐标
- a：二次项系数（控制开口大小和方向）

## 属性

| 属性 | 默认值 | 说明 |
|------|--------|------|
| vertex_x | 0 | 顶点X坐标 |
| vertex_y | 0 | 顶点Y坐标 |
| a | 1 | 二次项系数 |
| x_start | -2 | X范围起点 |
| x_end | 2 | X范围终点 |
| samples | 50 | 采样点数 |

## Manim导出

```python
parabola_1 = FunctionGraph(lambda x: 1 * (x - 0)**2 + 0, x_range=[-2, 2], color=ORANGE)
```

## 版本

- 1.0.0 (2025-11-02) - 初始版本


# Sine 插件

正弦函数图形插件。

## 数学特征

**方程：** `y = A·sin(ω·x + φ) + k`

**参数：**
- A：振幅（amplitude）
- ω：角频率（frequency）
- φ：相位（phase）
- k：垂直偏移（y坐标）

## 属性

| 属性 | 默认值 | 说明 |
|------|--------|------|
| amplitude | 1 | 振幅 |
| frequency | 1 | 频率 |
| phase | 0 | 相位 |
| x_start | -π | X范围起点 |
| x_end | π | X范围终点 |
| samples | 100 | 采样点数 |

## Manim导出

```python
sine_1 = FunctionGraph(lambda x: 1 * np.sin(1 * x), x_range=[-3.14, 3.14], color=RED)
```

## 版本

- 1.0.0 (2025-11-02) - 初始版本


# Function 插件

自定义函数可视化插件，支持用户输入数学表达式并在矩形视窗内绘制函数曲线。

## 特点

- **矩形视窗框架**：透明无背景，(0,0) 点位于视窗中心
- **自定义函数**：支持输入数学表达式（如 `sin(x) * exp(-x/2)`、`x^2 + 3`）
- **轴向缩放**：独立的 X/Y 轴缩放倍数，在相同视窗显示更大范围
- **自动容错**：函数计算失败时自动返回 y=0
- **支持 math.js**：如果页面加载了 math.js，自动使用其强大的表达式解析能力

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| x | number | 0 | 视窗中心X坐标 |
| y | number | 0 | 视窗中心Y坐标 |
| width | number | 4 | 视窗宽度（Manim单位） |
| height | number | 4 | 视窗高度（Manim单位） |
| expression | string | `sin(x) * exp(-x/2)` | 函数表达式 |
| x_scale | number | 1 | X轴缩放倍数 |
| y_scale | number | 1 | Y轴缩放倍数 |
| color | string | `#3498db` | 曲线颜色 |
| stroke_width | number | 2 | 线宽 |
| samples | number | 200 | 采样点数（50-500） |
| z_order | number | 0 | 渲染层级 |

## 使用方法

1. **绘制函数图形**：
   - 在工具箱选择 `ƒ` 图标
   - 在画布上拖动创建视窗
   
2. **修改函数表达式**：
   - 双击图形打开属性面板
   - 在"函数表达式"输入框中输入表达式
   - 支持的运算符：`+`, `-`, `*`, `/`, `^`, `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`, `abs` 等

3. **调整显示范围**：
   - **X轴缩放**：增大值可在相同视窗显示更宽的 x 范围（如设为 2，显示范围加倍）
   - **Y轴缩放**：增大值可显示更大的 y 值范围（如设为 2，y 轴压缩一半）

4. **示例表达式**：
   - `sin(x) * exp(-x/2)` - 衰减正弦波
   - `x^2 - 2*x + 1` - 二次函数
   - `1 / (1 + exp(-x))` - Sigmoid 函数
   - `sin(3*x) + cos(5*x)` - 多频叠加

## 导出到 Manim

插件会生成 `FunctionGraph` 代码，自动：
- 将表达式转换为 Python lambda（`^` → `**`，`sin` → `np.sin` 等）
- 根据 x_scale 和 y_scale 调整函数范围和幅度
- 使用 `shift()` 定位视窗中心

### 示例导出代码

```python
function_1 = FunctionGraph(
    lambda x: (np.sin(x) * np.exp(-x/2)) / 1, 
    x_range=[-2.00, 2.00], 
    color=BLUE
).shift([0.00, 0.00, 0])
```

## 注意事项

- 函数表达式语法同时支持 JavaScript 和 math.js
- 如果计算失败（除零、超出范围等），该点自动取 y=0
- hitTest 和 getBounds 基于视窗矩形，不考虑实际曲线形状
- 采样点数影响曲线平滑度和渲染性能


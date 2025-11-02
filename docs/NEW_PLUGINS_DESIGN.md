# 新插件设计文档

## 📋 插件分析

### 1. Circle（圆形）

**数学特征：**
- 方程：(x-h)² + (y-k)² = r²
- 参数：中心(h, k)，半径r

**属性定义：**
```javascript
props: {
    x: number,        // 中心X
    y: number,        // 中心Y
    radius: number,   // 半径
    color: string,
    opacity: number
}
```

**交互设计：**
- 绘制：从中心拖动到边缘（确定半径）
- 移动：拖动整体移动中心
- 缩放：改变半径（等比例）
- 控制点：无（或可选：半径控制点）

**Manim导出：**
```python
circle = Circle(radius=1.5, color=BLUE).move_to([0, 0, 0])
```

---

### 2. Sine（正弦函数）

**数学特征：**
- 方程：y = A·sin(ω·x + φ) + k
- 参数：振幅A，角频率ω，相位φ，偏移k

**属性定义：**
```javascript
props: {
    x: number,          // 函数图像中心X
    y: number,          // 函数图像中心Y（偏移k）
    amplitude: number,  // 振幅A（默认1）
    frequency: number,  // 频率（周期的倒数，默认1）
    phase: number,      // 相位φ（默认0）
    x_start: number,    // X范围起点（默认-2π）
    x_end: number,      // X范围终点（默认2π）
    samples: number,    // 采样点数（默认100）
    color: string
}
```

**交互设计：**
- 绘制：拖动设置X范围，振幅使用默认值
- 移动：平移整条曲线
- 缩放：改变振幅和X范围
- 控制点：可选（振幅控制点）

**实现方式：**
- 采样：在x_start到x_end之间采样
- 绘制：连接采样点为平滑曲线
- Manim：使用FunctionGraph或VMobject

**Manim导出：**
```python
import numpy as np
sine = VMobject(color=BLUE)
points = [[x, np.sin(x), 0] for x in np.linspace(-6.28, 6.28, 100)]
sine.set_points_as_corners(points)
```

---

### 3. Ellipse（椭圆）

**数学特征：**
- 方程：(x-h)²/a² + (y-k)²/b² = 1
- 参数：中心(h,k)，长半轴a，短半轴b

**属性定义：**
```javascript
props: {
    x: number,        // 中心X
    y: number,        // 中心Y
    width: number,    // 宽度（2a）
    height: number,   // 高度（2b）
    color: string,
    opacity: number
}
```

**交互设计：**
- 绘制：拖动设置宽高（类似矩形）
- 移动：移动中心
- 缩放：改变宽高（可不等比）
- 旋转：暂不支持（v2.1）

**Manim导出：**
```python
ellipse = Ellipse(width=3, height=2, color=BLUE).move_to([0, 0, 0])
```

---

### 4. Parabola（抛物线）

**数学特征：**
- 方程：y = a(x-h)² + k
- 参数：顶点(h,k)，系数a

**属性定义：**
```javascript
props: {
    vertex_x: number,   // 顶点X
    vertex_y: number,   // 顶点Y
    a: number,          // 二次项系数（默认1，控制开口大小和方向）
    x_start: number,    // X范围起点
    x_end: number,      // X范围终点
    samples: number,    // 采样点数
    color: string
}
```

**交互设计：**
- 绘制：点击设置顶点，拖动设置范围和开口
- 移动：移动顶点
- 缩放：改变a和范围
- 控制点：顶点控制点

**Manim导出：**
```python
import numpy as np
parabola = VMobject(color=BLUE)
points = [[x, (x-h)**2 + k, 0] for x in np.linspace(-3, 3, 50)]
parabola.set_points_as_corners(points)
```

---

## 📐 设计决策

### 函数类图形（Sine, Parabola）的共同特点

**采样渲染：**
- 不存储所有点，只存储参数
- 渲染时根据参数计算采样点
- 采样点数可配置（性能vs平滑度）

**移动策略：**
- Sine：平移整条曲线（修改y偏移）
- Parabola：移动顶点

**缩放策略：**
- 纵向：改变振幅/系数a
- 横向：改变x范围

---

## 🎯 实现优先级

1. **Circle**（最简单）
   - 类似矩形，单一尺寸参数
   - 验证插件系统

2. **Ellipse**（中等）
   - 类似矩形，两个尺寸参数
   - 测试不等比缩放

3. **Sine**（复杂）
   - 函数类图形
   - 测试采样渲染

4. **Parabola**（复杂）
   - 类似Sine
   - 测试参数化曲线

---

## 📦 目录结构

```
js/plugins/
├── circle/
│   ├── circle.js        # 插件主文件
│   ├── circle.test.js   # 测试代码
│   └── README.md        # 文档
├── sine/
│   ├── sine.js
│   ├── sine.test.js
│   └── README.md
├── ellipse/
│   ├── ellipse.js
│   ├── ellipse.test.js
│   └── README.md
└── parabola/
    ├── parabola.js
    ├── parabola.test.js
    └── README.md
```

---

## 🧪 测试要求

每个插件的测试应包含：

1. **基础测试**
   - createDefault
   - render（不报错）
   - hitTest（点击检测）
   - getBounds（边界框精确性）

2. **交互测试**
   - updateWhileDrawing（拖动绘制）
   - handleMove（移动）
   - handleScale（缩放，四个角）
   - 固定点不变

3. **导出测试**
   - toManim（代码格式）
   - Manim可执行性

4. **边界测试**
   - 极小值（radius=0.1）
   - 极大值
   - 特殊情况

---

**文档版本：** 1.0.0  
**创建日期：** 2025-11-02


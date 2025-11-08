# Brace 插件

大括号标注插件，完全兼容 Manim 的 `BraceBetweenPoints`。

## 📐 功能特性

- ✅ **拖动式绘制**：类似箭头，拖动从起点到终点
- ✅ **简洁几何风格**：使用6段直线段绘制，清晰锐利，类似数学教材风格
- ✅ **支持任意角度**：水平、垂直、斜向都能完美支持
- ✅ **方向控制点**：拖动中间尖端可调整方向和间距
- ✅ **尖端锚点可视化**：选中时显示蓝色尖端控制点（与贝塞尔一致），提示可拖拽
- ✅ **完全兼容 Manim**：导出的代码使用 `BraceBetweenPoints`

## 🎨 使用方法

### 1. 绘制大括号

1. 点击工具栏的 **"大括号"** 按钮（图标：{）
2. 在画布上拖动绘制
3. 释放鼠标完成绘制

### 2. 调整方向

有两种方式：

**方式A：使用属性面板**
- 选中大括号
- 在属性面板选择"方向"
  - `左侧（逆时针90°）`：大括号在连线左侧
  - `右侧（顺时针90°）`：大括号在连线右侧

**方式B：拖动方向控制点**
- 选中大括号
- 拖动中间的蓝色控制点
- 拖过中线会自动翻转方向

### 3. 调整参数

在属性面板中可以调整：

| 参数 | 说明 | 默认值 | 范围 |
|------|------|--------|------|
| **点1 X/Y** | 起点坐标 | - | - |
| **点2 X/Y** | 终点坐标 | - | - |
| **方向** | 左侧/右侧 | 左侧（1） | 1 或 -1 |
| **buff** | 大括号到连线的距离 | 0.2 | 0.05+ |
| **尖锐度** | 大括号的弯曲程度 | 2.0 | 0.5-3.0 |
| **颜色** | 线条颜色 | #2c3e50 | - |
| **线宽** | 线条宽度 | 2 | 0.5+ |
| **Z序** | 渲染层级 | 0 | - |

## 📊 方向说明

### 水平大括号

```
direction = 1 (左侧/向上)
    ╭───────╮
    │       │
    │   ↑   │
    
point1 ———— point2

direction = -1 (右侧/向下)
point1 ———— point2
    
    │   ↓   │
    │       │
    ╰───────╯
```

### 垂直大括号

```
direction = 1 (左侧)        direction = -1 (右侧)
point2                      point2
  │                           │
  │  ⟩                        ⟨  │
  │                           │
point1                      point1
```

### 斜向大括号

大括号会自动垂直于连线方向：
- `direction = 1`：逆时针旋转90度
- `direction = -1`：顺时针旋转90度

## 💻 Manim 导出

### 基本导出

```python
# 水平大括号
brace_1 = BraceBetweenPoints([0, 0, 0], [4, 0, 0])
brace_1.set_color(BLACK)

# 斜向大括号
brace_2 = BraceBetweenPoints([0, 0, 0], [3, 4, 0])
brace_2.set_color(BLUE)
```

### 反向大括号

```python
# 使用 direction 参数
brace_reversed = BraceBetweenPoints([0, 0, 0], [4, 0, 0], direction=-1)
brace_reversed.set_color(RED)
```

### 自定义样式

```python
brace = BraceBetweenPoints([0, 0, 0], [4, 0, 0])
brace.set_color(BLUE).set_stroke(width=3).set_z_index(1)
```

## 🎯 使用场景

### 场景1：标注矩形的边长

```python
# 创建一个矩形
rect = Rectangle(width=4, height=2)

# 标注宽度（下方）
width_brace = BraceBetweenPoints(
    rect.get_corner(DL), 
    rect.get_corner(DR),
    direction=-1
)
width_label = Text("宽度: 4").next_to(width_brace, DOWN)

# 标注高度（右侧）
height_brace = BraceBetweenPoints(
    rect.get_corner(DR),
    rect.get_corner(UR),
    direction=-1
)
height_label = Text("高度: 2").next_to(height_brace, RIGHT)
```

### 场景2：标注三角形的斜边

```python
# 创建三角形
triangle = Polygon([0,0,0], [3,0,0], [3,4,0])

# 标注斜边
hypotenuse_brace = BraceBetweenPoints([0,0,0], [3,4,0])
hypotenuse_label = Text("斜边: 5").next_to(hypotenuse_brace, LEFT)
```

### 场景3：标注数学表达式

```python
# 标注求和范围
equation = MathTex(r"\sum_{i=1}^{n} x_i")
sum_brace = BraceBetweenPoints(
    equation.get_left(),
    equation.get_right()
)
explanation = Text("所有项的和").next_to(sum_brace, DOWN)
```

## 🔧 技术细节

### 大括号几何设计

大括号采用**简洁的6段直线设计**，类似数学教材和工程图纸的风格：

```
    |  ← 起点短线段（向前倾斜45°）
    |
   /
  /─────────────┐   ┌──────────────\  ← 主线段（平行于标注对象）
                 \ /                 \
                  V  ← 尖端（60°夹角） \
                                       |  ← 终点短线段（向后倾斜45°）
                                       |
                  
point1 ══════════════════════════════════ point2
```

#### 6段线段详解

1. **起点短线段**
   - 长度：≥ 1毫米（当 buff 较大时会自动加长，确保主线共线）
   - 角度：与主线段成135°（向前外倾斜45°）
   - 作用：优雅的起始端点

2. **主线段1**（前半段）
   - 方向：平行于 point1 → point2
   - 长度：约45%的总长度
   - 作用：主要的标注线

3. **尖端线段1**
   - 长度：0.15 Manim单位
   - 角度：向外30°
   - 作用：形成V形尖端的左侧

4. **尖端线段2**
   - 长度：0.15 Manim单位
   - 角度：向外-30°（对称）
   - 作用：形成V形尖端的右侧
   - 夹角：60°

5. **主线段2**（后半段）
   - 与主线段1对称
   - 长度：约45%的总长度

6. **终点短线段**
   - 长度：≥ 1毫米（与起点对称，随 buff 自动调整）
   - 角度：与主线段成135°（向后外倾斜45°）
   - 作用：优雅的结束端点
   - 对称性：与起点短线段方向相反（向后倾斜）

### 控制点

- **point1**：起点（可拖动）
- **point2**：终点（可拖动）
- **tip**：方向控制点（可拖动，调整 direction 和 buff）

### 碰撞检测

使用点到曲线段的距离检测，阈值为 15 像素。

## 🧪 测试

在浏览器控制台运行测试：

```javascript
// 运行所有测试
BraceTests.runAll();

// 清理测试元素
BraceTests.cleanup();

// 运行单个测试
BraceTests.individual.testHorizontalBraceUp();
BraceTests.individual.testDiagonalBrace();
```

## 📝 版本历史

### v1.2.0 (当前)
- ✅ 鼠标点击位置即为括号端点（不再整体偏移）
- ✅ 控制点与渲染路径对齐，旋转锚点精准
- ✅ buff 仅影响中部形状，保持端点不动
- ✅ 选中时在尖端显示蓝色控制锚点（提示可拖拽）

### v1.1.1
- ✅ **修复**：终点短线段方向对称性
- ✅ 起点向前倾斜，终点向后倾斜（完全对称）

### v1.1.0
- ✅ **新设计**：改为简洁的6段直线几何风格
- ✅ 清晰锐利的数学教材风格
- ✅ 135°端点倾斜 + 60°V形尖端
- ✅ 性能更好（直线 vs 曲线）

### v1.0.0
- ✅ 基础功能实现
- ✅ 拖动式绘制
- ✅ 贝塞尔曲线风格（已替换）
- ✅ 方向控制点
- ✅ Manim 兼容导出

## 🐛 已知问题

无

## 🔮 未来计划

- [ ] 自动配对文字标签
- [ ] 智能吸附到对象边缘
- [ ] 预设样式（细、粗、装饰性等）
- [ ] 支持自定义尖端形状

## 📚 参考资料

- [Manim BraceBetweenPoints 文档](https://docs.manim.community/en/stable/reference/manim.mobject.svg.brace.BraceBetweenPoints.html)
- [贝塞尔曲线教程](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes#二次贝塞尔曲线)

## 📄 许可证

与主项目相同


# Manim Visual Editor

一个基于Web的Manim场景可视化编辑器，让您通过拖拽和绘制的方式创建几何形状，然后导出为Manim Python代码。

## 功能特性

### 核心功能
- 🎨 **可视化编辑**：通过拖拽和绘制的方式创建形状
- 📐 **支持多种形状**：正方形、矩形、箭头、线段、曲线、坐标系
- ⚙️ **属性编辑**：实时编辑形状的位置、大小、颜色等属性
- 📤 **代码导出**：生成标准的Manim CE Python代码
- 💾 **场景管理**：导入/导出JSON场景文件
- ↶↷ **撤销/重做**：完整的操作历史记录
- 💿 **自动保存**：使用localStorage自动保存场景

### 技术特点
- ✅ 纯静态HTML/CSS/JavaScript，无需构建工具
- ✅ 零依赖，无需外部库
- ✅ 可直接在浏览器中运行
- ✅ 可扩展的插件系统

## 快速开始

### 方式一：使用Python HTTP服务器（推荐）

```bash
# 克隆或下载项目
cd manim-ide

# 启动HTTP服务器
python3 -m http.server 8000

# 在浏览器中打开
open http://localhost:8000
```

### 方式二：使用任何HTTP服务器

```bash
# 使用Node.js的http-server
npx http-server -p 8000

# 或使用PHP
php -S localhost:8000
```

### 方式三：直接双击打开

虽然可以直接双击 `index.html` 打开，但推荐使用HTTP服务器以获得最佳体验。

## 使用指南

### 基本操作

1. **创建形状**
   - 从左侧工具箱选择形状类型
   - 在画布上拖拽绘制形状
   - 释放鼠标完成创建

2. **选择和移动**
   - 点击"选择"按钮进入选择模式
   - 点击形状选中
   - 拖拽移动形状位置

3. **编辑属性**
   - 双击形状打开属性面板
   - 修改位置、大小、颜色等属性
   - 属性会实时更新到画布

4. **导出代码**
   - 点击顶部"导出Manim代码"按钮
   - 复制或下载生成的Python代码
   - 在Manim中运行代码

### 快捷键

- `Ctrl/Cmd + Z`：撤销
- `Ctrl/Cmd + Y`：重做
- `Delete`：删除选中元素
- `Esc`：切换到选择模式/关闭面板

### 坐标系统

编辑器使用Manim的坐标系统：
- 原点(0,0)在画布中心
- X轴向右为正
- Y轴向上为正
- 1个Manim单位 = 50像素

## 支持的形状

### 1. 正方形 (Square)
- 可编辑属性：位置(x,y)、边长、颜色、不透明度

### 2. 矩形 (Rectangle)
- 可编辑属性：位置(x,y)、宽度、高度、颜色、不透明度

### 3. 箭头 (Arrow)
- 可编辑属性：起点、终点、颜色、线宽

### 4. 线段 (Line)
- 可编辑属性：起点、终点、颜色、线宽

### 5. 曲线 (Curve)
- 可编辑属性：控制点、颜色、线宽、平滑度

### 6. 坐标系 (CoordinateSystem)
- 可编辑属性：位置、x/y范围、轴长度、轴颜色、是否显示箭头

## 导出示例

创建的场景会被导出为标准的Manim代码：

```python
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        square_1 = Square(side_length=2, color=BLUE).move_to([1, 2, 0])
        arrow_1 = Arrow(start=[-2, 0, 0], end=[2, 0, 0], color=RED)
        
        # 添加所有元素到场景
        self.add(
            square_1,
            arrow_1
        )
```

## 文件结构

```
manim-ide/
├── index.html              # 主HTML文件
├── css/
│   └── style.css          # 样式文件
├── js/
│   ├── core.js           # 核心逻辑（画布管理、数据模型）
│   ├── ui.js             # UI交互（工具箱、属性面板）
│   ├── export.js         # 代码导出
│   ├── app.js            # 应用入口
│   └── plugins/          # 形状插件
│       ├── square.js
│       ├── rectangle.js
│       ├── arrow.js
│       ├── line.js
│       ├── curve.js
│       └── coordinateSystem.js
├── tests/                # 测试文件
├── temp/                 # 临时测试文件
└── README.md
```

## 扩展开发

### 添加新的形状类型

创建新的插件文件 `js/plugins/your-shape.js`：

```javascript
registerShape({
    type: 'yourShape',
    name: '你的形状',
    icon: '🔷',
    
    createDefault: function(x, y) {
        return {
            type: 'yourShape',
            name: 'shape_' + (ManimEditor.elements.length + 1),
            props: {
                x: x || 0,
                y: y || 0,
                // 其他属性...
            }
        };
    },
    
    render: function(ctx, element, editor) {
        // 在canvas上绘制形状
    },
    
    hitTest: function(element, manimX, manimY, editor) {
        // 碰撞检测逻辑
        return true/false;
    },
    
    toManim: function(element) {
        // 生成Manim代码
        return 'your_shape = YourShape(...)';
    },
    
    properties: [
        // 定义可编辑的属性
        { key: 'prop1', label: '属性1', type: 'number' }
    ]
});
```

然后在 `index.html` 中引入：

```html
<script src="js/plugins/your-shape.js"></script>
```

## 浏览器兼容性

- ✅ Chrome/Edge (推荐)
- ✅ Firefox
- ✅ Safari
- ⚠️ IE 11及以下版本不支持

## 已知限制

1. 曲线编辑功能较为基础，暂不支持手动调整控制点
2. 暂不支持文本标签
3. 暂不支持动画时间轴编辑（仅导出静态场景）
4. 大量元素时性能可能下降

## 开发路线图

- [ ] 添加Circle（圆形）插件
- [ ] 添加Text（文本）插件
- [ ] 支持多选和组合
- [ ] 添加对齐和分布工具
- [ ] 支持网格吸附
- [ ] 支持图层管理
- [ ] 支持动画时间轴编辑
- [ ] 支持导入SVG文件
- [ ] 添加更多Manim对象类型

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 相关链接

- [Manim Community Edition](https://www.manim.community/)
- [Manim Documentation](https://docs.manim.community/)

---

**Enjoy creating beautiful math animations! 🎬✨**


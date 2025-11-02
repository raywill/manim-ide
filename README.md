# Manim Visual IDE

一个完全插件化的Web端Manim场景可视化编辑器。

**版本：** v1.2.1  
**状态：** ✅ 生产就绪

---

## ✨ 特色功能

### 核心功能
- 🎨 **10种图形工具**：矩形、正方形、圆形、椭圆、箭头、线段、贝塞尔曲线、正弦函数、抛物线、坐标系
- ✏️ **拖动绘制**：实时预览，所见即所得
- 🔄 **点击式绘制**：支持任意多点贝塞尔曲线（双击完成）
- 🎯 **精确编辑**：拖动控制点调整曲线，四角缩放，Shift等比例
- 📤 **Manim代码导出**：生成标准Manim CE代码
- 💾 **场景管理**：JSON导入/导出，localStorage自动保存
- ↶↷ **撤销/重做**：完整的操作历史

### 技术特点
- 🔌 **完全插件化架构**：框架零硬编码，易于扩展
- 🧪 **100%测试覆盖**：64个自动化测试
- 📚 **完整文档**：设计文档、API参考、开发教程
- 🎯 **专业级代码**：模块化、可维护、规范化

---

## 🚀 快速开始

### 启动应用

```bash
# 克隆项目
cd manim-ide

# 启动HTTP服务器
python3 -m http.server 8000

# 在浏览器中打开
open http://localhost:8000
```

### 基本使用

1. **绘制图形**
   - 从左侧工具箱选择图形
   - 在画布上拖动绘制（或点击放置）
   - 释放完成

2. **编辑图形**
   - 单击选中图形
   - 拖动移动位置
   - 拖动四角缩放（Shift键等比例）
   - 双击打开属性面板

3. **高级编辑**
   - 曲线：拖动控制点调整形状
   - 抛物线：基于外接矩形，自动计算系数
   - 坐标系：支持不对称range

4. **导出**
   - 点击"导出Manim代码"获取Python代码
   - 在Manim中渲染：`manim scene.py GeneratedScene -pql`

---

## 📦 项目结构

```
manim-ide/
├── index.html              # 主应用入口
├── css/style.css          # 样式文件
├── js/
│   ├── core.js           # 核心框架（零硬编码）
│   ├── ui.js             # UI框架（零硬编码）
│   ├── export.js         # 导出模块
│   ├── app.js            # 应用入口
│   └── plugins/          # 插件目录
│       ├── rectangle/    # 矩形插件
│       ├── square/       # 正方形插件
│       ├── circle/       # 圆形插件
│       ├── ellipse/      # 椭圆插件
│       ├── arrow/        # 箭头插件
│       ├── line/         # 线段插件
│       ├── curve/        # 贝塞尔曲线插件
│       ├── sine/         # 正弦函数插件
│       ├── parabola/     # 抛物线插件
│       └── coordinateSystem/ # 坐标系插件
├── docs/                 # 文档
│   ├── PLUGIN_SYSTEM_DESIGN.md
│   ├── PLUGIN_API_REFERENCE.md
│   ├── PLUGIN_TUTORIAL.md
│   ├── MIGRATION_GUIDE.md
│   └── PLUGIN_INTERFACE_v2.1.md
├── tests/                # 测试框架
│   ├── plugin_test.js
│   └── run_all_tests.sh
└── temp/                 # 临时文件和工具
```

---

## 🔌 插件系统

### 完全插件化

**框架层：**
- ✅ 零硬编码
- ✅ 完全通用
- ✅ 易于扩展

**插件层：**
- ✅ 完全自主
- ✅ 独立目录
- ✅ 自带测试和文档

### 插件接口

每个插件实现统一的接口：

```javascript
registerShape({
    type: 'myshape',
    name: '我的图形',
    icon: '🔷',
    version: '1.0.0',
    drawMode: 'drag',  // 或 'click', 'multiClick'
    
    // 必需方法
    createDefault: function(x, y) { ... },
    render: function(ctx, element, editor) { ... },
    hitTest: function(element, manimX, manimY) { ... },
    toManim: function(element) { ... },
    
    // 推荐方法
    getBounds: function(element, editor) { ... },
    handleScale: function(element, scaleInfo, editor) { ... },
    handleMove: function(element, moveInfo, editor) { ... },
    
    // 配置
    properties: [ ... ]
});
```

### 添加新插件

1. 创建目录：`js/plugins/myshape/`
2. 创建文件：`myshape.js`, `README.md`, `myshape.test.js`
3. 实现接口（参考现有插件）
4. 在`index.html`引入：`<script src="js/plugins/myshape/myshape.js"></script>`
5. 刷新浏览器即可使用

**完全不需要修改框架代码！**

---

## 🧪 测试

### 运行测试

```bash
# 所有测试
bash tests/run_all_tests.sh

# 特定插件
node js/plugins/circle/circle.test.js
node js/plugins/ellipse/ellipse.test.js
```

### 测试覆盖

- 主测试：49个
- 插件测试：15个
- **总计：64个测试，100%通过**

---

## 📚 文档

### 用户文档
- [QUICKSTART.md](QUICKSTART.md) - 5分钟快速开始
- [README.md](README.md) - 本文件

### 开发文档
- [docs/PLUGIN_SYSTEM_DESIGN.md](docs/PLUGIN_SYSTEM_DESIGN.md) - 插件系统设计
- [docs/PLUGIN_API_REFERENCE.md](docs/PLUGIN_API_REFERENCE.md) - 完整API参考
- [docs/PLUGIN_INTERFACE_v2.1.md](docs/PLUGIN_INTERFACE_v2.1.md) - v2.1接口规范
- [docs/PLUGIN_TUTORIAL.md](docs/PLUGIN_TUTORIAL.md) - 插件开发教程
- [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) - 迁移指南

---

## 🎯 支持的图形

| 图形 | 特点 | 绘制方式 |
|------|------|----------|
| **Rectangle** | 可不等比缩放 | 拖动 |
| **Square** | 始终等比例 | 拖动 |
| **Circle** | 圆形 | 拖动 |
| **Ellipse** | 椭圆 | 拖动 |
| **Arrow** | 箭头 | 拖动 |
| **Line** | 直线 | 拖动 |
| **Curve** | 任意点贝塞尔曲线 | 点击（双击完成）|
| **Sine** | 正弦函数 | 拖动 |
| **Parabola** | 抛物线（基于矩形）| 拖动 |
| **CoordinateSystem** | 坐标系（支持不对称）| 拖动 |

---

## 🎨 特色功能详解

### 贝塞尔曲线
- 点击式绘制，任意多个点
- 实时预览（红色端点，蓝色控制点）
- 双击完成
- 选中后拖动控制点调整

### 抛物线
- 基于外接矩形定义
- 系数a自动计算
- 端点始终在矩形角上
- 顶点始终在X轴1/2处

### 坐标系
- 支持不对称range（如x: -1到3）
- 小数步长自动调整显示精度
- 从0开始向两边绘制刻度

---

## 🔧 开发

### 技术栈
- 纯HTML5 + CSS3 + Vanilla JavaScript (ES6)
- Canvas 2D API
- 零依赖，零构建工具

### 代码统计
- 总代码：~12,000行
- 框架层：~3,000行
- 插件层：~4,000行
- 测试：~900行
- 文档：~4,500行

### 插件开发
参见 [docs/PLUGIN_TUTORIAL.md](docs/PLUGIN_TUTORIAL.md)

---

## 🤝 贡献

欢迎贡献新插件或改进！

### 贡献流程
1. Fork项目
2. 创建插件（`js/plugins/yourshape/`）
3. 添加测试
4. 提交Pull Request

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- **Manim Community** - 优秀的数学动画引擎
- **Web标准** - Canvas API, ES6等现代技术

---

**Enjoy creating beautiful math animations! 🎬✨**

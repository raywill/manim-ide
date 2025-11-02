# 📚 Manim IDE 插件系统文档

## 文档导航

### 🎯 核心文档

1. **[PLUGIN_SYSTEM_DESIGN.md](PLUGIN_SYSTEM_DESIGN.md)** - 插件系统设计
   - 设计目标和原则
   - 完整接口规范
   - 架构图和调用流程
   - 框架层职责划分
   - 未来扩展示例

2. **[PLUGIN_API_REFERENCE.md](PLUGIN_API_REFERENCE.md)** - API完整参考
   - 所有接口方法详解
   - 参数说明和返回值
   - 代码示例
   - 辅助工具说明

3. **[PLUGIN_TUTORIAL.md](PLUGIN_TUTORIAL.md)** - 开发教程
   - 从零创建Circle插件
   - 逐步实现每个方法
   - 测试验证清单
   - 最佳实践

4. **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - 迁移指南
   - 现有代码迁移步骤
   - 重构计划
   - 迁移检查清单

---

## 🚀 快速开始

### 对于插件开发者

**创建新插件（3步）：**

1. 创建插件文件
   ```bash
   touch js/plugins/myshape.js
   ```

2. 实现接口
   ```javascript
   registerShape({
       type: 'myshape',
       name: '我的图形',
       icon: '🔷',
       createDefault: function(x, y) { ... },
       render: function(ctx, element, editor) { ... },
       hitTest: function(element, manimX, manimY) { ... },
       toManim: function(element) { ... }
   });
   ```

3. 引入插件
   ```html
   <!-- index.html -->
   <script src="js/plugins/myshape.js"></script>
   ```

完成！刷新浏览器即可使用。

---

### 对于框架维护者

**插件化迁移（4步）：**

1. 添加辅助函数到core.js
   - `scaleHelpers`
   - `defaultScaleHandler`

2. 重构ui.js的调度逻辑
   - `handleScaleDrag` → 调用plugin
   - 移动逻辑 → 调用plugin

3. 为现有插件添加新方法
   - `handleScale`, `handleMove`, `getBounds`

4. 测试并删除硬编码

---

## 📖 文档结构

```
docs/
├── README.md                    # 本文件
├── PLUGIN_SYSTEM_DESIGN.md      # 系统设计（必读）
├── PLUGIN_API_REFERENCE.md      # API参考（查阅）
├── PLUGIN_TUTORIAL.md           # 开发教程（实践）
└── MIGRATION_GUIDE.md           # 迁移指南（维护者）
```

---

## 🎓 学习路径

### 路径1：插件开发者

```
1. 阅读 PLUGIN_SYSTEM_DESIGN.md（了解架构）
   ↓
2. 阅读 PLUGIN_API_REFERENCE.md（学习API）
   ↓
3. 跟随 PLUGIN_TUTORIAL.md（实践）
   ↓
4. 参考现有插件（模仿）
   ↓
5. 创建自己的插件（创新）
```

### 路径2：框架维护者

```
1. 阅读 PLUGIN_SYSTEM_DESIGN.md（理解目标）
   ↓
2. 阅读 MIGRATION_GUIDE.md（制定计划）
   ↓
3. 实施迁移（逐步进行）
   ↓
4. 测试验证（确保无退化）
   ↓
5. 清理硬编码（完成插件化）
```

---

## 🔍 关键概念

### 插件接口层次

```
┌─────────────────────────┐
│ 必需接口（最小可用）      │
├─────────────────────────┤
│ - createDefault          │
│ - render                 │
│ - hitTest                │
│ - toManim                │
└─────────────────────────┘
           ↓ 扩展
┌─────────────────────────┐
│ 推荐接口（完整功能）      │
├─────────────────────────┤
│ + getBounds              │
│ + handleScale            │
│ + handleMove             │
│ + updateWhileDrawing     │
│ + properties             │
└─────────────────────────┘
           ↓ 高级
┌─────────────────────────┐
│ 高级接口（特殊需求）      │
├─────────────────────────┤
│ + getControlPoints       │
│ + updateControlPoint     │
│ + toJSON/fromJSON        │
│ + capabilities           │
└─────────────────────────┘
```

### 调用流程

```
用户操作
   ↓
框架层检测事件
   ↓
查找对应插件
   ↓
调用插件方法
   ↓
插件返回结果
   ↓
框架更新状态
   ↓
重新渲染
```

---

## 📊 插件能力矩阵

| 能力 | 接口方法 | 必需 | 示例 |
|------|---------|------|------|
| 创建 | createDefault | ✅ | 所有 |
| 渲染 | render | ✅ | 所有 |
| 选择 | hitTest | ✅ | 所有 |
| 导出 | toManim | ✅ | 所有 |
| 移动 | handleMove | 推荐 | 矩形、圆形 |
| 缩放 | handleScale | 推荐 | 矩形、圆形 |
| 拖动绘制 | updateWhileDrawing | 推荐 | 矩形、圆形 |
| 控制点 | getControlPoints | 可选 | 曲线 |
| 自定义属性 | properties | 推荐 | 所有 |

---

## 🛠️ 工具和资源

### 调试工具

```javascript
// 浏览器控制台

// 查看所有注册的插件
Object.keys(ManimEditor.shapeRegistry)

// 查看特定插件
ManimEditor.shapeRegistry['rectangle']

// 测试插件方法
const plugin = ManimEditor.shapeRegistry['circle'];
const element = plugin.createDefault(0, 0);
console.log(element);

// 切换调试显示
toggleHandleDebug()
```

### 代码模板

参考：
- `js/plugins/rectangle.js` - 基础模板
- `js/plugins/curve.js` - 高级模板（带控制点）
- `docs/PLUGIN_TUTORIAL.md` - 完整示例

---

## 🎯 插件系统目标

### 短期目标（v1.1.0 → v1.2.0）
- [ ] 添加scaleHelpers到core.js
- [ ] 重构ui.js的handleScaleDrag
- [ ] 为rectangle添加新方法
- [ ] 为square添加新方法
- [ ] 测试验证

### 中期目标（v1.2.0 → v1.3.0）
- [ ] 迁移所有6个现有插件
- [ ] 删除ui.js中的硬编码
- [ ] 添加默认处理器
- [ ] 创建circle插件（验证扩展性）

### 长期目标（v2.0.0）
- [ ] 完全插件化
- [ ] 插件市场（可选）
- [ ] 热加载插件
- [ ] 插件配置UI

---

## 📈 收益预期

### 代码质量
```
框架代码：
  ui.js: 2000行 → 800行 (-60%)
  可读性: ⬆️⬆️⬆️

插件代码：
  模块化: ✅
  独立性: ✅
  可测试性: ✅
```

### 扩展性
```
添加新图形：
  之前: 修改5个文件，300行代码
  之后: 创建1个文件，200行代码 ✅
  
时间成本：
  之前: 2-3小时
  之后: 30分钟 ✅
```

### 维护性
```
修复bug：
  之前: 在2000行中查找相关代码
  之后: 直接定位到对应插件 ✅
  
测试：
  之前: 集成测试
  之后: 单元测试 + 集成测试 ✅
```

---

## 🤝 贡献

欢迎贡献新插件或改进现有插件！

### 贡献流程
1. Fork项目
2. 创建插件文件
3. 遵循接口规范
4. 添加测试
5. 提交Pull Request

### 插件质量标准
- ✅ 实现所有必需接口
- ✅ 代码有注释
- ✅ 通过所有测试
- ✅ 符合代码风格

---

## 📞 支持

- 📖 查看文档
- 🐛 报告Issue
- 💡 提出建议
- 🤝 贡献代码

---

**文档集版本：** 2.0.0  
**最后更新：** 2025-11-02  
**维护者：** Manim IDE Team


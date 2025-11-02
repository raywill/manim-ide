# 插件化迁移测试清单

## ✅ 语法检查 - 全部通过！

```
✓ js/app.js
✓ js/core.js
✓ js/export.js
✓ js/ui.js
✓ js/plugins/arrow.js
✓ js/plugins/coordinateSystem.js
✓ js/plugins/curve.js
✓ js/plugins/line.js
✓ js/plugins/rectangle.js
✓ js/plugins/square.js
```

---

## 📊 迁移统计

### 框架层代码减少
```
ui.js:
  之前: ~1400行
  之后: ~960行
  减少: -440行 (-31%)
  
删除的硬编码：
  ✓ handleScaleDrag 中的 if-else 分支（~350行）
  ✓ 移动逻辑中的类型判断（~50行）
  ✓ updateTempElement 中的类型判断（~45行）
```

### 插件层代码增加
```
每个插件新增约60-100行：
  ✓ getBounds()
  ✓ handleScale()
  ✓ handleMove()
  ✓ updateWhileDrawing()
  
curve.js额外新增：
  ✓ getControlPoints()
  ✓ updateControlPoint()
```

---

## 🧪 功能测试清单

### 测试1：正方形（square）

```
基础功能：
- [ ] 点击工具箱"正方形"按钮
- [ ] 拖动绘制正方形
- [ ] 正方形正确显示

移动功能：
- [ ] 选中正方形
- [ ] 拖动移动位置
- [ ] 位置正确更新

缩放功能：
- [ ] 拖动左上角 → 右下角固定
- [ ] 拖动右上角 → 左下角固定
- [ ] 拖动右下角 → 左上角固定
- [ ] 拖动左下角 → 右上角固定
- [ ] 始终保持正方形（等比例）

属性编辑：
- [ ] 双击打开属性面板
- [ ] 修改坐标，实时更新
- [ ] 修改边长，实时更新

导出功能：
- [ ] 导出Manim代码正确
- [ ] JSON导出正常
```

### 测试2：矩形（rectangle）

```
缩放功能（重点）：
- [ ] 不按Shift，拖动角 → 自由缩放
- [ ] 按Shift，拖动角 → 保持原始宽高比
- [ ] 四个角都能正常缩放
- [ ] 对角保持固定不动

其他功能：
- [ ] 绘制、移动、属性编辑、导出
```

### 测试3：箭头（arrow）

```
缩放功能：
- [ ] 拖动角 → 起点终点缩放
- [ ] 不按Shift → 可以改变方向
- [ ] 按Shift → 保持原始角度

移动功能：
- [ ] 拖动箭头 → 整体移动
- [ ] 起点和终点同时移动

其他功能：
- [ ] 绘制、属性编辑、导出
```

### 测试4：线段（line）

```
功能测试同arrow：
- [ ] 绘制
- [ ] 移动
- [ ] 缩放
- [ ] 导出
```

### 测试5：曲线（curve）

```
绘制功能：
- [ ] 点击4次放置控制点
- [ ] 实时预览曲线
- [ ] 曲线完成后正确显示

控制点功能：
- [ ] 选中曲线 → 显示4个控制点
- [ ] 拖动P1/P2 → 调整曲线形状
- [ ] 拖动P0/P3 → 移动起止位置

缩放功能：
- [ ] 拖动四角白色手柄 → 整体缩放
- [ ] 所有控制点同时缩放
- [ ] 曲线形状保持

移动功能：
- [ ] 拖动曲线主体 → 整体移动

导出功能：
- [ ] 导出CubicBezier代码
- [ ] 在Manim中渲染一致
```

### 测试6：坐标系（coordinateSystem）

```
绘制功能：
- [ ] 拖动绘制坐标系
- [ ] 大小正确

缩放功能：
- [ ] 拖动角 → 调整轴长度
- [ ] 刻度标签正确更新

小数步长：
- [ ] 设置步长0.5 → 显示1位小数
- [ ] 设置步长0.25 → 显示2位小数
- [ ] 从0向两边绘制，值正确

其他功能：
- [ ] 移动、属性编辑、导出
```

---

## 🐛 可能的问题和解决

### 问题1：某个图形不能缩放

**检查：**
```javascript
// 打开浏览器控制台
const plugin = ManimEditor.shapeRegistry['rectangle'];
console.log(plugin.handleScale);  // 应该是一个函数

// 如果是undefined
// → 插件未加载或方法未定义
```

### 问题2：缩放时对角不固定

**检查：**
```javascript
// 控制台应该显示
固定点: (x, y)
新中心: (x, y)

// 验证固定点是否正确
```

### 问题3：移动不工作

**检查：**
```javascript
const plugin = ManimEditor.shapeRegistry['arrow'];
console.log(plugin.handleMove);  // 应该是一个函数
```

### 问题4：拖动绘制不工作

**检查：**
```javascript
const plugin = ManimEditor.shapeRegistry['square'];
console.log(plugin.updateWhileDrawing);  // 应该是一个函数
```

---

## 🎯 关键验证点

### 验证1：插件方法已注册

```javascript
// 在控制台运行
Object.keys(ManimEditor.shapeRegistry).forEach(type => {
    const plugin = ManimEditor.shapeRegistry[type];
    console.log(`${type}:`,  {
        getBounds: !!plugin.getBounds,
        handleScale: !!plugin.handleScale,
        handleMove: !!plugin.handleMove,
        updateWhileDrawing: !!plugin.updateWhileDrawing
    });
});

// 应该都是true
```

### 验证2：辅助函数可用

```javascript
// 在控制台运行
console.log(ManimEditor.scaleHelpers);
// 应该显示3个方法：
// - getFixedPoint
// - getNewCornerPosition
// - maintainAspectRatio
```

### 验证3：框架不再硬编码

```javascript
// 搜索ui.js中是否还有类型判断
// 不应该有：if (element.type === 'rectangle')
```

---

## ✅ 完整测试流程

### 步骤1：刷新浏览器

```
Ctrl + Shift + R（强制刷新）
```

### 步骤2：打开控制台

```
F12 或 Ctrl + Shift + I
```

### 步骤3：验证插件加载

```javascript
// 在控制台运行
console.log('Registered shapes:', Object.keys(ManimEditor.shapeRegistry));
// 应该显示：['square', 'rectangle', 'arrow', 'line', 'curve', 'coordinateSystem']
```

### 步骤4：测试每个图形

按照上述清单逐项测试。

### 步骤5：检查错误

查看控制台是否有错误或警告。

---

## 📋 预期结果

### 成功的标志

```
✓ 工具箱显示所有6个形状
✓ 每个形状都能绘制
✓ 每个形状都能移动
✓ 每个形状都能缩放（四个角）
✓ 曲线的控制点可以拖动
✓ 属性面板正常工作
✓ 导出Manim代码正确
✓ 控制台无错误
```

### 失败的标志

```
✗ 某个形状无法绘制 → 检查updateWhileDrawing
✗ 某个形状无法移动 → 检查handleMove
✗ 某个形状无法缩放 → 检查handleScale
✗ 控制台报错 → 查看具体错误信息
```

---

## 🎉 如果全部通过

恭喜！插件化迁移成功！

现在的优势：
- ✅ 框架代码更简洁（-440行）
- ✅ 插件完全自主
- ✅ 添加新图形只需创建插件文件
- ✅ 不需要修改框架代码

---

## 🚀 下一步

1. **添加Circle插件**
   - 使用 circle.js.example
   - 验证插件系统的扩展性

2. **添加更多插件**
   - Text（文本）
   - Polygon（多边形）
   - Ellipse（椭圆）

3. **优化文档**
   - 根据实际使用更新文档
   - 添加更多示例

---

**测试日期：** 2025-11-02  
**迁移状态：** ✅ 完成  
**待验证：** 请立即测试


# 缩放功能需求分析

## 📋 完整需求列表

### 需求1：视觉呈现
- 选中图形后，**四个角**出现**圆形白色手柄**
- 手柄应该足够大，容易点击（建议半径6-8px）

### 需求2：缩放操作
- 拖动**任何一个角**的手柄都可以缩放
- 缩放时，**被拖动角的对角保持固定不动**

### 需求3：缩放模式
- **按住Shift键**：仅允许等比例缩放（保持宽高比）
- **不按Shift键**：自由缩放（可改变宽高比）

### 需求4：适用范围
- **所有图形类型**都支持缩放：
  - 正方形
  - 矩形
  - 箭头
  - 线段
  - 曲线
  - 坐标系

---

## 🔍 需求矛盾检查

### 检查点1：正方形的缩放
- 正方形的定义：宽度 = 高度
- 需求：不按Shift可以自由缩放
- **潜在矛盾**：如果自由缩放，正方形会变成矩形，还叫正方形吗？

**解决方案：**
- 正方形始终保持等比例（无论是否按Shift）
- 或者：自由缩放时将类型转换为矩形

### 检查点2：箭头/线段的缩放
- 箭头/线段由起点和终点定义
- 缩放意味着改变起点和终点的相对位置
- **可行性**：将起点终点视为边界框，按比例缩放

### 检查点3：曲线的缩放
- 曲线由多个控制点定义
- 缩放需要同时调整所有控制点
- **冲突**：拖动单个控制点 vs 拖动角缩放整体
- **解决**：优先检测控制点，然后才检测缩放手柄

---

## 🐛 当前实现的问题

### 问题1：对角计算错误
```javascript
// 可能的错误：Y轴方向混淆
// Manim: Y轴向上为正
// Canvas: Y轴向下为正

topLeft 在 Manim 中是 (x-w/2, y+h/2)
但在 Canvas 中可能计算错了
```

### 问题2：中心点计算
```javascript
// 简单的中点公式可能不够
newCenter = (fixedPoint + mousePoint) / 2

// 需要考虑：
// - Y轴反转
// - 实际拖动方向
```

### 问题3：等比例缩放的实现
```javascript
// 当前实现：调整新宽度或新高度
// 可能问题：调整后的中心点计算不正确
```

---

## ✅ 正确的实现方案

### 步骤1：确定固定点（Manim坐标）

```javascript
对于矩形 (center.x, center.y, width, height):

拖动 topLeft → 固定 bottomRight
  固定点 = (center.x + width/2, center.y - height/2)

拖动 topRight → 固定 bottomLeft  
  固定点 = (center.x - width/2, center.y - height/2)

拖动 bottomRight → 固定 topLeft
  固定点 = (center.x - width/2, center.y + height/2)

拖动 bottomLeft → 固定 topRight
  固定点 = (center.x + width/2, center.y + height/2)
```

### 步骤2：计算新尺寸

```javascript
// 鼠标当前位置（Manim坐标）
mouse = (mouseX, mouseY)

// 新的宽度和高度（绝对值）
newWidth = |mouseX - fixedPoint.x|
newHeight = |mouseY - fixedPoint.y|
```

### 步骤3：等比例处理（如果按Shift）

```javascript
if (按住Shift) {
    originalRatio = width / height
    
    // 保持比例，取较大的缩放
    scale = max(newWidth/width, newHeight/height)
    
    newWidth = width * scale
    newHeight = height * scale
}
```

### 步骤4：计算新中心

```javascript
// 简单方法：固定点和鼠标位置的中点
newCenterX = (fixedPoint.x + mouseX) / 2
newCenterY = (fixedPoint.y + mouseY) / 2

// 但是！如果按了Shift，鼠标位置可能不在新的角上
// 需要重新计算实际的拖动角位置

if (按住Shift) {
    // 计算新的拖动角位置
    if (拖动 bottomRight) {
        newCornerX = fixedPoint.x + newWidth
        newCornerY = fixedPoint.y - newHeight
    }
    // ... 其他角类似
    
    newCenterX = (fixedPoint.x + newCornerX) / 2
    newCenterY = (fixedPoint.y + newCornerY) / 2
}
```

---

## 🎯 需要验证的关键点

1. **Manim坐标系 Y轴向上**：
   - topLeft 的 y 坐标应该**大于** bottomLeft
   - 这与Canvas相反！

2. **四个角的名称**：
   ```
   Manim坐标系:          Canvas坐标系:
   topLeft  topRight    bottomLeft  bottomRight
   (y大)    (y大)       (y大)       (y大)
   
   bottomLeft bottomRight   topLeft     topRight
   (y小)      (y小)        (y小)       (y小)
   ```

3. **对角关系**：
   - topLeft ↔ bottomRight
   - topRight ↔ bottomLeft

---

## 🔧 实现检查清单

- [ ] 正确理解Manim坐标系（Y向上）
- [ ] 正确计算四个角的Manim坐标
- [ ] 正确确定对角固定点
- [ ] 正确计算新尺寸
- [ ] 正确处理Shift等比例
- [ ] 正确计算新中心点
- [ ] 所有四个角都测试通过
- [ ] 所有图形类型都测试通过

---

## 💡 我的反思

我发现我的实现可能存在以下问题：

1. **Y轴方向混淆**：可能在某些地方混淆了Manim和Canvas的Y轴方向
2. **角的命名混淆**：topLeft在Manim中y较大，但在视觉上在"上方"
3. **等比例缩放时的中心计算**：可能不够准确

让我重新实现这个功能，确保：
- 对角真的固定不动
- 所有四个角都能工作
- Shift键等比例正确


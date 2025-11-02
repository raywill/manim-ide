# 缩放功能深度分析

## 🔍 坐标系理解

### Manim坐标系（核心！）
```
     Y轴↑
        │
        │  topLeft      topRight
        │  (-w/2,+h/2)  (+w/2,+h/2)
────────┼────────────────────→ X轴
        │  bottomLeft   bottomRight  
        │  (-w/2,-h/2)  (+w/2,-h/2)
        │
```

**关键点：**
- Y轴向上为正
- top = y值大，bottom = y值小

### Canvas视觉（显示）
```
  Canvas原点
    ↓
    ┌────────────→ x
    │  视觉左上   视觉右上
    │
    ↓
    y  视觉左下   视觉右下
```

**关键点：**
- Y轴向下为正
- 视觉上方 = Canvas y小
- 视觉下方 = Canvas y大

---

## 🎯 正确的缩放需求

### 需求明确化

对于一个矩形 (centerX, centerY, width, height)：

**拖动bottomRight（视觉右下）时：**
```
固定点: topLeft (Manim坐标)
  x = centerX - width/2
  y = centerY + height/2

新尺寸:
  newWidth = |mouseX - fixedX|
  newHeight = |mouseY - fixedY|

新中心:
  newCenterX = (fixedX + mouseX) / 2
  newCenterY = (fixedY + mouseY) / 2
```

### 四个角的映射

| 拖动的角 | Manim名称 | 固定的角 | Manim名称 |
|---------|----------|---------|----------|
| 视觉左上 | topLeft | 视觉右下 | bottomRight |
| 视觉右上 | topRight | 视觉左下 | bottomLeft |
| 视觉右下 | bottomRight | 视觉左上 | topLeft |
| 视觉左下 | bottomLeft | 视觉右上 | topRight |

---

## 🐛 我的实现问题分析

### 问题1：角的名称和计算

我在代码中使用的corner名称（topLeft, bottomRight等）是基于视觉还是Manim坐标？

**检查我的代码：**
```javascript
if (corner === 'topLeft') {
    fixedPoint = { x: center.x + halfWidth, y: center.y - halfHeight };
}
```

这个计算：
- x: center.x + halfWidth = 右边 ✓
- y: center.y - halfHeight = 下方（Manim坐标中y减小）

所以固定点是 bottomRight（Manim坐标）✓ 对角关系正确！

### 问题2：为什么可能拖不动？

可能的原因：
1. `findControlPoint()` 检测不到手柄
2. `getElementBounds()` 计算的bounds不正确
3. 手柄的Canvas坐标计算错误

### 问题3：Shift键等比例的实现

当按住Shift时，我调整了newWidth和newHeight，但是：
- 新的角位置不一定是鼠标位置
- 需要重新计算实际的角位置
- 然后用这个新角位置和固定点计算中心

---

## ✅ 正确的实现步骤

### 步骤1：获取原始信息
```javascript
const center = { x: props.x, y: props.y }
const width = props.width
const height = props.height
const halfW = width / 2
const halfH = height / 2
```

### 步骤2：确定固定点（Manim坐标）
```javascript
let fixedManimPoint;

if (corner === 'bottomRight') {
    // 拖动视觉右下，固定视觉左上
    fixedManimPoint = {
        x: center.x - halfW,  // 左
        y: center.y + halfH   // 上（Manim）
    }
}
// ... 其他角类似
```

### 步骤3：计算新尺寸
```javascript
const mouseManimX = currentCoord.x
const mouseManimY = currentCoord.y

let newWidth = Math.abs(mouseManimX - fixedManimPoint.x)
let newHeight = Math.abs(mouseManimY - fixedManimPoint.y)
```

### 步骤4：处理等比例（Shift）
```javascript
if (isShift) {
    const ratio = width / height
    
    // 以较大的缩放为准
    const scaleByWidth = newWidth / width
    const scaleByHeight = newHeight / height
    const scale = Math.max(scaleByWidth, scaleByHeight)
    
    newWidth = width * scale
    newHeight = height * scale
}
```

### 步骤5：计算新中心
```javascript
// 关键：需要知道新的拖动角位置

// 新的拖动角在哪里？
let newCornerX, newCornerY;

if (corner === 'bottomRight') {
    // 右下角 = 固定点 + (newWidth, -newHeight)
    newCornerX = fixedManimPoint.x + newWidth
    newCornerY = fixedManimPoint.y - newHeight
}

// 新中心 = (固定点 + 新角位置) / 2
const newCenterX = (fixedManimPoint.x + newCornerX) / 2
const newCenterY = (fixedManimPoint.y + newCornerY) / 2
```

---

## 🎯 测试验证方案

### 测试1：右下角缩放
```
1. 绘制矩形于(0,0)，宽2，高1
2. 四个角的Manim坐标：
   - topLeft:     (-1, 0.5)
   - topRight:    (1, 0.5)
   - bottomLeft:  (-1, -0.5)
   - bottomRight: (1, -0.5)

3. 选中，拖动bottomRight到(2, -1)
4. 固定点topLeft应该保持在(-1, 0.5)
5. 新尺寸：
   - width = |2 - (-1)| = 3
   - height = |-1 - 0.5| = 1.5
6. 新中心：
   - x = (-1 + 2) / 2 = 0.5
   - y = (0.5 + (-1)) / 2 = -0.25

7. 验证新的topLeft：
   - x = 0.5 - 3/2 = -1 ✓
   - y = -0.25 + 1.5/2 = 0.5 ✓
   - 确认固定！
```

---

## 🔧 修复计划

1. **重写handleScaleDrag函数**
   - 使用清晰的变量名
   - 添加详细注释
   - 逐步计算，确保每一步正确

2. **测试每个角**
   - 单独测试四个角
   - 打印中间变量
   - 确认固定点真的不动

3. **测试Shift键**
   - 测试等比例缩放
   - 确认比例正确保持

4. **测试所有图形**
   - 正方形
   - 矩形
   - 其他类型

---

## 💭 我的反思

我意识到我的实现可能有以下问题：

1. **没有充分理解Manim坐标系的Y轴方向**
2. **角的命名和坐标计算可能混淆**
3. **等比例缩放时的新角位置计算不正确**
4. **缺少足够的调试和验证**

我需要：
1. 重新理清Manim坐标系
2. 画图确认每个角的坐标
3. 逐步实现并验证
4. 添加调试日志
5. 实际测试每个功能点

---

**准备重新实现！**


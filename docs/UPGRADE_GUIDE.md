# 插件升级指南

## 概述

本文档为插件开发者提供**数据升级**的最佳实践指南。当你为插件新增或修改属性时，必须实现 `onUpgrade()` 方法来确保向后兼容。

---

## 为什么需要数据升级？

### 问题场景

用户在使用 Manim IDE 时会：
1. 绘制图形并保存到浏览器（localStorage）
2. 导出为 JSON 文件保存到硬盘
3. 过一段时间后重新加载这些数据

如果在这期间，插件新增了属性（例如 `z_order`），旧数据中不包含这个属性：
```javascript
// 旧数据
{
  type: 'circle',
  props: {
    x: 1,
    y: 2,
    radius: 3,
    color: '#3498db'
    // ❌ 缺少 z_order, fill_color, stroke_color...
  }
}
```

导出时会调用：
```javascript
formatNumber(props.z_order)  // → formatNumber(undefined)
                             // → undefined.toFixed(2)
                             // → ❌ TypeError!
```

---

## onUpgrade() 接口

### 签名

```javascript
onUpgrade: function(props) {
    // 返回升级后的 props
}
```

### 参数
- `props` (Object) - 旧版本的属性对象

### 返回值
- (Object) - 升级后的属性对象，包含所有新属性的默认值

### 何时调用

框架会在两个地方自动调用：
1. `loadFromLocalStorage()` - 从浏览器缓存加载时
2. `importFromJSON()` - 从 JSON 文件导入时

---

## 实现模板

```javascript
registerShape({
    type: 'myshape',
    // ... 其他方法 ...
    
    onUpgrade: function(props) {
        // 1. 复制旧属性（避免修改原对象）
        const upgraded = { ...props };
        
        // 2. 检查并补充缺失的属性
        // v1.0 → v2.0：新增属性示例
        if (upgraded.newProp1 === undefined) {
            upgraded.newProp1 = defaultValue1;
        }
        
        // v2.0 → v2.1：属性改名示例
        if (upgraded.newName === undefined && upgraded.oldName !== undefined) {
            upgraded.newName = upgraded.oldName;
            // 可选：删除旧属性
            // delete upgraded.oldName;
        }
        
        // 3. 返回升级后的对象
        return upgraded;
    }
});
```

---

## 最佳实践

### ✅ DO - 推荐做法

#### 1. 使用展开运算符复制
```javascript
const upgraded = { ...props };  // ✓ 不修改原对象
```

#### 2. 使用 `=== undefined` 检查
```javascript
if (upgraded.z_order === undefined) {  // ✓ 精确检查
    upgraded.z_order = 0;
}
```

#### 3. 提供合理的默认值
```javascript
// ✓ 从旧属性推导新属性
if (upgraded.fill_color === undefined) {
    upgraded.fill_color = upgraded.color || '#3498db';
}
```

#### 4. 添加版本注释
```javascript
// v2.1 新增：z_order 支持  // ✓ 清晰标记版本
if (upgraded.z_order === undefined) {
    upgraded.z_order = 0;
}
```

#### 5. 保持向后兼容
```javascript
// ✓ 优先使用新属性，回退到旧属性
const fillColor = upgraded.fill_color || upgraded.color || '#3498db';
```

---

### ❌ DON'T - 避免做法

#### 1. 直接修改原对象
```javascript
props.z_order = 0;  // ✗ 修改了原始数据
return props;
```

#### 2. 使用 `||` 检查
```javascript
if (!upgraded.z_order) {  // ✗ 0 会被当作 falsy
    upgraded.z_order = 0;
}
```

#### 3. 硬编码值而不考虑旧数据
```javascript
upgraded.fill_color = '#3498db';  // ✗ 丢失了旧的 color 值
```

#### 4. 无条件覆盖
```javascript
upgraded.z_order = 0;  // ✗ 即使已有值也会覆盖
```

---

## 实际案例：Circle 插件

Circle 插件经历了多个版本：

### v1.0 → v2.0：fill/stroke 分离

**旧数据：**
```javascript
{
  x: 1, y: 2, radius: 3,
  color: '#3498db',
  opacity: 0.8
}
```

**升级逻辑：**
```javascript
// 拆分 color → fill_color
if (upgraded.fill_color === undefined) {
    upgraded.fill_color = upgraded.color || '#3498db';
}

// 新增 stroke_color
if (upgraded.stroke_color === undefined) {
    upgraded.stroke_color = '#2c3e50';
}

// 拆分 opacity → fill_opacity
if (upgraded.fill_opacity === undefined) {
    upgraded.fill_opacity = upgraded.opacity !== undefined ? upgraded.opacity : 1;
}

// 新增 stroke_width
if (upgraded.stroke_width === undefined) {
    upgraded.stroke_width = 2;
}
```

**升级后：**
```javascript
{
  x: 1, y: 2, radius: 3,
  color: '#3498db',         // 保留旧属性
  opacity: 0.8,             // 保留旧属性
  fill_color: '#3498db',    // ✓ 从 color 迁移
  fill_opacity: 0.8,        // ✓ 从 opacity 迁移
  stroke_color: '#2c3e50',  // ✓ 新增默认值
  stroke_width: 2           // ✓ 新增默认值
}
```

### v2.0 → v2.1：z_order 支持

**升级逻辑：**
```javascript
// v2.1 新增：z_order
if (upgraded.z_order === undefined) {
    upgraded.z_order = 0;
}
```

---

## 测试升级逻辑

### 测试用例示例

```javascript
// 测试1：v1.0 数据升级
const oldData = {
    x: 1, y: 2, radius: 3,
    color: '#3498db',
    opacity: 0.8
};

const upgraded = plugin.onUpgrade(oldData);

assert(upgraded.fill_color === '#3498db', 'fill_color 应从 color 迁移');
assert(upgraded.fill_opacity === 0.8, 'fill_opacity 应从 opacity 迁移');
assert(upgraded.stroke_color === '#2c3e50', 'stroke_color 应有默认值');
assert(upgraded.z_order === 0, 'z_order 应有默认值');

// 测试2：已升级的数据不应被覆盖
const newData = {
    x: 1, y: 2, radius: 3,
    fill_color: '#e74c3c',
    z_order: 5
};

const result = plugin.onUpgrade(newData);

assert(result.fill_color === '#e74c3c', '已有值不应被覆盖');
assert(result.z_order === 5, '已有值不应被覆盖');
```

---

## FAQ

### Q1: 每个插件都必须实现 onUpgrade 吗？

**A:** 不是必须的，但**强烈推荐**。
- 如果插件从未修改过属性，可以不实现
- 如果插件新增了属性，**必须**实现以确保兼容性

### Q2: 可以删除旧属性吗？

**A:** 可以，但要谨慎。
```javascript
// 安全做法：保留旧属性（推荐）
if (upgraded.fill_color === undefined) {
    upgraded.fill_color = upgraded.color || '#3498db';
    // 不删除 upgraded.color，保持兼容
}

// 激进做法：删除旧属性（谨慎）
if (upgraded.fill_color === undefined) {
    upgraded.fill_color = upgraded.color || '#3498db';
    delete upgraded.color;  // ⚠️ 可能影响某些旧代码
}
```

### Q3: 如果忘记实现 onUpgrade 会怎样？

**A:** 会出现问题：
- 旧数据加载后缺少新属性
- 导出时可能报错（null/undefined）
- 渲染可能不正确

但由于 `formatNumber()` 的防御性检查，不会崩溃，而是使用默认值。

### Q4: 多个版本的升级如何管理？

**A:** 使用注释分段管理：
```javascript
onUpgrade: function(props) {
    const upgraded = { ...props };
    
    // v1.0 → v2.0
    if (upgraded.prop_v2 === undefined) {
        upgraded.prop_v2 = default;
    }
    
    // v2.0 → v2.1
    if (upgraded.prop_v21 === undefined) {
        upgraded.prop_v21 = default;
    }
    
    // v2.1 → v2.2
    if (upgraded.prop_v22 === undefined) {
        upgraded.prop_v22 = default;
    }
    
    return upgraded;
}
```

---

## 总结

✅ **记住三步法**：

1. **新增属性时**
   - 在 `createDefault` 中添加
   - 在 `properties` 中添加
   - ⚠️ **在 `onUpgrade` 中处理旧数据**

2. **实现升级逻辑**
   - 使用 `{ ...props }` 复制
   - 使用 `=== undefined` 检查
   - 提供合理默认值

3. **添加版本注释**
   - 标记是哪个版本新增的
   - 方便未来维护

遵循这些原则，你的插件将具有出色的向后兼容性！🎉

---

**文档版本：** 1.0.0  
**最后更新：** 2025-11-02


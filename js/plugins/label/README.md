# Label 文本插件

- 单击放置一个文本标签；可拖动移动位置，支持缩放调整字号。
- 可选背景矩形，用于突出显示文本。

## 绘制
- 工具箱选择“文本（label）”，在画布上单击一次即可放置。
- 选中后显示一个蓝色控制点（锚点），拖动可移动。
- 通过边框缩放可以按外框等比调整字号。

## 属性
- text: 文本内容（字符串）
- font_size: 字号（px）
- color: 文本颜色（hex）
- bg_color: 背景色（hex）
- bg_opacity: 背景不透明度（0~1，0 表示不显示背景）
- bg_padding: 背景内边距（像素）
- z_order: Z 序

## 渲染与命中
- 文本使用 Canvas `fillText` 渲染。
- 背景矩形按 `ascent + descent` 真实文本高度绘制，与命中/边界保持一致。

## 导出到 Manim
- 生成 `Text("...")`；当启用背景时，额外生成 `SurroundingRectangle`。
- 为确保 `self.add(label)` 即可添加完整对象：
  - 有背景：`label = VGroup(label_core, label_bg)`
  - 无背景：`label = label_core`

## 注意
- 命中与 bounds 使用实际文字度量（ascent/descent），避免下边界过大。
- 遵循插件规则：不在框架中硬编码类型，所有逻辑在插件内实现。


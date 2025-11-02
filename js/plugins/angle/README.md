# Angle 夹角插件

- 三点定义：A（第一条边顶点）、B（公共顶点）、C（第三条边顶点）
- 始终绘制小于 180° 的较小夹角
- 在 B 处绘制小弧与 `θ` 符号
- 控制点为蓝色实心点，可拖动 A/B/C 调整夹角

## 绘制
- multiClick 三次：依次点击放置 A、B、C。
- 预览过程中显示小弧与半透明的预览点。

## 属性
- stroke_color: 线条颜色
- stroke_width: 线宽
- label_color: θ 颜色
- radius_ratio: 弧半径与 min(|BA|,|BC|) 的比值（0~1）
- z_order: Z 序

## 导出
- 生成 `Arc` 与 `MathTex(r"\\theta")` 代码，Arc 以 B 为中心偏移放置。


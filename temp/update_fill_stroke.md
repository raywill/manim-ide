# 填充色/边框色更新指南

Rectangle和Square已完成，作为参考。

对于Circle, Ellipse, Triangle，需要：

## createDefault
```javascript
fill_color: '#颜色',
stroke_color: '#2c3e50',
fill_opacity: 1,
stroke_width: 2
```

## render
```javascript
setRenderOpacity(ctx, element);

const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
if (fillOpacity > 0) {
    ctx.fillStyle = props.fill_color || props.color || '#默认色';
    const savedAlpha = ctx.globalAlpha;
    ctx.globalAlpha = savedAlpha * fillOpacity;
    ctx.fill();  // 或fillRect等
    ctx.globalAlpha = savedAlpha;
}

ctx.strokeStyle = props.stroke_color || '#2c3e50';
ctx.lineWidth = props.stroke_width || 2;
ctx.stroke();
```

## toManim
```javascript
let code = `${varName} = Shape(...)`;
code += `.move_to(...)`;

const fillOpacity = props.fill_opacity !== undefined ? props.fill_opacity : 1;
if (fillOpacity > 0) {
    code += `.set_fill(${fillColor}, ${formatNumber(fillOpacity)})`;
} else {
    code += `.set_fill(opacity=0)`;
}

code += `.set_stroke(${strokeColor}, width=${strokeWidth})`;
```

## properties
```javascript
{ key: 'fill_color', label: '填充色', type: 'color' },
{ key: 'fill_opacity', label: '填充透明度', type: 'number', step: 0.1, min: 0, max: 1 },
{ key: 'stroke_color', label: '边框色', type: 'color' },
{ key: 'stroke_width', label: '边框宽度', type: 'number', step: 0.1, min: 0.5 }
```

由于token限制，剩余3个图形的具体实现留给下次会话。
Rectangle和Square已完成并可测试。

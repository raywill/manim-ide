// Label 插件测试（自包含）

global.ManimEditor = {
    elements: [],
    canvas: { width: 800, height: 800, getContext: function(){ return mockCtx; } },
    coordSystem: { props: { x_range: [-7,7,1], y_range: [-7,7,1] } },
    manimToCanvas: function(mx, my) {
        const xRange = this.coordSystem.props.x_range;
        const yRange = this.coordSystem.props.y_range;
        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];
        return { x: ((mx - xRange[0]) / xSpan) * this.canvas.width, y: this.canvas.height - ((my - yRange[0]) / ySpan) * this.canvas.height };
    },
    canvasToManim: function(cx, cy) {
        const xRange = this.coordSystem.props.x_range;
        const yRange = this.coordSystem.props.y_range;
        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];
        return { x: (cx/this.canvas.width)*xSpan + xRange[0], y: (1-cy/this.canvas.height)*ySpan + yRange[0] };
    },
    shapeRegistry: {}
};

// 简单mock的2D上下文
const mockCtx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textBaseline: '',
    textAlign: '',
    globalAlpha: 1,
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    fillText: () => {},
    measureText: (t) => ({ width: (t? t.length:0) * 10 }),
};

global.sanitizeVariableName = (name) => name.replace(/[^a-zA-Z0-9_]/g, '_');
global.formatNumber = (num) => {
    if (num == null || isNaN(num)) return '0';
    if (Number.isInteger(num)) return num.toString();
    return Number(num).toFixed(2).replace(/\.?0+$/, '');
};
global.hexToManimColor = (hex) => {
    const map = { '#2c3e50':'DARK_GRAY', '#ffffaa':'YELLOW', '#ffffff':'WHITE', '#000000':'BLACK' };
    return map[(hex||'').toLowerCase()] || 'WHITE';
};
global.setRenderOpacity = () => {};
global.registerShape = (p) => { ManimEditor.shapeRegistry[p.type] = p; };

require('./label.js');

const plugin = ManimEditor.shapeRegistry['label'];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { console.log(`✅ ${m}`); pass++; } else { console.log(`❌ ${m}`); fail++; } };

console.log('🧪 Label 插件测试');

ok(!!plugin, '插件已注册');

const el = plugin.createDefault(0, 0);
ok(el.type === 'label', 'createDefault 返回 label');
ok(typeof el.props.text === 'string', '拥有文本属性');

// 渲染不报错
try {
    const ctx = ManimEditor.canvas.getContext('2d');
    plugin.render(ctx, { id: '1', type: 'label', props: el.props }, ManimEditor);
    ok(true, 'render 无异常');
} catch (e) {
    ok(false, 'render 异常: ' + e.message);
}

// 命中测试（文本中心附近）
ok(plugin.hitTest({ type:'label', props:{...el.props, text:'ABC'} }, 0.05, 0.05, ManimEditor) === true, 'hitTest 命中文本');

// 导出应包含 Text(
const code = plugin.toManim({ name:'label_1', type:'label', props:{...el.props, text:'Hello'} });
ok(code.includes('Text("Hello"'), 'toManim 包含 Text("...")');

console.log(`\n完成: ${pass} 通过, ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);



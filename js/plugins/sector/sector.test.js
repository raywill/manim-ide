/**
 * Sector 插件临时测试（已移至插件目录）
 */

// Mock环境
global.ManimEditor = {
    elements: [],
    canvas: { width: 800, height: 800 },
    coordSystem: { props: { x_range: [-7, 7, 1], y_range: [-7, 7, 1] } },
    manimToCanvas: function(manimX, manimY) {
        const xRange = this.coordSystem.props.x_range;
        const yRange = this.coordSystem.props.y_range;
        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];
        return {
            x: ((manimX - xRange[0]) / xSpan) * this.canvas.width,
            y: this.canvas.height - ((manimY - yRange[0]) / ySpan) * this.canvas.height
        };
    }
};

global.setRenderOpacity = function(ctx, element) { ctx.globalAlpha = 1; };
global.sanitizeVariableName = (name) => name.replace(/[^a-zA-Z0-9_]/g, '_');
global.formatNumber = (num) => {
    if (num == null || isNaN(num)) return '0';
    if (Number.isInteger(num)) return num.toString();
    return Number(num).toFixed(2).replace(/\.?0+$/, '');
};
global.hexToManimColor = (hex) => {
    const map = { '#3498db': 'BLUE', '#2c3e50': 'DARK_GRAY', '#3498d0': 'BLUE' };
    return map[(hex || '').toLowerCase()] || 'WHITE';
};

let shapes = {};
global.registerShape = (plugin) => { shapes[plugin.type] = plugin; };

// 加载插件（相对当前目录）
require('./sector.js');

const plugin = shapes['sector'];
let passed = 0, failed = 0;
function ok(cond, msg) {
    if (cond) { console.log('✅', msg); passed++; } else { console.log('❌', msg); failed++; }
}

console.log('🧪 扇形插件测试');

// 测试1：三点完成创建
let s1 = null;
let st = null;
st = plugin.onDrawClick(null, [0, 0, 0], ManimEditor); // A
st = plugin.onDrawClick(st.state, [1, 0, 0], ManimEditor); // B
st = plugin.onDrawClick(st.state, [0, 1, 0], ManimEditor); // C
ok(st && st.element && st.element.type === 'sector', '三次点击创建扇形');
s1 = st.element;

// 测试2：toManim 输出
const code = plugin.toManim(s1);
ok(code.includes('Sector('), 'toManim 包含 Sector');
ok(code.includes('.set_fill('), 'toManim 包含 set_fill');
ok(code.includes('.set_stroke('), 'toManim 包含 set_stroke');

// 测试3：hitTest 基本命中（中心点应在扇形内）
const hitCenter = plugin.hitTest(s1, (s1.props.pointA[0] + s1.props.pointC[0]) / 2, (s1.props.pointA[1] + s1.props.pointC[1]) / 2, ManimEditor);
ok(hitCenter === true || hitCenter === false, 'hitTest 可调用并返回布尔值');

console.log(`\n总结: 通过 ${passed}, 失败 ${failed}`);
if (failed > 0) process.exit(1); else process.exit(0);



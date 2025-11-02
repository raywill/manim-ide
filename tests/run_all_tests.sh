#!/bin/bash
# 运行所有测试

echo "═══════════════════════════════════════════════════════════"
echo "           运行所有Manim IDE测试"
echo "═══════════════════════════════════════════════════════════"

TOTAL=0
PASSED=0

# 主测试框架
echo ""
echo "📋 主测试框架..."
if node tests/plugin_test.js; then
    echo "✅ 主测试通过"
    PASSED=$((PASSED + 1))
else
    echo "❌ 主测试失败"
fi
TOTAL=$((TOTAL + 1))

# Circle测试
echo ""
echo "📋 Circle插件测试..."
if node js/plugins/circle/circle.test.js; then
    echo "✅ Circle测试通过"
    PASSED=$((PASSED + 1))
else
    echo "❌ Circle测试失败"
fi
TOTAL=$((TOTAL + 1))

# Ellipse测试
echo ""
echo "📋 Ellipse插件测试..."
if node js/plugins/ellipse/ellipse.test.js; then
    echo "✅ Ellipse测试通过"
    PASSED=$((PASSED + 1))
else
    echo "❌ Ellipse测试失败"
fi
TOTAL=$((TOTAL + 1))

# 总结
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "测试总结"
echo "═══════════════════════════════════════════════════════════"
echo "总计测试套件: $TOTAL"
echo "通过: $PASSED"
echo "失败: $((TOTAL - PASSED))"

if [ $PASSED -eq $TOTAL ]; then
    echo ""
    echo "🎉 所有测试通过！"
    exit 0
else
    echo ""
    echo "⚠️ 有测试失败"
    exit 1
fi


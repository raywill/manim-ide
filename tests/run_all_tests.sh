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

# 自动扫描并运行所有插件测试（js/plugins/**/**/*.test.js 以及 js/plugins/**/*.test.js）
echo ""
echo "🔎 扫描插件测试..."

# 收集测试文件列表
PLUGIN_TESTS=()
while IFS= read -r -d '' file; do
    PLUGIN_TESTS+=("$file")
done < <(find js/plugins -type f -name "*.test.js" -print0 | sort -z)

if [ ${#PLUGIN_TESTS[@]} -eq 0 ]; then
    echo "（未发现插件测试文件）"
else
    for test_file in "${PLUGIN_TESTS[@]}"; do
        echo ""
        echo "📋 运行插件测试: $test_file"
        if node "$test_file"; then
            echo "✅ $test_file 通过"
            PASSED=$((PASSED + 1))
        else
            echo "❌ $test_file 失败"
        fi
        TOTAL=$((TOTAL + 1))
    done
fi

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


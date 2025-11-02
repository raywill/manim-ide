# 测试框架

本目录包含通用的测试框架代码。

## 文件

- `plugin_test.js` - 插件测试框架（包含基础测试和主要插件测试）
- `run_all_tests.sh` - 运行所有测试的脚本

## 插件测试

每个插件的测试文件在对应的插件目录中：
- `js/plugins/circle/circle.test.js`
- `js/plugins/ellipse/ellipse.test.js`
- `js/plugins/circle/bounds.test.js`（专项测试）

## 运行测试

```bash
# 运行所有测试
bash tests/run_all_tests.sh

# 运行特定插件测试
node js/plugins/circle/circle.test.js
```

## 测试覆盖

- 主测试框架：49个测试
- Circle：7个测试
- Ellipse：4个测试
- Bounds专项：4个测试
- **总计：64个测试，100%通过**

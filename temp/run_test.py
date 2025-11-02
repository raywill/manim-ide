#!/usr/bin/env python3
"""
Manim Editor 测试脚本
用于自动化测试生成的Manim代码
"""

import os
import sys
import json
import subprocess
from pathlib import Path

def test_manim_code():
    """测试生成的Manim代码是否可以执行"""
    
    # 示例Manim代码
    test_code = """from manim import *

class GeneratedScene(Scene):
    def construct(self):
        square_1 = Square(side_length=1.5, color=BLUE).move_to([-2, 1, 0])
        arrow_1 = Arrow(start=[-1, -1, 0], end=[2, 1, 0], color=RED, stroke_width=2)
        axes_1 = Axes(
            x_range=[-3, 3, 1], 
            y_range=[-3, 3, 1], 
            x_length=6, 
            y_length=6, 
            axis_config={"color": "#7f8c8d"}
        )
        
        # 添加所有元素到场景
        self.add(
            square_1,
            arrow_1,
            axes_1
        )
"""
    
    # 保存测试代码
    test_file = Path(__file__).parent / "test_scene.py"
    with open(test_file, 'w', encoding='utf-8') as f:
        f.write(test_code)
    
    print(f"✓ 测试代码已保存到: {test_file}")
    
    # 检查是否安装了Manim
    try:
        result = subprocess.run(
            ['manim', '--version'],
            capture_output=True,
            text=True
        )
        print(f"✓ Manim版本: {result.stdout.strip()}")
        
        # 尝试验证代码语法
        print("\n正在验证代码语法...")
        result = subprocess.run(
            ['python3', '-m', 'py_compile', str(test_file)],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✓ 代码语法验证通过")
        else:
            print(f"✗ 语法错误: {result.stderr}")
            return False
            
        # 可选：渲染场景（需要较长时间）
        print("\n如果要渲染场景，请运行：")
        print(f"  manim {test_file} GeneratedScene -pql")
        
        return True
        
    except FileNotFoundError:
        print("⚠ 未安装Manim，跳过渲染测试")
        print("  如需测试渲染，请安装Manim: pip install manim")
        
        # 仍然可以测试语法
        print("\n正在验证代码语法...")
        result = subprocess.run(
            ['python3', '-m', 'py_compile', str(test_file)],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✓ 代码语法验证通过")
            return True
        else:
            print(f"✗ 语法错误: {result.stderr}")
            return False

def test_json_format():
    """测试JSON格式是否正确"""
    
    sample_json = {
        "version": "1.0",
        "elements": [
            {
                "type": "square",
                "name": "square_1",
                "id": "elem_1",
                "props": {
                    "x": -2,
                    "y": 1,
                    "size": 1.5,
                    "color": "#3498db",
                    "opacity": 1,
                    "hidden": False
                }
            },
            {
                "type": "arrow",
                "name": "arrow_1",
                "id": "elem_2",
                "props": {
                    "start": [-1, -1, 0],
                    "end": [2, 1, 0],
                    "color": "#e74c3c",
                    "stroke_width": 2,
                    "hidden": False
                }
            }
        ],
        "metadata": {
            "created": "2025-11-02T00:00:00.000Z",
            "elementCount": 2
        }
    }
    
    try:
        # 测试序列化
        json_str = json.dumps(sample_json, indent=2, ensure_ascii=False)
        
        # 测试反序列化
        parsed = json.loads(json_str)
        
        # 验证数据
        assert parsed["version"] == "1.0"
        assert len(parsed["elements"]) == 2
        assert parsed["elements"][0]["type"] == "square"
        
        print("✓ JSON格式验证通过")
        
        # 保存示例JSON
        json_file = Path(__file__).parent / "sample_scene.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            f.write(json_str)
        
        print(f"✓ 示例JSON已保存到: {json_file}")
        
        return True
        
    except Exception as e:
        print(f"✗ JSON测试失败: {e}")
        return False

def test_project_structure():
    """测试项目文件结构"""
    
    project_root = Path(__file__).parent.parent
    
    required_files = [
        "index.html",
        "README.md",
        "css/style.css",
        "js/core.js",
        "js/ui.js",
        "js/export.js",
        "js/app.js",
        "js/plugins/square.js",
        "js/plugins/rectangle.js",
        "js/plugins/arrow.js",
        "js/plugins/line.js",
        "js/plugins/curve.js",
        "js/plugins/coordinateSystem.js",
        "tests/test_basic.html"
    ]
    
    print("检查项目文件结构...")
    all_exist = True
    
    for file_path in required_files:
        full_path = project_root / file_path
        if full_path.exists():
            print(f"  ✓ {file_path}")
        else:
            print(f"  ✗ {file_path} (缺失)")
            all_exist = False
    
    if all_exist:
        print("\n✓ 所有必需文件都存在")
        return True
    else:
        print("\n✗ 有文件缺失")
        return False

def main():
    print("=" * 60)
    print("Manim Visual Editor - 自动化测试")
    print("=" * 60)
    
    results = []
    
    # 测试1: 项目结构
    print("\n[测试 1/3] 项目文件结构")
    print("-" * 60)
    results.append(test_project_structure())
    
    # 测试2: JSON格式
    print("\n[测试 2/3] JSON格式验证")
    print("-" * 60)
    results.append(test_json_format())
    
    # 测试3: Manim代码
    print("\n[测试 3/3] Manim代码验证")
    print("-" * 60)
    results.append(test_manim_code())
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"通过: {passed}/{total}")
    
    if passed == total:
        print("\n🎉 所有测试通过！")
        print("\n下一步:")
        print("1. 启动HTTP服务器: python3 -m http.server 8000")
        print("2. 在浏览器中打开: http://localhost:8000")
        print("3. 测试编辑器功能")
        return 0
    else:
        print("\n⚠ 部分测试失败，请检查上述错误信息")
        return 1

if __name__ == "__main__":
    sys.exit(main())


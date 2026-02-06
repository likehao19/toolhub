"""
ToolHub 图标生成脚本
自动从 SVG 生成所需的各种尺寸图标
需要安装: pip install cairosvg pillow
"""

try:
    import cairosvg
    from PIL import Image
    import io
    import os
except ImportError:
    print("❌ 缺少依赖库！")
    print("请先安装：pip install cairosvg pillow")
    exit(1)

def svg_to_png(svg_path, output_path, width, height):
    """将 SVG 转换为指定尺寸的 PNG"""
    png_data = cairosvg.svg2png(
        url=svg_path,
        output_width=width,
        output_height=height
    )
    with open(output_path, 'wb') as f:
        f.write(png_data)
    print(f"✅ 生成: {output_path} ({width}x{height})")

def create_ico(png_paths, output_path):
    """从多个 PNG 创建 .ico 文件"""
    images = []
    for path in png_paths:
        img = Image.open(path)
        images.append(img)
    
    # 保存为 .ico，包含多个尺寸
    images[0].save(
        output_path,
        format='ICO',
        sizes=[(img.width, img.height) for img in images]
    )
    print(f"✅ 生成: {output_path}")

def main():
    # 路径配置
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'src-tauri', 'icons')
    svg_path = os.path.join(icons_dir, 'tray-icon.svg')
    
    if not os.path.exists(svg_path):
        print(f"❌ 找不到 SVG 文件: {svg_path}")
        print("请确保 src-tauri/icons/tray-icon.svg 文件存在")
        return
    
    print("🚀 开始生成 ToolHub 图标...")
    print()
    
    # 生成各种尺寸的 PNG
    sizes = [
        (16, '16x16.png'),
        (32, '32x32.png'),
        (48, '48x48.png'),
        (64, '64x64.png'),
        (128, '128x128.png'),
        (256, '128x128@2x.png'),
        (512, 'icon.png'),
    ]
    
    temp_pngs = []
    for size, filename in sizes:
        output_path = os.path.join(icons_dir, filename)
        svg_to_png(svg_path, output_path, size, size)
        if size <= 256:  # 用于 .ico
            temp_pngs.append(output_path)
    
    print()
    print("📦 生成 Windows .ico 文件...")
    ico_path = os.path.join(icons_dir, 'icon.ico')
    create_ico(temp_pngs, ico_path)
    
    print()
    print("✨ 完成！所有图标已生成到: src-tauri/icons/")
    print()
    print("📋 下一步:")
    print("1. 重新运行应用: npm run tauri dev")
    print("2. 或者构建应用: npm run tauri build")
    print()
    print("💡 提示: Windows 任务栏和托盘图标已自动配置")

if __name__ == '__main__':
    main()

import os
import re
from pptx import Presentation
from pptx.util import Inches

# 获取当前脚本所在目录的路径
image_folder = os.getcwd()  # 获取当前工作目录
output_ppt = os.path.basename(image_folder) + ".pptx"  # 使用文件夹名称作为PPT的文件名

# 创建一个PPT文件
prs = Presentation()

# 获取所有图片文件，并提取数字进行排序
image_files = [f for f in os.listdir(image_folder) if f.endswith(('jpg', 'jpeg', 'png'))]

# 使用正则表达式提取数字，并按数字进行排序
image_files.sort(key=lambda x: int(re.search(r'\d+', x).group()))

# 获取幻灯片的宽度和高度
slide_width = prs.slide_width
slide_height = prs.slide_height

# 遍历图片文件，将每张图片插入PPT
for image_file in image_files:
    img_path = os.path.join(image_folder, image_file)

    # 添加一个新的幻灯片
    slide_layout = prs.slide_layouts[5]  # 选择一个空白的幻灯片布局
    slide = prs.slides.add_slide(slide_layout)

    # 设置图片的尺寸和位置（让图片铺满整个幻灯片）
    # 使用幻灯片的宽度和高度来调整图片尺寸
    left = 0  # 图片左边距
    top = 0   # 图片上边距
    pic = slide.shapes.add_picture(img_path, left, top, width=slide_width, height=slide_height)

# 保存PPT文件
prs.save(output_ppt)

print(f"PPT已生成，保存路径：{os.path.abspath(output_ppt)}")

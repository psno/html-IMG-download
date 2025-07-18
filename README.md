# html-IMG-download
下载微信公众号或者某些网页的PPT文件的油猴脚本以及将图片变成PPT的python脚本
# 自动化PPT生成工具

这个仓库包含三个脚本：  
1. **PPT自动提取油猴脚本**  
2. **微信公众号自动下载图片油猴脚本**  
3. **jpg2PPT.py Python脚本**

这些脚本的目的是帮助用户高效地从网络和微信公众号中提取内容并将其转换为PPT，简化了大量手动操作。

## 1. PPT自动提取油猴脚本

### 脚本介绍：
这个油猴脚本能够自动从指定的PPT页面提取每一页的图片。  
用户只需在浏览器中运行该脚本，它会自动下载PPT页面的每一页图像，并保存到本地。脚本支持手动和自动下载模式，可以逐页提取PPT图像，甚至可以在出现翻页按钮时自动进行翻页。

### 功能特点：
- **自动提取PPT页面图像**：通过自动化浏览器控制，逐页提取PPT中的图片。
- **手动或自动下载**：可以手动点击下载每一页，也可以启动自动下载，脚本会自动逐页下载PPT。
- **翻页控制**：自动控制翻页按钮，确保每一页PPT的图像都被提取。

### 使用方法：
1. 安装**Tampermonkey**扩展。
2. 创建一个新脚本并将此脚本粘贴进去。
3. 在指定的网站上运行该脚本，脚本会自动提取并保存每一页PPT的图像。

## 2. 微信公众号自动下载图片油猴脚本

### 脚本介绍：
此油猴脚本用于从微信公众号文章中自动提取正文图片并保存到本地。用户只需要在浏览器中运行脚本，脚本会抓取页面中的所有图片，并按顺序保存。

### 功能特点：
- **自动下载微信公众号图片**：自动抓取文章中的所有图片，并保存到本地。
- **图片按顺序保存**：根据图片在文章中的顺序进行下载，确保不会错乱。
- **支持多种图片格式**：支持 `.jpg`, `.png`, `.jpeg` 等常见图片格式的下载。

### 使用方法：
1. 安装**Tampermonkey**扩展。
2. 创建一个新脚本并将此脚本粘贴进去。
3. 在微信公众号页面运行该脚本，脚本会自动提取并保存图片。

## 3. jpg2PPT.py Python脚本

### 脚本介绍：
这个Python脚本用于将指定文件夹内的图片自动转换为PPT文件。脚本会按图片的顺序将每一张图片插入到PPT中，并确保每张图片铺满整个幻灯片，避免出现白色边框。

### 功能特点：
- **自动转换图片为PPT**：将文件夹内的所有图片按顺序插入PPT，并生成一个新的PPT文件。
- **图片自适应幻灯片大小**：确保每张图片都填满幻灯片，避免出现白边。
- **支持批量处理**：可以处理多个图片文件，自动生成包含所有图片的PPT文件。

### 使用方法：
1. 安装Python并安装依赖：
   ```bash
   pip install python-pptx

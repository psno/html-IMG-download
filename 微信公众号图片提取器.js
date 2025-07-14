// ==UserScript==
// @name         微信公众号图片提取器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  从微信公众号页面提取并下载所有正文图片
// @author       You
// @match        https://mp.weixin.qq.com/s/*
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        #wechat-img-extractor {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: white;
            border: 2px solid #1aad19;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            min-width: 280px;
        }

        #wechat-img-extractor h3 {
            margin: 0 0 10px 0;
            color: #1aad19;
            font-size: 16px;
            text-align: center;
        }

        #wechat-img-extractor .stats {
            margin-bottom: 10px;
            font-size: 14px;
            color: #666;
        }

        #wechat-img-extractor .progress-bar {
            width: 100%;
            height: 20px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        #wechat-img-extractor .progress-fill {
            height: 100%;
            background: #1aad19;
            transition: width 0.3s ease;
            border-radius: 10px;
        }

        #wechat-img-extractor .progress-text {
            text-align: center;
            font-size: 12px;
            margin-top: 5px;
            color: #666;
        }

        #wechat-img-extractor .controls {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        #wechat-img-extractor button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s ease;
        }

        #wechat-img-extractor .btn-primary {
            background: #1aad19;
            color: white;
        }

        #wechat-img-extractor .btn-primary:hover {
            background: #16941a;
        }

        #wechat-img-extractor .btn-secondary {
            background: #f0f0f0;
            color: #666;
        }

        #wechat-img-extractor .btn-secondary:hover {
            background: #e0e0e0;
        }

        #wechat-img-extractor .btn-disabled {
            background: #ccc;
            color: #999;
            cursor: not-allowed;
        }

        #wechat-img-extractor .options {
            margin-bottom: 10px;
        }

        #wechat-img-extractor .options label {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
            font-size: 14px;
            cursor: pointer;
        }

        #wechat-img-extractor .options input[type="checkbox"] {
            margin-right: 8px;
        }

        #wechat-img-extractor .log {
            max-height: 100px;
            overflow-y: auto;
            background: #f8f8f8;
            padding: 8px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 12px;
            color: #666;
        }

        .image-highlight {
            border: 3px solid #ff0000 !important;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5) !important;
        }
    `);

    class WechatImageExtractor {
        constructor() {
            this.images = [];
            this.currentIndex = 0;
            this.downloading = false;
            this.includeText = false;
            this.autoDownload = false;
            this.downloadedCount = 0;
            this.init();
        }

        init() {
            this.createPanel();
            this.scanImages();
            this.updateStats();
        }

        createPanel() {
            const panel = document.createElement('div');
            panel.id = 'wechat-img-extractor';
            panel.innerHTML = `
                <h3>📸 图片提取器</h3>
                <div class="stats">
                    <div>找到图片: <span id="total-images">0</span></div>
                    <div>已下载: <span id="downloaded-count">0</span></div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
                <div class="progress-text" id="progress-text">0%</div>

                <div class="options">
                    <label>
                        <input type="checkbox" id="include-text"> 包含页面文本 (生成单个文本文件)
                    </label>
                    <label>
                        <input type="checkbox" id="auto-download"> 自动下载模式
                    </label>
                </div>

                <div class="controls">
                    <button class="btn-primary" id="scan-btn">🔍 重新扫描</button>
                    <button class="btn-primary" id="download-all-btn">📥 下载所有图片</button>
                    <button class="btn-secondary" id="download-current-btn">📥 下载当前图片</button>
                    <button class="btn-secondary" id="prev-btn">⬅️ 上一张</button>
                    <button class="btn-secondary" id="next-btn">➡️ 下一张</button>
                </div>

                <div class="log" id="download-log"></div>
            `;
            document.body.appendChild(panel);

            this.bindEvents();
        }

        bindEvents() {
            document.getElementById('scan-btn').addEventListener('click', () => this.scanImages());
            document.getElementById('download-all-btn').addEventListener('click', () => this.downloadAll());
            document.getElementById('download-current-btn').addEventListener('click', () => this.downloadCurrent());
            document.getElementById('prev-btn').addEventListener('click', () => this.previousImage());
            document.getElementById('next-btn').addEventListener('click', () => this.nextImage());

            document.getElementById('include-text').addEventListener('change', (e) => {
                this.includeText = e.target.checked;
            });

            document.getElementById('auto-download').addEventListener('change', (e) => {
                this.autoDownload = e.target.checked;
                if (this.autoDownload && this.images.length > 0) {
                    this.downloadAll();
                }
            });
        }

        scanImages() {
            // 清除之前的高亮
            document.querySelectorAll('.image-highlight').forEach(img => {
                img.classList.remove('image-highlight');
            });

            // 扫描图片的多种可能选择器
            const selectors = [
                'img.rich_pages.wxw-img.js_insertlocalimg',
                'img[data-src]',
                '.rich_media_content img',
                '#js_content img'
            ];

            let foundImages = [];

            for (const selector of selectors) {
                const imgs = document.querySelectorAll(selector);
                imgs.forEach(img => {
                    const src = img.getAttribute('data-src') || img.getAttribute('src');
                    if (src && src.startsWith('http') && !foundImages.find(item => item.src === src)) {
                        foundImages.push({
                            element: img,
                            src: src
                        });
                    }
                });
            }

            this.images = foundImages;
            this.currentIndex = 0;
            this.downloadedCount = 0;
            this.updateStats();
            this.highlightCurrentImage();
            this.log(`扫描完成，找到 ${this.images.length} 张图片`);
        }

        extractPageText() {
            let fullText = '';

            // 提取标题
            const title = document.querySelector('#activity-name, .rich_media_title, h1, h2');
            if (title) {
                fullText += title.textContent.trim() + '\r\n\r\n';
            }

            // 提取作者信息
            const author = document.querySelector('.rich_media_meta_list, .profile_meta, .wx_follow_nickname');
            if (author) {
                fullText += '作者：' + author.textContent.trim() + '\r\n\r\n';
            }

            // 提取正文内容 - 使用更简单直接的方法
            const contentSelectors = [
                '#js_content',
                '.rich_media_content',
                '.rich_media_wrp',
                '.rich_media_area_primary'
            ];

            let contentElement = null;
            for (const selector of contentSelectors) {
                contentElement = document.querySelector(selector);
                if (contentElement) break;
            }

            if (contentElement) {
                // 直接提取所有段落和文本元素
                const textElements = contentElement.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, section');
                let processedTexts = new Set();

                textElements.forEach(element => {
                    // 跳过包含图片的元素
                    if (element.querySelector('img')) return;

                    const text = element.textContent.trim();
                    if (text && text.length > 5 && !processedTexts.has(text)) {
                        processedTexts.add(text);

                        const tagName = element.tagName.toLowerCase();

                        // 根据元素类型添加换行
                        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                            fullText += '\r\n' + text + '\r\n\r\n';
                        } else if (['p', 'div', 'section'].includes(tagName)) {
                            fullText += text + '\r\n\r\n';
                        } else {
                            fullText += text + '\r\n';
                        }
                    }
                });

                // 如果上面的方法没有提取到足够内容，使用备用方法
                if (fullText.length < 100) {
                    fullText += '\r\n--- 备用提取方法 ---\r\n\r\n';
                    const allText = contentElement.textContent.trim();
                    // 按句号分段
                    const sentences = allText.split(/[。！？]/);
                    sentences.forEach(sentence => {
                        const cleanSentence = sentence.trim();
                        if (cleanSentence.length > 10) {
                            fullText += cleanSentence + '。\r\n\r\n';
                        }
                    });
                }
            }

            return fullText.trim();
        }

        highlightCurrentImage() {
            // 清除所有高亮
            document.querySelectorAll('.image-highlight').forEach(img => {
                img.classList.remove('image-highlight');
            });

            // 高亮当前图片
            if (this.images[this.currentIndex]) {
                this.images[this.currentIndex].element.classList.add('image-highlight');
                this.images[this.currentIndex].element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        async downloadAll() {
            if (this.downloading || this.images.length === 0) return;

            this.downloading = true;
            this.updateButtonStates();
            this.log('开始批量下载...');

            // 如果包含文本，先下载完整的文本文件
            if (this.includeText) {
                await this.downloadPageText();
            }

            for (let i = 0; i < this.images.length; i++) {
                this.currentIndex = i;
                this.highlightCurrentImage();
                await this.downloadImage(this.images[i], i + 1);
                this.downloadedCount++;
                this.updateStats();

                // 添加延迟避免请求过快
                await this.sleep(500);
            }

            this.downloading = false;
            this.updateButtonStates();
            this.log('批量下载完成！');
        }

        async downloadPageText() {
            try {
                this.log('正在提取页面文本...');
                const pageText = this.extractPageText();

                if (pageText) {
                    const textBlob = new Blob([pageText], { type: 'text/plain;charset=utf-8' });
                    const textFileName = 'page_content.txt';
                    GM_download(URL.createObjectURL(textBlob), textFileName, URL.createObjectURL(textBlob));
                    this.log('✅ 页面文本下载完成');
                } else {
                    this.log('⚠️ 未找到页面文本内容');
                }
            } catch (error) {
                this.log(`❌ 页面文本下载失败: ${error.message}`);
            }
        }

        async downloadCurrent() {
            if (this.downloading || this.images.length === 0) return;

            const current = this.images[this.currentIndex];
            if (!current) return;

            this.downloading = true;
            this.updateButtonStates();

            // 如果包含文本且是第一次下载，先下载完整的文本文件
            if (this.includeText && this.downloadedCount === 0) {
                await this.downloadPageText();
            }

            await this.downloadImage(current, this.currentIndex + 1);
            this.downloadedCount++;
            this.updateStats();

            this.downloading = false;
            this.updateButtonStates();
        }

        async downloadImage(imageData, index) {
            try {
                this.log(`正在下载第 ${index} 张图片...`);

                // 获取图片数据
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: imageData.src,
                        responseType: 'blob',
                        onload: resolve,
                        onerror: reject
                    });
                });

                // 确定文件扩展名
                const contentType = response.response.type;
                let extension = 'jpg';
                if (contentType.includes('png')) extension = 'png';
                else if (contentType.includes('gif')) extension = 'gif';
                else if (contentType.includes('webp')) extension = 'webp';

                // 下载图片
                const fileName = `page${index}.${extension}`;
                const blob = response.response;

                GM_download(URL.createObjectURL(blob), fileName, URL.createObjectURL(blob));

                this.log(`✅ 第 ${index} 张图片下载完成`);

            } catch (error) {
                this.log(`❌ 第 ${index} 张图片下载失败: ${error.message}`);
            }
        }

        previousImage() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.highlightCurrentImage();
                this.updateStats();
            }
        }

        nextImage() {
            if (this.currentIndex < this.images.length - 1) {
                this.currentIndex++;
                this.highlightCurrentImage();
                this.updateStats();
            }
        }

        updateStats() {
            document.getElementById('total-images').textContent = this.images.length;
            document.getElementById('downloaded-count').textContent = this.downloadedCount;

            const progress = this.images.length > 0 ? (this.downloadedCount / this.images.length) * 100 : 0;
            document.getElementById('progress-fill').style.width = progress + '%';
            document.getElementById('progress-text').textContent = Math.round(progress) + '%';

            this.updateButtonStates();
        }

        updateButtonStates() {
            const hasImages = this.images.length > 0;
            const notDownloading = !this.downloading;

            document.getElementById('download-all-btn').disabled = !hasImages || !notDownloading;
            document.getElementById('download-current-btn').disabled = !hasImages || !notDownloading;
            document.getElementById('prev-btn').disabled = !hasImages || this.currentIndex === 0;
            document.getElementById('next-btn').disabled = !hasImages || this.currentIndex === this.images.length - 1;

            // 更新按钮样式
            document.querySelectorAll('button').forEach(btn => {
                if (btn.disabled) {
                    btn.className = btn.className.replace('btn-primary', 'btn-disabled').replace('btn-secondary', 'btn-disabled');
                } else {
                    btn.className = btn.className.replace('btn-disabled', btn.id.includes('download') ? 'btn-primary' : 'btn-secondary');
                }
            });
        }

        log(message) {
            const logElement = document.getElementById('download-log');
            const time = new Date().toLocaleTimeString();
            logElement.innerHTML += `<div>[${time}] ${message}</div>`;
            logElement.scrollTop = logElement.scrollHeight;
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => new WechatImageExtractor(), 1000);
        });
    } else {
        setTimeout(() => new WechatImageExtractor(), 1000);
    }
})();

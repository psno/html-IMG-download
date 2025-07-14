// ==UserScript==
// @name         PPT图像自动下载器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动逐页下载PPT图像并保存
// @author       您的名字
// @match        https://s.caixuan.cc/*
// @match        https://*.caixuan.cc/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let currentPage = 1;
    let downloadedPages = new Set();
    let isAutoMode = false;
    let autoDownloadInterval = null;

    // 创建控制面板
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'ppt-downloader-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: #fff;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;

        panel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #007bff;">
                PPT图像下载器
            </div>
            <div style="margin-bottom: 10px;">
                当前页: <span id="current-page">1</span> |
                已下载: <span id="downloaded-count">0</span>页 |
                成功率: <span id="success-rate">0%</span>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div id="progress-bar" style="width: 0%; height: 100%; background: #007bff; transition: width 0.3s ease;"></div>
                </div>
                <div style="font-size: 12px; text-align: center; margin-top: 2px;">
                    <span id="progress-text">0/0</span>
                </div>
            </div>
            <div style="margin-bottom: 10px;">
                <button id="download-current" style="margin-right: 5px; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    下载当前页
                </button>
                <button id="next-page" style="padding: 5px 10px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    下一页
                </button>
            </div>
            <div style="margin-bottom: 10px;">
                <button id="auto-download" style="padding: 5px 10px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                    开始自动下载
                </button>
            </div>
            <div style="margin-bottom: 10px;">
                <label>
                    <input type="checkbox" id="auto-next" style="margin-right: 5px;">
                    自动翻页 (间隔:
                    <input type="number" id="interval" value="2" min="1" max="10" style="width: 40px; margin: 0 5px;">
                    秒)
                </label>
            </div>
            <div style="margin-bottom: 10px;">
                <button id="download-all" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                    下载所有页面
                </button>
            </div>
            <div id="status" style="margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px; min-height: 40px;">
                就绪
            </div>
            <div style="margin-top: 10px; font-size: 11px; color: #666;">
                快捷键: Ctrl+Alt+D 下载当前页 | Ctrl+Alt+N 下一页
            </div>
        `;

        document.body.appendChild(panel);
        return panel;
    }

    // 更新状态显示 (改进版本)
    function updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status');
        const colors = {
            info: '#17a2b8',
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107'
        };
        statusDiv.style.color = colors[type] || colors.info;
        statusDiv.textContent = message;

        // 更新页面计数
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('downloaded-count').textContent = downloadedPages.size;

        // 更新成功率
        const successRate = currentPage > 0 ? Math.round((downloadedPages.size / currentPage) * 100) : 0;
        document.getElementById('success-rate').textContent = successRate + '%';

        // 更新进度条
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        if (currentPage > 0) {
            const progress = (downloadedPages.size / currentPage) * 100;
            progressBar.style.width = progress + '%';
            progressText.textContent = `${downloadedPages.size}/${currentPage}`;
        } else {
            progressBar.style.width = '0%';
            progressText.textContent = '0/0';
        }
    }

    // 查找图像元素
    function findCurrentImage() {
        // 尝试多种选择器来找到当前显示的图像
        const selectors = [
            'img[src*="caixuan.cc"]',
            'img[src*=".jpg"]',
            'img[src*=".png"]',
            'img[src*=".jpeg"]',
            'div img',
            'img'
        ];

        for (const selector of selectors) {
            const images = document.querySelectorAll(selector);
            for (const img of images) {
                if (img.src && img.src.includes('caixuan.cc') && img.offsetWidth > 100) {
                    return img;
                }
            }
        }
        return null;
    }

    // 处理付费提示框
    function handlePaymentModal() {
        const modalSelectors = [
            '.modal',
            '.popup',
            '.overlay',
            '.dialog',
            '[class*="modal"]',
            '[class*="popup"]',
            '[class*="pay"]',
            '[class*="vip"]',
            '[id*="modal"]',
            '[id*="popup"]'
        ];

        const closeButtonSelectors = [
            '.close',
            '.cancel',
            '.btn-close',
            '[aria-label="Close"]',
            '[aria-label="关闭"]',
            'button:contains("关闭")',
            'button:contains("取消")',
            'button:contains("跳过")',
            '.fa-times',
            '.fa-close'
        ];

        // 查找并关闭付费提示框
        for (const selector of modalSelectors) {
            const modal = document.querySelector(selector);
            if (modal && modal.style.display !== 'none') {
                // 尝试直接隐藏
                modal.style.display = 'none';
                modal.style.visibility = 'hidden';
                modal.remove();

                // 尝试点击关闭按钮
                for (const closeSelector of closeButtonSelectors) {
                    const closeBtn = modal.querySelector(closeSelector) || document.querySelector(closeSelector);
                    if (closeBtn) {
                        closeBtn.click();
                        break;
                    }
                }

                updateStatus('已跳过付费提示框', 'success');
                return true;
            }
        }

        // 查找并点击关闭按钮
        for (const selector of closeButtonSelectors) {
            const closeBtn = document.querySelector(selector);
            if (closeBtn && closeBtn.offsetParent !== null) {
                closeBtn.click();
                updateStatus('已关闭付费提示框', 'success');
                return true;
            }
        }

        // 处理覆盖层
        const overlays = document.querySelectorAll('div[style*="position: fixed"], div[style*="position: absolute"]');
        overlays.forEach(overlay => {
            if (overlay.style.zIndex > 1000) {
                overlay.style.display = 'none';
                overlay.remove();
            }
        });

        return false;
    }

    // 查找下一页按钮
    function findNextButton() {
        // 尝试多种方式找到下一页按钮
        const selectors = [
            'svg.tabler-icon-caret-right-filled',
            'svg[class*="caret-right"]',
            'svg[class*="right"]',
            'button:contains("下一页")',
            '[onclick*="next"]',
            '.next-page',
            '.next-btn'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }

        // 如果没找到，尝试找到包含特定SVG路径的元素
        const svgElements = document.querySelectorAll('svg');
        for (const svg of svgElements) {
            const path = svg.querySelector('path');
            if (path && path.getAttribute('d') && path.getAttribute('d').includes('M9 6c0')) {
                return svg;
            }
        }

        return null;
    }

    // 检查图像URL是否有效
    function isImageUrlValid(url) {
        if (!url) return false;

        // 检查URL是否包含过期参数
        const urlObj = new URL(url);
        const expires = urlObj.searchParams.get('Expires');

        if (expires) {
            const expiresTime = parseInt(expires) * 1000; // 转换为毫秒
            const currentTime = Date.now();

            if (currentTime >= expiresTime) {
                return false; // URL已过期
            }
        }

        return true;
    }

    // 刷新页面获取新的图像URL
    function refreshImageUrl() {
        updateStatus('图像URL已过期，正在刷新页面...', 'warning');
        location.reload();
    }

    // 下载图像 (改进版本)
    async function downloadImage(imageUrl, filename) {
        try {
            // 检查URL有效性
            if (!isImageUrlValid(imageUrl)) {
                updateStatus('图像URL已过期，请刷新页面重试', 'error');
                return false;
            }

            updateStatus(`正在下载 ${filename}...`, 'info');

            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            downloadedPages.add(currentPage);
            updateStatus(`成功下载 ${filename} (${downloadedPages.size}/${currentPage})`, 'success');
            return true;
        } catch (error) {
            updateStatus(`下载失败: ${error.message}`, 'error');
            return false;
        }
    }

    // 下载当前页面
    async function downloadCurrentPage() {
        const img = findCurrentImage();
        if (!img) {
            updateStatus('未找到图像元素', 'error');
            return false;
        }

        const imageUrl = img.src;
        if (!imageUrl) {
            updateStatus('图像URL为空', 'error');
            return false;
        }

        const filename = `page${currentPage}.jpg`;
        return await downloadImage(imageUrl, filename);
    }

    // 点击下一页 (改进版本)
    function clickNextPage() {
        // 首先尝试处理付费提示框
        handlePaymentModal();

        const nextButton = findNextButton();
        if (!nextButton) {
            updateStatus('未找到下一页按钮', 'error');
            return false;
        }

        // 尝试多种点击方式
        try {
            nextButton.click();
            currentPage++;
            updateStatus(`已翻到第 ${currentPage} 页`, 'info');

            // 等待页面更新后再次检查付费提示框
            setTimeout(() => {
                handlePaymentModal();
            }, 500);

            return true;
        } catch (error) {
            // 尝试触发事件
            try {
                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                nextButton.dispatchEvent(event);
                currentPage++;
                updateStatus(`已翻到第 ${currentPage} 页`, 'info');

                // 等待页面更新后再次检查付费提示框
                setTimeout(() => {
                    handlePaymentModal();
                }, 500);

                return true;
            } catch (e) {
                updateStatus('翻页失败', 'error');
                return false;
            }
        }
    }

    // 自动下载所有页面 (改进版本)
    async function downloadAllPages() {
        if (isAutoMode) {
            stopAutoDownload();
            return;
        }

        isAutoMode = true;
        const autoButton = document.getElementById('auto-download');
        autoButton.textContent = '停止自动下载';
        autoButton.style.background = '#dc3545';

        const interval = parseInt(document.getElementById('interval').value) * 1000;
        let consecutiveFailures = 0;
        let maxFailures = 3;

        const autoDownloadProcess = async () => {
            try {
                // 先处理付费提示框
                handlePaymentModal();

                // 等待页面稳定
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 下载当前页
                const downloadSuccess = await downloadCurrentPage();
                if (!downloadSuccess) {
                    consecutiveFailures++;
                    updateStatus(`下载失败 (连续失败 ${consecutiveFailures}/${maxFailures} 次)`, 'warning');

                    if (consecutiveFailures >= maxFailures) {
                        updateStatus('连续下载失败次数过多，自动下载已停止', 'error');
                        stopAutoDownload();
                        return;
                    }
                } else {
                    consecutiveFailures = 0;
                }

                // 等待一下让页面稳定
                await new Promise(resolve => setTimeout(resolve, 1500));

                // 再次处理付费提示框
                handlePaymentModal();

                // 尝试翻页
                const nextPageSuccess = clickNextPage();
                if (nextPageSuccess) {
                    // 等待页面加载
                    await new Promise(resolve => setTimeout(resolve, interval));

                    // 再次处理付费提示框
                    handlePaymentModal();

                    // 继续自动下载
                    if (isAutoMode) {
                        setTimeout(autoDownloadProcess, 500);
                    }
                } else {
                    updateStatus(`已完成所有页面下载！总共下载 ${downloadedPages.size} 页`, 'success');
                    stopAutoDownload();
                }
            } catch (error) {
                updateStatus(`自动下载出错: ${error.message}`, 'error');
                consecutiveFailures++;
                if (consecutiveFailures >= maxFailures) {
                    stopAutoDownload();
                } else {
                    setTimeout(autoDownloadProcess, interval);
                }
            }
        };

        autoDownloadProcess();
    }

    // 停止自动下载
    function stopAutoDownload() {
        isAutoMode = false;
        if (autoDownloadInterval) {
            clearInterval(autoDownloadInterval);
            autoDownloadInterval = null;
        }
        const autoButton = document.getElementById('auto-download');
        autoButton.textContent = '开始自动下载';
        autoButton.style.background = '#ffc107';
    }

    // 初始化 (改进版本)
    function init() {
        // 等待页面完全加载
        setTimeout(() => {
            const panel = createControlPanel();

            // 立即处理付费提示框
            handlePaymentModal();

            // 定期检查并处理付费提示框
            setInterval(handlePaymentModal, 2000);

            // 绑定事件
            document.getElementById('download-current').addEventListener('click', downloadCurrentPage);
            document.getElementById('next-page').addEventListener('click', clickNextPage);
            document.getElementById('auto-download').addEventListener('click', downloadAllPages);
            document.getElementById('download-all').addEventListener('click', downloadAllPages);

            updateStatus('脚本已就绪，可以开始下载', 'success');
        }, 1000);
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 添加键盘快捷键 (修改为 Ctrl + Alt + 键以避免冲突)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && e.key === 'd') {
            e.preventDefault();
            downloadCurrentPage();
        }
        if (e.ctrlKey && e.altKey && e.key === 'n') {
            e.preventDefault();
            clickNextPage();
        }
    });

    console.log('PPT图像下载器已加载');
})();

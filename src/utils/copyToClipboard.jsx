import { message } from "antd";

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本内容
 * @param {string} type - 复制内容的类型标识（用于提示信息），默认为 'ID'
 * @param {boolean} showMessage - 是否显示提示信息，默认为 true
 * @returns {Promise<boolean>} - 复制是否成功
 */
export const copyToClipboard = async (text, type = 'ID', showMessage = true) => {
    try {
        // 尝试使用现代 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            if (showMessage) {
                message.success(`${type} 已复制到剪贴板`);
            }
            return true;
        } else {
            // 降级方案：使用传统的 textarea + execCommand 方式
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            if (showMessage) {
                message.success(`${type} 已复制到剪贴板`);
            }
            return true;
        }
    } catch (err) {
        console.error('复制失败:', err);
        if (showMessage) {
            message.error('复制失败，请手动复制');
        }
        return false;
    }
};
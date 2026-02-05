import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 流式 LLM 自定义 Hook
 * 使用 Fetch API + ReadableStream 方式处理服务器发送事件（SSE）流式响应
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.apiUrl - API 端点 URL（可选，默认使用环境变量）
 * @param {Function} options.onError - 错误处理回调函数
 * @returns {Object} Hook 返回的状态和方法
 */
export const useStreamLLM = (options = {}) => {
    const { apiUrl, onError } = options;
    
    // 状态管理
    const [content, setContent] = useState(''); // 当前接收到的完整内容
    const [isLoading, setIsLoading] = useState(false); // 是否正在加载
    const [error, setError] = useState(null); // 错误信息
    
    // 使用 ref 存储可取消的控制器，支持中断请求
    const abortControllerRef = useRef(null);
    // 使用 ref 存储是否已取消的标记
    const isCancelledRef = useRef(false);

    /**
     * 重置所有状态
     */
    const reset = useCallback(() => {
        setContent('');
        setIsLoading(false);
        setError(null);
        isCancelledRef.current = false;
        
        // 取消之前的请求
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    /**
     * 中断当前请求
     */
    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        isCancelledRef.current = true;
        setIsLoading(false);
    }, []);

    /**
     * 发送流式请求
     * 
     * @param {Object} params - 请求参数
     * @param {Function} onChunk - 每个数据块的回调函数（可选）
     * @param {Function} onComplete - 完成时的回调函数（可选）
     */
    const stream = useCallback(async (params, onChunk, onComplete) => {
        // 重置状态
        reset();
        setIsLoading(true);
        setError(null);
        isCancelledRef.current = false;

        try {
            // 获取认证信息
            const token = localStorage.getItem('Authorization') || '';
            const tenantId = localStorage.getItem('tenantId') || 'default';

            // 构建请求 URL
            const url = apiUrl || `${process.env.REACT_APP_API_URL || ''}/api/w8t/ai/chat`;

            // 创建 AbortController 用于取消请求
            abortControllerRef.current = new AbortController();

            // 发送 POST 请求
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'TenantID': tenantId,
                },
                body: JSON.stringify(params),
                signal: abortControllerRef.current.signal, // 支持取消
            });

            if (!response.ok) {
                throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
            }

            // 检查响应体是否存在
            if (!response.body) {
                throw new Error('响应体为空');
            }

            // 获取流式读取器
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            
            let buffer = ''; // 缓冲区，用于处理不完整的行
            let accumulatedContent = ''; // 累积的完整内容

            // 循环读取流式数据
            while (true) {
                // 检查是否已取消
                if (isCancelledRef.current) {
                    reader.cancel();
                    break;
                }

                const { done, value } = await reader.read();

                if (done) {
                    // 流式传输完成，处理剩余缓冲区
                    if (buffer.trim()) {
                        const line = buffer.trim();
                        if (line.startsWith('data:')) {
                            const dataStr = line.slice(5).trim();
                            if (dataStr) {
                                let chunk = '';
                                try {
                                    const jsonData = JSON.parse(dataStr);
                                    if (jsonData && typeof jsonData === 'object' && jsonData.content) {
                                        chunk = jsonData.content;
                                    } else if (typeof jsonData === 'string') {
                                        chunk = jsonData;
                                    } else {
                                        chunk = dataStr;
                                    }
                                } catch (e) {
                                    chunk = dataStr;
                                }
                                if (chunk) {
                                    // 后端返回的是纯 UTF-8 编码的文本，无需进行 HTML 反转义
                                    // 直接使用接收到的内容

                                    accumulatedContent += chunk;
                                    setContent(prev => prev + chunk);
                                    if (onChunk) {
                                        onChunk(chunk, accumulatedContent);
                                    }
                                }
                            }
                        }
                    }
                    break;
                }

                // 解码数据块
                buffer += decoder.decode(value, { stream: true });
                
                // 按换行符分割，处理完整的行
                const lines = buffer.split('\n');
                
                // 保留最后一行（可能不完整）在缓冲区中
                buffer = lines.pop() || '';

                // 处理完整的行
                for (const line of lines) {
                    if (!line.trim()) continue;

                    // 跳过 event: 行
                    if (line.startsWith('event:')) continue;

                    // 处理 data: 行
                    if (line.startsWith('data:')) {
                        const dataStr = line.slice(5).trim(); // 移除 "data: " 前缀

                        if (dataStr) {
                            let chunk = '';

                            // 尝试解析 JSON 格式的数据（后端可能返回 JSON）
                            try {
                                const jsonData = JSON.parse(dataStr);
                                // 如果解析成功且包含 content 字段，使用 content
                                if (jsonData && typeof jsonData === 'object' && jsonData.content) {
                                    chunk = jsonData.content;
                                } else if (typeof jsonData === 'string') {
                                    chunk = jsonData;
                                } else {
                                    // 如果不是预期的格式，直接使用原始字符串
                                    chunk = dataStr;
                                }
                            } catch (e) {
                                // 如果不是 JSON，直接使用原始字符串
                                chunk = dataStr;
                            }

                            if (chunk) {
                                // 后端返回的是纯 UTF-8 编码的文本，无需进行 HTML 反转义
                                // 直接使用接收到的内容

                                // 更新状态
                                accumulatedContent += chunk;
                                setContent(prev => prev + chunk);

                                // 调用回调函数
                                if (onChunk) {
                                    onChunk(chunk, accumulatedContent);
                                }
                            }
                        }
                    }
                }
            }

            // 标记为完成并调用完成回调
            setIsLoading(false);
            if (onComplete) {
                onComplete(accumulatedContent);
            }

        } catch (error) {
            // 如果是取消操作，不设置错误
            if (error.name === 'AbortError' || isCancelledRef.current) {
                setIsLoading(false);
                return;
            }

            // 处理其他错误
            const errorMessage = error.message || '流式请求失败';
            setError(errorMessage);
            setIsLoading(false);
            console.error('[AI-Chat] Error:', errorMessage);

            // 调用错误处理回调
            if (onError) {
                onError(error);
            }
        } finally {
            abortControllerRef.current = null;
        }
    }, [apiUrl, onError, reset]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        content,           // 当前内容
        isLoading,         // 加载状态
        error,             // 错误信息
        stream,            // 发送流式请求的方法
        reset,             // 重置状态的方法
        cancel,            // 取消请求的方法
    };
};


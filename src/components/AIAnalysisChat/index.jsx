import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Bubble, Sender } from '@ant-design/x';
import { Button, Space, Typography, Spin, Alert, Select } from 'antd';
import { StopOutlined, ReloadOutlined } from '@ant-design/icons';
import { useStreamLLM } from '../../hooks/useStreamLLM';
import { useMarkdownRenderer } from '../../utils/markdownComponents';
import { getSystemSetting } from '../../api/settings';
import OpenAiLogo from '../../img/OpenAi.png';
import './index.css';

const { Text } = Typography;

/**
 * AI Analysis Chat Component
 * A ChatGPT-style streaming chat component using @ant-design/x Bubble and XMarkdown
 *
 * @param {Object} props - Component properties
 * @param {Object} props.params - Request parameters for AI analysis
 * @param {Function} props.onComplete - Callback when analysis completes
 * @param {Function} props.onError - Error handling callback
 * @param {string} props.apiUrl - Custom API URL (optional)
 * @param {boolean} props.autoStart - Whether to auto-start analysis (default: false)
 * @param {React.ReactNode} props.header - Custom header content
 * @param {React.ReactNode} props.footer - Custom footer content
 * @param {boolean} props.showInput - Whether to show input field for follow-up questions
 */
export const AIAnalysisChat = ({
    params,
    onComplete,
    onError,
    apiUrl,
    autoStart = false,
    header,
    footer,
    showInput = false,
}) => {
    // 模型选择状态
    const [modelList, setModelList] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');

    // Use custom hook for streaming state management
    const {
        content,
        isLoading,
        error,
        stream,
        reset,
        cancel,
    } = useStreamLLM({ apiUrl, onError });

    // Refs for auto-scrolling
    const contentEndRef = useRef(null);
    const containerRef = useRef(null);

    /**
     * 加载可用的模型列表
     */
    useEffect(() => {
        const loadModels = async () => {
            try {
                const res = await getSystemSetting();
                const aiConfig = res.data?.aiConfig || {};
                const providers = aiConfig.providers || {};

                console.log('AIAnalysisChat - 加载模型配置:', { aiConfig, providers });

                // 从所有 Provider 中收集模型
                const allModels = [];
                Object.values(providers).forEach(provider => {
                    if (provider.models && Array.isArray(provider.models)) {
                        allModels.push(...provider.models);
                    }
                });

                console.log('AIAnalysisChat - 收集到的模型:', allModels);

                // 去重并转换为列表格式
                const uniqueModels = [...new Set(allModels)];
                const list = uniqueModels.map(model => ({
                    label: model,
                    value: model
                }));

                console.log('AIAnalysisChat - 最终模型列表:', list);

                setModelList(list);

                // 默认选择第一个模型
                if (list.length > 0 && !selectedModel) {
                    setSelectedModel(list[0].value);
                }

                // 如果没有模型，输出警告
                if (list.length === 0) {
                    console.warn('AIAnalysisChat - 未找到任何模型配置，请在设置页面配置 Provider');
                }
            } catch (error) {
                console.error('AIAnalysisChat - 加载模型失败:', error);
            }
        };

        loadModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Start streaming request
     */
    const handleStart = useCallback(async () => {
        if (!params) {
            return;
        }

        // 检查是否选择了模型
        if (!selectedModel) {
            onError && onError(new Error('请选择模型'));
            return;
        }

        // 包含模型
        const requestParams = {
            ...params,
            model: selectedModel
        };

        await stream(
            requestParams,
            undefined,
            (finalContent) => {
                if (onComplete) {
                    onComplete(finalContent);
                }
            }
        );
    }, [params, selectedModel, stream, onComplete, onError]);

    /**
     * Restart analysis
     */
    const handleRestart = useCallback(() => {
        reset();
        handleStart();
    }, [reset, handleStart]);

    /**
     * Stop current request
     */
    const handleStop = useCallback(() => {
        cancel();
    }, [cancel]);

    /**
     * Handle follow-up question submission
     */
    const handleSubmitQuestion = useCallback(async (question) => {
        if (!question?.trim()) return;

        // 检查是否选择了模型
        if (!selectedModel) {
            onError && onError(new Error('请选择模型'));
            return;
        }

        reset();

        // 包含模型
        const requestParams = {
            ...params,
            content: question,
            prompt: '{{ Content }}',
            model: selectedModel
        };

        await stream(
            requestParams,
            undefined,
            (finalContent) => {
                if (onComplete) {
                    onComplete(finalContent);
                }
            }
        );
    }, [params, selectedModel, stream, reset, onComplete, onError]);

    // Auto-scroll when content updates
    useEffect(() => {
        if (contentEndRef.current && containerRef.current) {
            contentEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [content]);

    // Auto-start when enabled and params provided
    useEffect(() => {
        if (autoStart && params && !isLoading && !content) {
            handleStart();
        }
    }, [autoStart, params, isLoading, content, handleStart]);

    // Use shared markdown renderer hook
    const renderMarkdown = useMarkdownRenderer();

    /**
     * Role configuration for Bubble.List
     */
    const roles = useMemo(() => ({
        ai: {
            placement: 'start',
            avatar: <img src={OpenAiLogo} alt="AI" style={{ width: 32, height: 32, borderRadius: '50%' }} />,
            variant: 'borderless',
            classNames: {
                content: 'ai-analysis-bubble-content'
            },
            contentRender: renderMarkdown,
            header: (
                <Text strong style={{ fontSize: '14px', color: '#000' }}>
                    AI 助手
                </Text>
            ),
        },
    }), [renderMarkdown]);

    /**
     * Build bubble items for Bubble.List
     */
    const buildBubbleItems = () => {
        const items = [];

        if (content || isLoading) {
            items.push({
                key: 'ai-response',
                role: 'ai',
                content: content || '',
                loading: isLoading && !content,
                status: isLoading ? 'loading' : 'done',
            });
        }

        return items;
    };

    return (
        <div className="ai-analysis-chat">
            {/* Header area */}
            {header && (
                <div className="ai-analysis-chat-header">
                    {header}
                </div>
            )}

            {/* Main content area */}
            <div className="ai-analysis-chat-content scrollbar-thin" ref={containerRef}>
                {/* Loading state when no content yet */}
                {isLoading && !content && (
                    <div className="ai-analysis-chat-loading">
                        <Spin size="small" />
                        <Text type="secondary" style={{ marginLeft: '8px' }}>
                            正在分析中...
                        </Text>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <Alert
                        type="error"
                        message="分析错误"
                        description={error}
                        showIcon
                        className="ai-analysis-chat-error"
                    />
                )}

                {/* AI Response using Bubble.List with XMarkdown */}
                {(content || (isLoading && content)) && (
                    <Bubble.List
                        items={buildBubbleItems()}
                        role={roles}
                        className="ai-analysis-bubble-list"
                    />
                )}

                {/* Scroll anchor */}
                <div ref={contentEndRef} />
            </div>

            {/* Action buttons */}
            <div className="ai-analysis-chat-actions">
                <Space>
                    <Select
                        value={selectedModel}
                        onChange={setSelectedModel}
                        style={{ width: 250 }}
                        size="small"
                        placeholder="选择模型"
                        disabled={isLoading}
                        options={modelList}
                    />
                    {isLoading ? (
                        <Button
                            icon={<StopOutlined />}
                            onClick={handleStop}
                            size="small"
                            danger
                        >
                            停止
                        </Button>
                    ) : (
                        <>
                            {content && (
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={handleRestart}
                                    size="small"
                                >
                                    重新生成
                                </Button>
                            )}
                            {!content && !isLoading && (
                                <Button
                                    type="primary"
                                    onClick={handleStart}
                                    size="small"
                                    disabled={!selectedModel}
                                >
                                    开始分析
                                </Button>
                            )}
                        </>
                    )}
                </Space>
            </div>

            {/* Optional input for follow-up questions */}
            {showInput && content && !isLoading && (
                <div className="ai-analysis-chat-input">
                    <Sender
                        placeholder="输入追问内容..."
                        onSubmit={handleSubmitQuestion}
                        loading={isLoading}
                        allowSpeech={false}
                    />
                </div>
            )}

            {/* Footer area */}
            {footer && (
                <div className="ai-analysis-chat-footer">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default AIAnalysisChat;
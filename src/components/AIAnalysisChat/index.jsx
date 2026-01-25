import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { Bubble, Sender } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
// Import both base styles and theme styles for XMarkdown
import '@ant-design/x-markdown/es/XMarkdown/index.css';
import '@ant-design/x-markdown/themes/light.css';
import { Button, Space, Typography, Spin, Alert } from 'antd';
import { StopOutlined, ReloadOutlined } from '@ant-design/icons';
import { useStreamLLM } from '../../hooks/useStreamLLM';
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
     * Start streaming request
     */
    const handleStart = useCallback(async () => {
        if (!params) {
            return;
        }

        await stream(
            params,
            undefined,
            (finalContent) => {
                if (onComplete) {
                    onComplete(finalContent);
                }
            }
        );
    }, [params, stream, onComplete]);

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

        reset();
        await stream(
            {
                ...params,
                content: question,
                prompt: '{{ Content }}',
            },
            undefined,
            (finalContent) => {
                if (onComplete) {
                    onComplete(finalContent);
                }
            }
        );
    }, [params, stream, reset, onComplete]);

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

    /**
     * Markdown renderer for AI messages
     * Uses XMarkdown with streaming support for proper rendering
     */
    const renderMarkdown = useCallback((content, info) => {
        if (!content) return null;

        // Check if this message is currently streaming
        const isStreaming = info?.status === 'loading';

        return (
            <XMarkdown
                content={content}
                className="x-markdown x-markdown-light"
                config={{
                    breaks: true,  // Enable GFM line breaks
                    gfm: true,     // Enable GitHub Flavored Markdown
                }}
                streaming={{
                    hasNextChunk: isStreaming,
                }}
            />
        );
    }, []);

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
                    <Space>
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
                            >
                                开始分析
                            </Button>
                        )}
                    </Space>
                )}
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
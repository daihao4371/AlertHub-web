import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FloatButton, Drawer, Avatar, Space, Typography, message, Select } from 'antd';
import { Bubble, Sender } from '@ant-design/x';
import { useStreamLLM } from '../../hooks/useStreamLLM';
import { useAutoScroll } from '../../utils/common';
import { useMarkdownRenderer } from '../../utils/markdownComponents';
import { getSystemSetting } from '../../api/settings';
import OpenAiLogo from '../../img/OpenAi.png';
import './index.css';

const { Text } = Typography;

/**
 * Global AI ChatBot Component
 * A floating chat window available on all pages using @ant-design/x components
 * Only visible when user is authenticated (has valid Authorization token)
 */
export const AIChatBot = () => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [currentStreamingContent, setCurrentStreamingContent] = useState('');
    const [currentStreamingId, setCurrentStreamingId] = useState(null);

    // 模型选择状态
    const [modelList, setModelList] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');

    // Drawer width state with localStorage persistence
    const [drawerWidth, setDrawerWidth] = useState(() => {
        const saved = localStorage.getItem('ai-chatbot-drawer-width');
        if (saved) {
            try {
                const width = parseInt(saved, 10);
                return Math.max(300, Math.min(1200, width));
            } catch {
                return 480;
            }
        }
        return 480;
    });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartWidth, setResizeStartWidth] = useState(0);

    // Draggable position state with localStorage persistence
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('ai-chatbot-position');
        if (saved) {
            try {
                const pos = JSON.parse(saved);
                if (pos.right !== undefined && pos.bottom !== undefined) {
                    return {
                        left: window.innerWidth - pos.right - 56,
                        top: window.innerHeight - pos.bottom - 56
                    };
                }
                return pos;
            } catch {
                return { left: window.innerWidth - 24 - 56, top: window.innerHeight - 24 - 56 };
            }
        }
        return { left: window.innerWidth - 24 - 56, top: window.innerHeight - 24 - 56 };
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [hasMoved, setHasMoved] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Streaming LLM hook
    const {
        content,
        isLoading,
        error,
        stream,
        reset,
        cancel,
    } = useStreamLLM({
        onError: (err) => {
            message.error('AI 请求失败：' + err.message);
        }
    });

    // Refs for auto-scrolling
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    useAutoScroll(messagesEndRef, messagesContainerRef, [messages, currentStreamingContent]);

    // Update streaming content when content changes
    useEffect(() => {
        if (content && currentStreamingId !== null) {
            setCurrentStreamingContent(content);
        }
    }, [content, currentStreamingId]);

    // Show welcome message when chat opens
    useEffect(() => {
        if (open && messages.length === 0) {
            const welcomeMsgId = Date.now();
            setMessages([{
                id: welcomeMsgId,
                role: 'assistant',
                content: '你好，我是 AlertHub AI 智能助手，有什么可以帮助你的？',
                timestamp: new Date(),
            }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Load available models - 在 Drawer 打开时重新加载
    useEffect(() => {
        if (!open) return;

        const loadModels = async () => {
            try {
                const res = await getSystemSetting();
                const aiConfig = res.data?.aiConfig || {};
                let providers = aiConfig.providers || {};

                console.log('AIChatBot - 加载模型配置:', { aiConfig, providers });

                // 数据兼容：如果 providers 为空或 null，尝试从旧字段构建
                if (!providers || Object.keys(providers).length === 0) {
                    // 检查是否存在旧的配置字段
                    if (aiConfig.provider && aiConfig.url) {
                        console.log('AIChatBot - 检测到旧数据格式，进行兼容处理');
                        // 从旧字段构建临时的 providers 结构
                        providers = {
                            [aiConfig.provider]: {
                                url: aiConfig.url,
                                appKey: aiConfig.appKey,
                                // 如果旧配置有 model 字段，将其作为该 provider 的模型列表
                                models: aiConfig.model ? [aiConfig.model] : []
                            }
                        };
                        console.log('AIChatBot - 兼容后的 providers:', providers);
                    }
                }

                // 从所有 Provider 中收集模型
                const allModels = [];
                Object.values(providers).forEach(provider => {
                    if (provider.models && Array.isArray(provider.models)) {
                        allModels.push(...provider.models);
                    }
                });

                console.log('AIChatBot - 收集到的模型:', allModels);

                // 去重并转换为列表格式
                const uniqueModels = [...new Set(allModels)];
                const list = uniqueModels.map(model => ({
                    label: model,
                    value: model
                }));

                console.log('AIChatBot - 最终模型列表:', list);

                setModelList(list);

                // 默认选择第一个模型
                if (list.length > 0 && !selectedModel) {
                    setSelectedModel(list[0].value);
                }

                // 如果没有模型，提示用户
                if (list.length === 0) {
                    console.warn('AIChatBot - 未找到任何模型配置，请在设置页面配置 Provider');
                    message.warning('未找到可用模型，请先在设置页面配置 AI Provider');
                }
            } catch (error) {
                console.error('AIChatBot - 加载模型失败:', error);
                message.error('加载模型列表失败：' + error.message);
            }
        };

        loadModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    /**
     * Send message handler
     */
    const handleSend = useCallback(async (text) => {
        const userMessage = text?.trim() || inputValue.trim();
        if (!userMessage || isLoading) {
            return;
        }

        // 检查是否选择了模型
        if (!selectedModel) {
            message.error('请先选择模型');
            return;
        }

        setInputValue('');

        const userMsgId = Date.now();
        setMessages(prev => [...prev, {
            id: userMsgId,
            role: 'user',
            content: userMessage,
            timestamp: new Date(),
        }]);

        const aiMsgId = Date.now() + 1;
        setMessages(prev => [...prev, {
            id: aiMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
        }]);

        setCurrentStreamingId(aiMsgId);
        setCurrentStreamingContent('');
        reset();

        try {
            // 构建请求参数，包含模型
            const requestParams = {
                content: userMessage,
                prompt: '{{ Content }}',
                model: selectedModel
            };

            await stream(
                requestParams,
                undefined,
                (finalContent) => {
                    setMessages(prev => prev.map(msg =>
                        msg.id === aiMsgId
                            ? { ...msg, content: finalContent }
                            : msg
                    ));
                    setCurrentStreamingId(null);
                    setCurrentStreamingContent('');
                    reset();
                }
            );
        } catch (err) {
            setMessages(prev => prev.map(msg =>
                msg.id === aiMsgId
                    ? { ...msg, content: '抱歉，发生了错误：' + (err.message || '未知错误') }
                    : msg
            ));
            setCurrentStreamingId(null);
            setCurrentStreamingContent('');
            reset();
        }
    }, [inputValue, isLoading, selectedModel, stream, reset]);

    /**
     * Stop generation handler
     */
    const handleStop = useCallback(() => {
        cancel();
        if (currentStreamingId !== null) {
            setMessages(prev => prev.map(msg =>
                msg.id === currentStreamingId
                    ? { ...msg, content: currentStreamingContent || '生成已停止' }
                    : msg
            ));
            setCurrentStreamingId(null);
            setCurrentStreamingContent('');
        }
    }, [cancel, currentStreamingId, currentStreamingContent]);

    /**
     * Clear conversation handler
     */
    const handleClear = useCallback(() => {
        setMessages([]);
        setCurrentStreamingContent('');
        setCurrentStreamingId(null);
        reset();
    }, [reset]);

    /**
     * Drag start handler for floating button
     */
    const handleMouseDown = (e) => {
        if (e.button === 0) {
            setIsDragging(true);
            setHasMoved(false);
            setDragStart({ x: e.clientX, y: e.clientY });
            dragOffsetRef.current = { x: 0, y: 0 };
            setDragOffset({ x: 0, y: 0 });
            e.preventDefault();
            e.stopPropagation();
        }
    };

    // Drag move and end handlers
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;

            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                setHasMoved(true);
            }

            dragOffsetRef.current = { x: deltaX, y: deltaY };
            setDragOffset({ x: deltaX, y: deltaY });
        };

        const handleMouseUp = () => {
            if (!isDragging) return;

            const newLeft = position.left + dragOffsetRef.current.x;
            const newTop = position.top + dragOffsetRef.current.y;

            const buttonSize = 56;
            const maxLeft = window.innerWidth - buttonSize;
            const maxTop = window.innerHeight - buttonSize;

            const finalLeft = Math.max(0, Math.min(maxLeft, newLeft));
            const finalTop = Math.max(0, Math.min(maxTop, newTop));

            const newPosition = { left: finalLeft, top: finalTop };
            setPosition(newPosition);
            localStorage.setItem('ai-chatbot-position', JSON.stringify(newPosition));

            setIsDragging(false);
            dragOffsetRef.current = { x: 0, y: 0 };
            setDragOffset({ x: 0, y: 0 });
            setHasMoved(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, position]);

    /**
     * Drawer resize start handler
     */
    const handleResizeStart = (e) => {
        if (e.button === 0) {
            setIsResizing(true);
            setResizeStartX(e.clientX);
            setResizeStartWidth(drawerWidth);
            e.preventDefault();
            e.stopPropagation();
        }
    };

    // Drawer resize handlers
    useEffect(() => {
        const handleResizeMove = (e) => {
            if (!isResizing) return;

            const deltaX = resizeStartX - e.clientX;
            const newWidth = resizeStartWidth + deltaX;

            const minWidth = 300;
            const maxWidth = Math.min(1200, window.innerWidth * 0.9);
            const finalWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

            setDrawerWidth(finalWidth);
        };

        const handleResizeEnd = () => {
            if (!isResizing) return;
            localStorage.setItem('ai-chatbot-drawer-width', drawerWidth.toString());
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [isResizing, resizeStartX, resizeStartWidth, drawerWidth]);

    // Use shared markdown renderer hook
    const renderMarkdown = useMarkdownRenderer();

    /**
     * Role configuration for Bubble.List
     * Defines default props for 'ai' and 'user' roles
     */
    const roles = useMemo(() => ({
        ai: {
            placement: 'start',
            avatar: <img src={OpenAiLogo} alt="AI" style={{ width: 32, height: 32, borderRadius: '50%' }} />,
            variant: 'borderless',
            classNames: {
                content: 'ai-chatbot-ai-bubble'
            },
            contentRender: renderMarkdown,
        },
        user: {
            placement: 'end',
            variant: 'filled',
            classNames: {
                content: 'ai-chatbot-user-bubble'
            },
        },
    }), [renderMarkdown]);

    /**
     * Convert messages to Bubble.List format
     * Uses role-based configuration for cleaner code
     */
    const bubbleItems = messages.map((msg) => {
        const isCurrentStreaming = msg.id === currentStreamingId;
        const displayContent = isCurrentStreaming && currentStreamingContent
            ? currentStreamingContent
            : msg.content;

        return {
            key: msg.id,
            role: msg.role === 'assistant' ? 'ai' : 'user',
            content: displayContent,
            loading: isCurrentStreaming && isLoading && !currentStreamingContent,
            status: isCurrentStreaming && isLoading ? 'loading' : 'done',
            // Explicitly add contentRender for AI messages to ensure it's applied
            ...(msg.role === 'assistant' ? { contentRender: renderMarkdown } : {}),
        };
    });

    // Authentication check: only render AI ChatBot when user is logged in
    // This check is placed after all hooks to comply with React Hooks rules
    const isAuthenticated = !!localStorage.getItem('Authorization');
    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            {/* Floating Button - Draggable */}
            <FloatButton
                icon={<img src={OpenAiLogo} alt="AI" />}
                style={{
                    left: position.left + dragOffset.x,
                    top: position.top + dragOffset.y,
                    right: 'auto',
                    bottom: 'auto',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    transition: isDragging ? 'none' : 'all 0.3s ease',
                    position: 'fixed',
                }}
                onMouseDown={handleMouseDown}
                onClick={(e) => {
                    if (hasMoved) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    setOpen(true);
                }}
                tooltip="AI 助手（可拖动）"
            />

            {/* Chat Drawer */}
            <Drawer
                title={
                    <div style={{ width: '100%' }}>
                        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Space>
                                <Avatar size={32} src={OpenAiLogo} />
                                <Text strong>AI 助手</Text>
                            </Space>
                        </Space>
                        <Select
                            value={selectedModel}
                            onChange={setSelectedModel}
                            style={{ width: '100%' }}
                            size="small"
                            placeholder="选择模型"
                            disabled={isLoading}
                            options={modelList}
                        />
                    </div>
                }
                placement="right"
                width={drawerWidth}
                open={open}
                onClose={() => setOpen(false)}
                closable={true}
                mask={false}
                styles={{
                    body: {
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        position: 'relative',
                    }
                }}
            >
                {/* Resize Handle */}
                {open && (
                    <div
                        className="ai-chatbot-resize-handle"
                        onMouseDown={handleResizeStart}
                        style={{
                            cursor: isResizing ? 'col-resize' : 'ew-resize',
                        }}
                    />
                )}

                <div className="ai-chatbot-container">
                    {/* Messages Area using Bubble.List */}
                    <div className="ai-chatbot-messages scrollbar-thin" ref={messagesContainerRef}>
                        <Bubble.List
                            items={bubbleItems}
                            role={roles}
                            className="ai-chatbot-bubble-list"
                        />

                        {/* Error Display */}
                        {error && (
                            <div className="ai-chatbot-error">
                                <Text type="danger">{error}</Text>
                            </div>
                        )}

                        {/* Scroll Anchor */}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area using Sender */}
                    <div className="ai-chatbot-input-area">
                        {messages.length > 0 && !isLoading && (
                            <div className="ai-chatbot-clear-wrapper">
                                <span
                                    className="ai-chatbot-clear-btn"
                                    onClick={handleClear}
                                >
                                    清空对话
                                </span>
                            </div>
                        )}
                        <Sender
                            value={inputValue}
                            onChange={setInputValue}
                            onSubmit={handleSend}
                            placeholder="输入你的问题..."
                            loading={isLoading}
                            onCancel={handleStop}
                            allowSpeech={false}
                        />
                    </div>
                </div>
            </Drawer>
        </>
    );
};

export default AIChatBot;
"use client"

import React from 'react';
import { Result, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

/**
 * 错误边界组件
 * 用于捕获子组件树中的 JavaScript 错误，记录这些错误，并显示降级 UI
 * 而不是让整个应用崩溃
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    /**
     * 当子组件抛出错误时被调用
     * 用于更新 state，使下一次渲染能够显示降级 UI
     */
    static getDerivedStateFromError(error) {
        // 更新 state 使下一次渲染能够显示降级 UI
        return { hasError: true };
    }

    /**
     * 在错误被抛出后调用
     * 用于记录错误信息
     */
    componentDidCatch(error, errorInfo) {
        // 记录错误到控制台（生产环境可以发送到错误监控服务）
        console.error('错误边界捕获到错误:', error, errorInfo);
        
        this.setState({
            error,
            errorInfo,
        });

        // 这里可以将错误信息发送到错误监控服务
        // 例如：Sentry, LogRocket 等
    }

    /**
     * 重置错误状态
     */
    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    /**
     * 返回首页
     */
    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // 自定义降级 UI
            const isPermissionError = 
                this.state.error?.message?.includes('Cannot read properties of undefined') ||
                this.state.error?.message?.includes('length') ||
                this.state.error?.message?.includes('permission') ||
                this.state.error?.message?.includes('权限');

            return (
                <div
                    style={{
                        height: '100vh',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: '#f0f2f5',
                        padding: '24px',
                    }}
                >
                    <Result
                        status="error"
                        title={isPermissionError ? '权限不足' : '页面加载出错'}
                        subTitle={
                            isPermissionError
                                ? '您没有权限访问此页面或数据，请联系管理员获取相应权限。'
                                : '页面渲染时发生了错误，请尝试刷新页面或联系技术支持。'
                        }
                        extra={[
                            <Button
                                type="primary"
                                key="reload"
                                icon={<ReloadOutlined />}
                                onClick={this.handleReset}
                            >
                                重试
                            </Button>,
                            <Button key="home" onClick={this.handleGoHome}>
                                返回首页
                            </Button>,
                        ]}
                    >
                        {/* 开发环境显示详细错误信息 */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div
                                style={{
                                    marginTop: '24px',
                                    padding: '16px',
                                    background: '#fff',
                                    borderRadius: '4px',
                                    maxHeight: '300px',
                                    overflow: 'auto',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                                    错误信息:
                                </div>
                                <div style={{ color: '#ff4d4f', fontSize: '12px', fontFamily: 'monospace' }}>
                                    {this.state.error.toString()}
                                </div>
                                {this.state.errorInfo && (
                                    <>
                                        <div style={{ marginTop: '16px', marginBottom: '8px', fontWeight: 'bold' }}>
                                            错误堆栈:
                                        </div>
                                        <pre
                                            style={{
                                                color: '#666',
                                                fontSize: '11px',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </>
                                )}
                            </div>
                        )}
                    </Result>
                </div>
            );
        }

        // 正常情况下渲染子组件
        return this.props.children;
    }
}

export default ErrorBoundary;


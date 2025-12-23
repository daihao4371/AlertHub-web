"use client"

import React, { useState, useEffect } from 'react';
import { Result, Button, Spin } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';

/**
 * 权限守卫组件
 * 用于统一处理权限检查，当没有权限时显示友好的提示而不是报错
 * 
 * @param {React.ReactNode} children - 子组件
 * @param {Function} checkPermission - 权限检查函数，返回 Promise<boolean>
 * @param {string} permissionName - 权限名称，用于显示提示信息
 * @param {React.ReactNode} fallback - 自定义无权限时的 UI（可选）
 * @param {boolean} showLoading - 是否显示加载状态（默认 true）
 */
export const PermissionGuard = ({
    children,
    checkPermission,
    permissionName = '此功能',
    fallback = null,
    showLoading = true,
}) => {
    const [hasPermission, setHasPermission] = useState(null); // null: 检查中, true: 有权限, false: 无权限
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const verifyPermission = async () => {
            if (!checkPermission) {
                // 如果没有提供检查函数，默认允许访问
                if (isMounted) {
                    setHasPermission(true);
                    setLoading(false);
                }
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // 执行权限检查
                const result = await checkPermission();
                
                if (isMounted) {
                    setHasPermission(result === true || result === undefined);
                    setLoading(false);
                }
            } catch (err) {
                console.error('权限检查失败:', err);
                
                // 如果是 403 错误，视为无权限
                const is403 = err?.response?.status === 403 || err?.code === 403;
                
                if (isMounted) {
                    setHasPermission(false);
                    setError(err);
                    setLoading(false);
                }
            }
        };

        verifyPermission();

        return () => {
            isMounted = false;
        };
    }, [checkPermission]);

    // 加载中状态
    if (loading && showLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px',
                }}
            >
                <Spin size="large" tip="正在检查权限..." />
            </div>
        );
    }

    // 无权限状态
    if (hasPermission === false) {
        // 如果提供了自定义 fallback，使用它
        if (fallback) {
            return fallback;
        }

        // 默认无权限提示
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px',
                    padding: '24px',
                }}
            >
                <Result
                    icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                    status="warning"
                    title="权限不足"
                    subTitle={`您没有权限访问 ${permissionName}，请联系管理员获取相应权限。`}
                    extra={[
                        <Button
                            type="primary"
                            key="reload"
                            icon={<ReloadOutlined />}
                            onClick={() => window.location.reload()}
                        >
                            刷新页面
                        </Button>,
                        <Button
                            key="back"
                            onClick={() => window.history.back()}
                        >
                            返回上一页
                        </Button>,
                    ]}
                />
            </div>
        );
    }

    // 有权限，渲染子组件
    if (hasPermission === true) {
        return <>{children}</>;
    }

    // 默认情况（不应该到达这里）
    return null;
};

/**
 * 高阶组件：为组件添加权限检查
 * 
 * @param {React.Component} Component - 要包装的组件
 * @param {Function} checkPermission - 权限检查函数
 * @param {Object} options - 配置选项
 * @returns {React.Component} 包装后的组件
 * 
 * @example
 * const ProtectedHome = withPermission(Home, async () => {
 *   const res = await checkHomePermission();
 *   return res.code === 200;
 * }, { permissionName: '首页' });
 */
export const withPermission = (Component, checkPermission, options = {}) => {
    const { permissionName = '此功能', fallback = null, showLoading = true } = options;

    return function PermissionProtectedComponent(props) {
        return (
            <PermissionGuard
                checkPermission={checkPermission}
                permissionName={permissionName}
                fallback={fallback}
                showLoading={showLoading}
            >
                <Component {...props} />
            </PermissionGuard>
        );
    };
};

export default PermissionGuard;


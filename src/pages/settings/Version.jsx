import React, { useState, useEffect } from 'react';
import { Typography } from 'antd';
import { getSystemSetting } from "../../api/settings";

export const VersionSettings = () => {
    const [version, setVersion] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVersion();
    }, []);

    // 加载系统版本
    const loadVersion = async () => {
        setLoading(true);
        try {
            const res = await getSystemSetting();
            
            // 检查响应数据结构
            if (res && res.data) {
                // 获取版本号，如果为空字符串或未定义，则使用默认值
                const appVersion = res.data.appVersion;
                
                // 如果版本存在且不为空字符串，则使用它
                if (appVersion && appVersion.trim() !== '') {
                    setVersion(appVersion.trim());
                } else {
                    // 如果版本未设置，显示开发版本标识
                    setVersion('开发版本 (未设置版本号)');
                }
            } else {
                // 响应数据异常
                setVersion('开发版本 (无法获取版本信息)');
            }
        } catch (error) {
            console.error("Failed to load version:", error);
            setVersion('开发版本 (加载失败)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Typography.Title level={4}>系统版本</Typography.Title>
            <div style={{
                padding: '16px 24px',
                background: '#f5f5f5',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '16px',
                marginTop: '16px',
                minHeight: '24px'
            }}>
                {loading ? '加载中...' : version}
            </div>
        </>
    );
};


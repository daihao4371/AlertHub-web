import React from 'react';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Helmet } from 'react-helmet';
import routes from './routes';
import { useRoutes } from 'react-router-dom';
import './index.css'
import { AppContextProvider } from './context/RuleContext';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

// 全局配置 dayjs 使用中文 locale
dayjs.locale('zh-cn');

export default function App() {
    const element = useRoutes(routes);
    const title = "AlertHub";

    return (
        <ErrorBoundary>
            <AppContextProvider>
                <ConfigProvider locale={zhCN} theme={{ algorithm: theme.defaultAlgorithm }}>
                    <AntdApp>
                        <Helmet>
                            <title>{title}</title>
                        </Helmet>
                        {element}
                        <ToastProvider />
                    </AntdApp>
                </ConfigProvider>
            </AppContextProvider>
        </ErrorBoundary>
    );
}
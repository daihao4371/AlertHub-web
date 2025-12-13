import React from 'react';
import { Empty, Button } from 'antd';
import { BarChartOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';

export const QueryResults = ({ 
    results, 
    loading, 
    error, 
    onRefresh, 
    onExport 
}) => {
    // Render error state
    if (error) {
        return (
            <div className="query-results">
                <div className="query-results__header">
                    <h4 className="query-results__title">查询结果</h4>
                    <div className="query-results__actions">
                        <Button 
                            size="small" 
                            icon={<ReloadOutlined />} 
                            onClick={onRefresh}
                        >
                            重试
                        </Button>
                    </div>
                </div>
                <div className="error-message">
                    <div className="error-message__title">查询失败</div>
                    <div className="error-message__text">{error}</div>
                </div>
            </div>
        );
    }

    // Render empty state
    if (!results || results.length === 0) {
        return (
            <div className="query-results">
                <div className="query-results__header">
                    <h4 className="query-results__title">查询结果</h4>
                </div>
                <div className="query-results__empty">
                    <BarChartOutlined className="query-results__empty-icon" />
                    <div className="query-results__empty-text">
                        暂无数据展示
                    </div>
                    <div className="query-results__empty-hint">
                        请配置标签过滤器并执行查询以查看结果
                    </div>
                </div>
            </div>
        );
    }

    // Render results
    return (
        <div className="query-results">
            <div className="query-results__header">
                <h4 className="query-results__title">
                    查询结果 ({results.length} 个时序)
                </h4>
                <div className="query-results__actions">
                    <Button 
                        size="small" 
                        icon={<ReloadOutlined />} 
                        onClick={onRefresh}
                        loading={loading}
                    >
                        刷新
                    </Button>
                    <Button 
                        size="small" 
                        icon={<DownloadOutlined />} 
                        onClick={onExport}
                        disabled={loading}
                    >
                        导出
                    </Button>
                </div>
            </div>
            <div className="query-results__content">
                {/* Results will be rendered here - charts, tables, etc. */}
                <div style={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#8c8c8c'
                }}>
                    图表可视化功能即将实现
                </div>
            </div>
        </div>
    );
};
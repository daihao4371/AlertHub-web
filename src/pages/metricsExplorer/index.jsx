import React, { useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { Select, Button, Spin, Empty, Input } from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    DatabaseOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useMetricsExplorer } from './components/useMetricsExplorer';
import './index.css';

const { Option } = Select;
const { Search } = Input;

/**
 * 格式化大数字为易读格式
 * @param {number} value - 要格式化的数值
 * @param {boolean} isBytes - 是否为字节数（使用 B, KB, MB, GB, TB）
 * @returns {string} 格式化后的字符串
 */
const formatLargeNumber = (value, isBytes = false) => {
    if (value === 0) return '0';
    if (isNaN(value) || !isFinite(value)) return String(value);
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (isBytes) {
        // 字节单位换算（1024 进制）
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        let unitIndex = 0;
        let size = absValue;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        // 根据大小决定小数位数
        let decimals = 2;
        if (size >= 100) decimals = 1;
        if (size >= 1000) decimals = 0;
        
        return `${sign}${size.toFixed(decimals)} ${units[unitIndex]}`;
    } else {
        // 通用数字单位换算（1000 进制）
        const units = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
        let unitIndex = 0;
        let num = absValue;
        
        while (num >= 1000 && unitIndex < units.length - 1) {
            num /= 1000;
            unitIndex++;
        }
        
        // 根据大小决定小数位数
        let decimals = 2;
        if (num >= 100) decimals = 1;
        if (num >= 1000) decimals = 0;
        
        // 如果单位为空，直接返回数字（保留适当小数位）
        if (unitIndex === 0) {
            if (absValue < 1) {
                return `${sign}${num.toFixed(4)}`;
            } else if (absValue < 100) {
                return `${sign}${num.toFixed(2)}`;
            } else {
                return `${sign}${Math.round(num)}`;
            }
        }
        
        return `${sign}${num.toFixed(decimals)}${units[unitIndex]}`;
    }
};

/**
 * 判断指标名称是否表示字节数
 * @param {string} metricName - 指标名称
 * @returns {boolean}
 */
const isBytesMetric = (metricName) => {
    if (!metricName) return false;
    const bytesKeywords = ['bytes', 'byte', 'size', 'memory', 'mem'];
    const lowerName = metricName.toLowerCase();
    return bytesKeywords.some(keyword => lowerName.includes(keyword));
};

/**
 * 单个指标图表组件
 * 负责渲染单个指标的时序数据图表
 * 使用 React.memo 优化性能，避免不必要的重新渲染
 */
const MetricChart = memo(({ 
    metricName, 
    data, 
    loading, 
    error,
    onVisible 
}) => {
    const chartRef = useRef(null);
    const observerRef = useRef(null);

    // 使用 Intersection Observer 实现懒加载
    useEffect(() => {
        if (!onVisible) return;

        const element = chartRef.current?.ele;
        if (!element) {
            // 如果元素还未准备好，延迟重试
            const timer = setTimeout(() => {
                const retryElement = chartRef.current?.ele;
                if (retryElement && observerRef.current) {
                    observerRef.current.observe(retryElement);
                }
            }, 100);
            return () => clearTimeout(timer);
        }

        // 检查元素是否已经在可视区域（初始渲染时可能已经在可视区域）
        const rect = element.getBoundingClientRect();
        const isInViewport = (
            rect.top >= -100 && 
            rect.top <= window.innerHeight + 100 &&
            rect.left >= 0 && 
            rect.left <= window.innerWidth
        );

        // 如果已经在可视区域，立即触发加载
        if (isInViewport) {
            onVisible();
            return;
        }

        // 否则使用 Intersection Observer 监听
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        onVisible();
                        // 加载后取消观察
                        if (observerRef.current && element) {
                            observerRef.current.unobserve(element);
                        }
                    }
                });
            },
            {
                rootMargin: '200px', // 提前200px开始加载，确保更早触发
                threshold: 0.01 // 降低阈值，更容易触发
            }
        );

        observerRef.current.observe(element);

        return () => {
            if (observerRef.current && element) {
                observerRef.current.unobserve(element);
            }
        };
    }, [onVisible]);

    // 构建 ECharts 配置
    const chartOption = useMemo(() => {
        if (!data || data.length === 0) {
            return null;
        }

        // 处理时间序列数据
        const series = data.map((seriesItem, index) => {
            const { metric, values } = seriesItem;
            
            // 生成系列名称（优先使用 instance、job 等标签）
            let seriesName = metricName;
            const preferredLabels = ['instance', 'job', 'node', 'pod', 'container'];
            for (const label of preferredLabels) {
                if (metric[label]) {
                    seriesName = `${metricName} (${metric[label]})`;
                    break;
                }
            }

            // 转换数据格式：[timestamp, value] -> [时间戳(ms), 数值]
            const chartData = values.map(([timestamp, value]) => [
                timestamp * 1000, // 转换为毫秒
                parseFloat(value) || 0
            ]);

            return {
                name: seriesName,
                type: 'line',
                smooth: true,
                showSymbol: false, // 数据点多时不显示标记点
                data: chartData,
                lineStyle: {
                    width: 2
                },
                areaStyle: index === 0 ? {
                    opacity: 0.1
                } : null,
                emphasis: {
                    focus: 'series'
                }
            };
        });

        // 颜色配置（保持与当前页面风格一致）
        const colors = [
            '#1890ff', '#52c41a', '#faad14', '#f5222d',
            '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'
        ];

        return {
            color: colors,
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '10%',
                containLabel: true
            },
            tooltip: {
                trigger: 'axis',
                triggerOn: 'mousemove', // 鼠标移动时触发
                axisPointer: {
                    type: 'line',
                    lineStyle: {
                        type: 'dashed',
                        width: 1,
                        color: '#999'
                    },
                    label: {
                        show: false
                    }
                },
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                borderColor: '#d9d9d9',
                borderWidth: 1,
                padding: [8, 12],
                textStyle: {
                    color: '#333',
                    fontSize: 12,
                    lineHeight: 20
                },
                extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.15);', // 添加阴影效果
                confine: false, // 允许 tooltip 超出图表区域
                appendToBody: true, // 将 tooltip 添加到 body，避免被容器裁剪
                formatter: (params) => {
                    if (!params || params.length === 0) return '';
                    
                    // 格式化时间显示
                    const timestamp = params[0].value[0];
                    const date = new Date(timestamp);
                    const time = date.toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    
                    // 判断是否使用字节单位
                    const useBytes = isBytesMetric(metricName);
                    
                    let result = `<div style="margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #333;">${time}</div>`;
                    
                    // 显示所有系列的数据
                    params.forEach((param) => {
                        let numValue;
                        if (typeof param.value === 'number') {
                            numValue = param.value;
                        } else if (Array.isArray(param.value) && param.value.length >= 2) {
                            numValue = parseFloat(param.value[1]);
                        } else {
                            numValue = 0;
                        }
                        
                        // 使用格式化函数显示数值
                        const displayValue = formatLargeNumber(numValue, useBytes);
                        
                        result += `<div style="margin: 3px 0; display: flex; align-items: center;">
                            <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; border-radius: 50%; margin-right: 8px; flex-shrink: 0;"></span>
                            <span style="flex: 1; min-width: 0;">${param.seriesName || 'Series'}</span>
                            <strong style="margin-left: 8px; color: #333;">${displayValue}</strong>
                        </div>`;
                    });
                    
                    return result;
                }
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLine: {
                    lineStyle: {
                        color: '#d9d9d9'
                    }
                },
                axisLabel: {
                    color: '#8c8c8c',
                    fontSize: 11,
                    formatter: (value) => {
                        const date = new Date(value);
                        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: '#f0f0f0',
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'value',
                axisLine: {
                    lineStyle: {
                        color: '#d9d9d9'
                    }
                },
                axisLabel: {
                    color: '#8c8c8c',
                    fontSize: 11,
                    formatter: (value) => {
                        // 判断是否使用字节单位
                        const useBytes = isBytesMetric(metricName);
                        return formatLargeNumber(value, useBytes);
                    }
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: '#f0f0f0',
                        type: 'dashed'
                    }
                }
            },
            series: series,
            animation: false, // 关闭动画提升性能
            progressive: 1000, // 渐进式渲染阈值
            progressiveThreshold: 3000 // 大数据集阈值
        };
    }, [data, metricName]);

    if (loading) {
        return (
            <div className="metric-chart">
                <div className="metric-chart__header">
                    <span className="metric-chart__title">{metricName}</span>
                </div>
                <div className="metric-chart__content metric-chart__loading">
                    <Spin size="small" />
                    <span>加载中...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="metric-chart">
                <div className="metric-chart__header">
                    <span className="metric-chart__title">{metricName}</span>
                </div>
                <div className="metric-chart__content metric-chart__error">
                    <Empty 
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<span style={{ fontSize: '12px', color: '#ff4d4f' }}>{error}</span>}
                    />
                </div>
            </div>
        );
    }

    if (!chartOption) {
        return (
            <div className="metric-chart">
                <div className="metric-chart__header">
                    <span className="metric-chart__title">{metricName}</span>
                </div>
                <div className="metric-chart__content">
                    <Empty 
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<span style={{ fontSize: '12px' }}>暂无数据</span>}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="metric-chart" ref={chartRef}>
            <div className="metric-chart__header">
                <span className="metric-chart__title" title={metricName}>
                    {metricName}
                </span>
            </div>
            <div className="metric-chart__content">
                <ReactECharts
                    option={chartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                />
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.metricName === nextProps.metricName &&
        prevProps.loading === nextProps.loading &&
        prevProps.error === nextProps.error &&
        prevProps.data === nextProps.data &&
        prevProps.onVisible === nextProps.onVisible
    );
});

/**
 * 指标搜索组件
 * 负责指标搜索的 UI 展示
 */
const MetricsSearch = ({ 
    searchKeyword, 
    loading, 
    disabled, 
    onSearchChange 
}) => {
    return (
        <div className="metrics-explorer__search-section">
            <div className="metrics-explorer__search-label">搜索指标</div>
            <Search
                placeholder="搜索指标"
                value={searchKeyword}
                onChange={(e) => onSearchChange(e.target.value)}
                onSearch={onSearchChange}
                allowClear
                loading={loading}
                disabled={disabled}
                className="metrics-explorer__search-input"
            />
        </div>
    );
};

/**
 * 指标浏览器主组件
 */
export const MetricsExplorer = () => {
    // 使用自定义 Hook 管理所有业务逻辑
    const {
        // 数据源相关
        datasources,
        selectedDatasource,
        datasourceLoading,
        handleDatasourceChange,
        
        // 标签相关
        labelRows,
        loadingKeys,
        loadingValues,
        addLabelRow,
        deleteLabelRow,
        handleKeyChange,
        handleValueChange,
        getAvailableKeysForRow,
        getValidLabels,
        
        // 时间范围
        timeRange,
        setTimeRange,
        
        // 指标搜索相关
        searchKeyword,
        loadingMetrics,
        handleSearchChange,
        
        // 图表数据相关
        chartData,
        querying,
        metricsToRender,
        handleLazyLoad,
        
        // 操作
        handleQuery,
        handleRefresh
    } = useMetricsExplorer();

    // 处理图表可见性变化（懒加载触发）
    const handleChartVisible = useCallback((metricName) => {
        handleLazyLoad(metricName);
    }, [handleLazyLoad]);

    return (
        <div className="metrics-explorer">
            {/* 统一的工具栏 - 扁平化布局 */}
            <div className="metrics-explorer__toolbar">
                {/* 数据源选择 */}
                <div className="metrics-explorer__toolbar-item">
                    <DatabaseOutlined />
                    <Select
                        placeholder="选择数据源"
                        value={selectedDatasource}
                        onChange={handleDatasourceChange}
                        loading={datasourceLoading}
                        style={{ width: 180 }}
                    >
                        {datasources.map(ds => (
                            <Option key={ds.id} value={ds.id}>
                                {ds.name}
                            </Option>
                        ))}
                    </Select>
                </div>

                {/* 标签行 */}
                {labelRows.map((row) => {
                    const availableKeysForRow = getAvailableKeysForRow(row.id);
                    const isLoadingValues = loadingValues.has(row.labelKey);

                    return (
                        <div key={row.id} className="metrics-explorer__toolbar-item metrics-explorer__label-row">
                            <Select
                                placeholder="选择标签键"
                                value={row.labelKey || undefined}
                                onChange={(value) => handleKeyChange(row.id, value)}
                                loading={loadingKeys}
                                disabled={!selectedDatasource || loadingKeys}
                                showSearch
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                style={{ width: 150 }}
                            >
                                {availableKeysForRow.map(key => (
                                    <Option key={key} value={key}>
                                        {key}
                                    </Option>
                                ))}
                            </Select>

                            <Select
                                placeholder={isLoadingValues ? "加载中..." : "选择标签值"}
                                value={row.labelValue || undefined}
                                onChange={(value) => handleValueChange(row.id, value)}
                                loading={isLoadingValues}
                                disabled={!row.labelKey || !selectedDatasource || isLoadingValues}
                                showSearch
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                style={{ width: 200 }}
                            >
                                {row.availableValues.map(value => (
                                    <Option key={value} value={value}>
                                        {value}
                                    </Option>
                                ))}
                            </Select>

                            <Button
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={() => deleteLabelRow(row.id)}
                                disabled={labelRows.length === 1}
                                size="small"
                                style={{ color: "#ff4d4f" }}
                            />
                        </div>
                    );
                })}

                {/* 操作按钮组 */}
                <div className="metrics-explorer__toolbar-item metrics-explorer__toolbar-actions">
                    <Button 
                        type="dashed" 
                        icon={<PlusOutlined />}
                        onClick={addLabelRow}
                        disabled={!selectedDatasource}
                        size="small"
                    >
                        Add label
                    </Button>
                    
                    <Select
                        placeholder="最近1小时"
                        value={timeRange}
                        onChange={setTimeRange}
                        style={{ width: 120 }}
                        size="small"
                    >
                        <Option value="300">最近5分钟</Option>
                        <Option value="900">最近15分钟</Option>
                        <Option value="1800">最近30分钟</Option>
                        <Option value="3600">最近1小时</Option>
                        <Option value="10800">最近3小时</Option>
                        <Option value="21600">最近6小时</Option>
                        <Option value="43200">最近12小时</Option>
                        <Option value="86400">最近24小时</Option>
                    </Select>
                    
                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        onClick={handleQuery}
                        disabled={!selectedDatasource || getValidLabels().length === 0}
                        size="small"
                    >
                        查询
                    </Button>
                    
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                        disabled={!selectedDatasource}
                        size="small"
                    />
                </div>
            </div>

            {/* 加载状态 */}
            {loadingKeys && (
                <div className="metrics-explorer__loading">
                    <Spin size="small" />
                    <span>正在从 Prometheus 加载标签键...</span>
                </div>
            )}

            {/* 指标搜索区域 */}
            <MetricsSearch
                searchKeyword={searchKeyword}
                loading={loadingMetrics}
                disabled={!selectedDatasource}
                onSearchChange={handleSearchChange}
            />

            {/* 查询结果区域 */}
            <div className="metrics-explorer__results">
                {metricsToRender.length === 0 ? (
                    <div className="metrics-explorer__results-placeholder">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div>
                                    <p>请输入搜索条件来查看指标图表</p>
                                    <p className="metrics-explorer__results-hint">
                                        搜索指标名称后，匹配的指标将自动渲染图表
                                    </p>
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <div className="metrics-explorer__charts-grid">
                        {metricsToRender.map((metricName) => {
                            const chartInfo = chartData.get(metricName);
                            return (
                                <div 
                                    key={metricName} 
                                    className="metrics-explorer__chart-wrapper"
                                    data-metric-name={metricName}
                                >
                                    <MetricChart
                                        metricName={metricName}
                                        data={chartInfo?.data || []}
                                        loading={chartInfo?.loading || false}
                                        error={chartInfo?.error || null}
                                        onVisible={() => handleChartVisible(metricName)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* 查询状态提示 */}
                {querying && metricsToRender.length > 0 && (
                    <div className="metrics-explorer__query-status">
                        <Spin size="small" />
                        <span>正在查询指标数据...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

import React from 'react';
import { Select, Button, Spin } from 'antd';
import {
    ArrowLeftOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    DatabaseOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import { useMetricsExplorer } from './components/useMetricsExplorer';
import { MetricsSearch } from './components/MetricsSearch';
import './index.css';

const { Option } = Select;

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
        
        // 操作
        handleQuery,
        handleRefresh
    } = useMetricsExplorer();

    return (
        <div className="metrics-explorer">
            {/* 标题栏 */}
            <div className="metrics-explorer__title-bar">
                <ArrowLeftOutlined className="metrics-explorer__back-icon" />
                <h2 className="metrics-explorer__title">指标浏览器</h2>
            </div>

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
                                                    style={{ 
                            backgroundColor: '#000000'
                        }}
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
                <div className="metrics-explorer__results-placeholder">
                    <p>请输入搜索条件或选择标签来查看指标图表</p>
                    <p className="metrics-explorer__results-hint">
                        默认不加载所有指标,以避免性能问题
                    </p>
                    </div>
                </div>
                        </div>
    );
};

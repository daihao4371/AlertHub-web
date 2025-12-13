import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Select, Button, message, Spin } from 'antd';
import {
    ArrowLeftOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    DatabaseOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import { getDatasourceList } from '../../api/datasource';
import { getPrometheusLabels, getPrometheusLabelValues } from '../../api/prometheus';
import './index.css';

const { Option } = Select;

export const MetricsExplorer = () => {
    // 数据源相关状态
    const [datasources, setDatasources] = useState([]);
    const [selectedDatasource, setSelectedDatasource] = useState(null);
    const [datasourceLoading, setDatasourceLoading] = useState(false);

    // 标签相关状态
    const [labelRows, setLabelRows] = useState([]);
    const [availableKeys, setAvailableKeys] = useState([]);
    const [loadingKeys, setLoadingKeys] = useState(false);
    const labelValuesCache = useRef(new Map());
    const [loadingValues, setLoadingValues] = useState(new Set());
    const debounceTimer = useRef(null);

    // 时间范围
    const [timeRange, setTimeRange] = useState('3600');

    // 加载数据源列表
    const loadDatasources = useCallback(async () => {
        setDatasourceLoading(true);
        try {
            const response = await getDatasourceList({});
            if (response?.data) {
                const prometheusDatasources = response.data.filter(
                    ds => ds.type === 'Prometheus' && ds.enabled
                );
                setDatasources(prometheusDatasources);
                
                if (prometheusDatasources.length > 0 && !selectedDatasource) {
                    setSelectedDatasource(prometheusDatasources[0].id);
                }
            }
        } catch (error) {
            message.error('加载数据源失败');
            console.error('加载数据源出错:', error);
        } finally {
            setDatasourceLoading(false);
        }
    }, [selectedDatasource]);

    // 加载标签键列表
    const loadAvailableKeys = useCallback(async () => {
        if (!selectedDatasource) return;

        setLoadingKeys(true);
        try {
            const response = await getPrometheusLabels(selectedDatasource);
            
            if (response?.data?.status === 'success' && response?.data?.data) {
                setAvailableKeys(response.data.data);
            } else if (response?.data && Array.isArray(response.data)) {
                setAvailableKeys(response.data);
                    } else {
                setAvailableKeys([]);
            }
        } catch (error) {
            message.error(`加载标签键失败: ${error.message}`);
            setAvailableKeys([]);
        } finally {
            setLoadingKeys(false);
        }
    }, [selectedDatasource]);

    // 更新标签行的可用值
    const updateLabelRowValues = useCallback((rowId, values) => {
        setLabelRows(prev => prev.map(row => 
            row.id === rowId 
                ? { ...row, availableValues: values, labelValue: '' }
                : row
        ));
    }, []);

    // 加载标签值
    const loadLabelValues = useCallback(async (labelKey, rowId) => {
        if (!selectedDatasource || !labelKey) return;

        const cacheKey = `${selectedDatasource}_${labelKey}`;
        if (labelValuesCache.current.has(cacheKey)) {
            const cachedValues = labelValuesCache.current.get(cacheKey);
            updateLabelRowValues(rowId, cachedValues);
            return;
        }

        setLoadingValues(prev => new Set([...prev, labelKey]));

        try {
            const response = await getPrometheusLabelValues(selectedDatasource, labelKey);
            
            let values = [];
            if (response?.data?.status === 'success' && response?.data?.data) {
                values = response.data.data;
            } else if (response?.data && Array.isArray(response.data)) {
                values = response.data;
            }

            labelValuesCache.current.set(cacheKey, values);
            updateLabelRowValues(rowId, values);
        } catch (error) {
            message.error(`加载标签 '${labelKey}' 的值失败: ${error.message}`);
            updateLabelRowValues(rowId, []);
        } finally {
            setLoadingValues(prev => {
                const newSet = new Set(prev);
                newSet.delete(labelKey);
                return newSet;
            });
        }
    }, [selectedDatasource, updateLabelRowValues]);

    // 添加标签行
    const addLabelRow = useCallback(() => {
        const newRow = {
            id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            labelKey: '',
            labelValue: '',
            availableValues: []
        };
        setLabelRows(prev => [...prev, newRow]);
    }, []);

    // 删除标签行
    const deleteLabelRow = useCallback((rowId) => {
        setLabelRows(prev => {
            const updated = prev.filter(row => row.id !== rowId);
            if (updated.length === 0) {
                return [{
                    id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    labelKey: '',
                    labelValue: '',
                    availableValues: []
                }];
            }
            return updated;
        });
    }, []);

    // 处理标签键变更
    const handleKeyChange = useCallback((rowId, selectedKey) => {
        setLabelRows(prev => prev.map(row => 
            row.id === rowId 
                ? { ...row, labelKey: selectedKey, labelValue: '', availableValues: [] }
                : row
        ));

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        
        debounceTimer.current = setTimeout(() => {
            if (selectedKey) {
                loadLabelValues(selectedKey, rowId);
            }
        }, 300);
    }, [loadLabelValues]);

    // 处理标签值变更
    const handleValueChange = useCallback((rowId, selectedValue) => {
        setLabelRows(prev => prev.map(row => 
            row.id === rowId 
                ? { ...row, labelValue: selectedValue }
                : row
        ));
    }, []);


    // 获取可用的标签键
    const getAvailableKeysForRow = useCallback((currentRowId) => {
        const usedKeys = labelRows
            .filter(row => row.id !== currentRowId && row.labelKey)
            .map(row => row.labelKey);
        
        const currentRow = labelRows.find(row => row.id === currentRowId);
        const currentKey = currentRow?.labelKey;

        return availableKeys.filter(key => 
            !usedKeys.includes(key) || key === currentKey
        );
    }, [availableKeys, labelRows]);

    // 获取有效的标签
    const getValidLabels = useCallback(() => {
        return labelRows
            .filter(row => row.labelKey && row.labelValue)
            .map(row => ({
                id: row.id,
                labelKey: row.labelKey,
                labelValue: row.labelValue
            }));
    }, [labelRows]);

    // 执行查询
    const handleQuery = useCallback(() => {
        const validLabels = getValidLabels();
        if (validLabels.length === 0) {
            message.warning('请至少配置一个标签过滤器');
            return;
        }
        
        console.log('执行查询，标签组合:', validLabels);
        message.info('查询功能开发中...');
    }, [getValidLabels]);

    // 刷新
    const handleRefresh = useCallback(() => {
        if (selectedDatasource) {
            loadAvailableKeys();
            labelValuesCache.current.clear();
        }
    }, [selectedDatasource, loadAvailableKeys]);

    // 初始化
    useEffect(() => {
        loadDatasources();
    }, [loadDatasources]);

    useEffect(() => {
        if (labelRows.length === 0) {
            addLabelRow();
        }
    }, [labelRows.length, addLabelRow]);
    
    useEffect(() => {
        if (selectedDatasource) {
            loadAvailableKeys();
        } else {
            setAvailableKeys([]);
        }
    }, [selectedDatasource, loadAvailableKeys]);

    // 处理数据源变更
    const handleDatasourceChange = useCallback((datasourceId) => {
        setSelectedDatasource(datasourceId);
        setLabelRows([{
            id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            labelKey: '',
            labelValue: '',
            availableValues: []
        }]);
        labelValuesCache.current.clear();
    }, []);

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

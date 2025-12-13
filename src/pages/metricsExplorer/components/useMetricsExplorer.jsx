import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import { getDatasourceList } from '../../../api/datasource';
import { getPrometheusLabels, getPrometheusLabelValues, getPrometheusMetrics } from '../../../api/prometheus';

/**
 * MetricsExplorer 业务逻辑 Hook
 * 管理数据源、标签、指标搜索等所有业务逻辑
 */
export const useMetricsExplorer = () => {
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

    // 指标搜索相关状态
    const [metricsList, setMetricsList] = useState([]);
    const [filteredMetrics, setFilteredMetrics] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [loadingMetrics, setLoadingMetrics] = useState(false);

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

    // 加载指标列表
    const loadMetrics = useCallback(async () => {
        if (!selectedDatasource) {
            setMetricsList([]);
            setFilteredMetrics([]);
            return;
        }

        setLoadingMetrics(true);
        try {
            const response = await getPrometheusMetrics(selectedDatasource);
            
            let metrics = [];
            if (response?.data?.status === 'success' && response?.data?.data) {
                metrics = response.data.data;
            } else if (response?.data && Array.isArray(response.data)) {
                metrics = response.data;
            }

            setMetricsList(metrics);
            setFilteredMetrics(metrics);
        } catch (error) {
            message.error(`加载指标列表失败: ${error.message}`);
            setMetricsList([]);
            setFilteredMetrics([]);
        } finally {
            setLoadingMetrics(false);
        }
    }, [selectedDatasource]);

    // 刷新
    const handleRefresh = useCallback(() => {
        if (selectedDatasource) {
            loadAvailableKeys();
            labelValuesCache.current.clear();
            loadMetrics();
        }
    }, [selectedDatasource, loadAvailableKeys, loadMetrics]);

    // 处理搜索关键词变化
    const handleSearchChange = useCallback((value) => {
        setSearchKeyword(value);
        
        if (!value.trim()) {
            setFilteredMetrics(metricsList);
            return;
        }

        const keyword = value.toLowerCase().trim();
        const filtered = metricsList.filter(metric => 
            metric.toLowerCase().includes(keyword)
        );
        setFilteredMetrics(filtered);
    }, [metricsList]);

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
        setSearchKeyword('');
        setMetricsList([]);
        setFilteredMetrics([]);
    }, []);

    // 初始化数据源
    useEffect(() => {
        loadDatasources();
    }, [loadDatasources]);

    // 初始化标签行
    useEffect(() => {
        if (labelRows.length === 0) {
            addLabelRow();
        }
    }, [labelRows.length, addLabelRow]);
    
    // 数据源变化时加载标签键和指标
    useEffect(() => {
        if (selectedDatasource) {
            loadAvailableKeys();
            loadMetrics();
        } else {
            setAvailableKeys([]);
            setMetricsList([]);
            setFilteredMetrics([]);
        }
    }, [selectedDatasource, loadAvailableKeys, loadMetrics]);

    return {
        // 数据源相关
        datasources,
        selectedDatasource,
        datasourceLoading,
        handleDatasourceChange,
        
        // 标签相关
        labelRows,
        availableKeys,
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
        filteredMetrics,
        loadingMetrics,
        handleSearchChange,
        
        // 操作
        handleQuery,
        handleRefresh
    };
};


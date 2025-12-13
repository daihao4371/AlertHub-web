import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { message } from 'antd';
import { getDatasourceList } from '../../../api/datasource';
import { getPrometheusLabels, getPrometheusLabelValues, getPrometheusMetrics } from '../../../api/prometheus';
import { queryRangePromMetrics } from '../../../api/other';

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
    const searchDebounceTimer = useRef(null);

    // 图表数据相关状态
    const [chartData, setChartData] = useState(new Map()); // Map<metricName, {data, loading, error, timestamp}>
    const [querying, setQuerying] = useState(false);
    const [queryQueue, setQueryQueue] = useState(new Set()); // 懒加载队列
    const queryCache = useRef(new Map()); // 查询缓存
    const abortControllers = useRef(new Map()); // 请求取消控制器

    // 渲染控制常量
    const INITIAL_RENDER_COUNT = 12; // 首次渲染数量
    const MAX_RENDER_COUNT = 50; // 最大渲染数量
    const CONCURRENT_QUERIES = 6; // 并发查询数量
    const CACHE_TTL = 2 * 60 * 1000; // 缓存有效期 2 分钟

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

    // 构建 PromQL 查询语句
    const buildPromQL = useCallback((metricName, labels = []) => {
        // 如果有标签过滤，构建标签选择器
        if (labels.length > 0) {
            const labelSelectors = labels.map(label => 
                `${label.labelKey}="${label.labelValue}"`
            ).join(',');
            return `${metricName}{${labelSelectors}}`;
        }
        return metricName;
    }, []);

    // 计算时间范围
    const getTimeRange = useCallback(() => {
        const seconds = parseInt(timeRange, 10);
        const end = Math.floor(Date.now() / 1000);
        const start = end - seconds;
        return { start, end };
    }, [timeRange]);

    // 查询单个指标数据
    const queryMetricData = useCallback(async (metricName) => {
        if (!selectedDatasource || !metricName) return;

        // 检查缓存
        const cacheKey = `${selectedDatasource}_${metricName}_${timeRange}`;
        const cached = queryCache.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setChartData(prev => {
                const newMap = new Map(prev);
                newMap.set(metricName, {
                    data: cached.data,
                    loading: false,
                    error: null,
                    timestamp: cached.timestamp
                });
                return newMap;
            });
            return;
        }

        // 设置加载状态
        setChartData(prev => {
            const newMap = new Map(prev);
            const existing = prev.get(metricName) || {};
            newMap.set(metricName, {
                ...existing,
                loading: true,
                error: null
            });
            return newMap;
        });

        // 取消之前的请求
        const existingController = abortControllers.current.get(metricName);
        if (existingController) {
            existingController.abort();
        }

        // 创建新的 AbortController
        const controller = new AbortController();
        abortControllers.current.set(metricName, controller);

        try {
            const { start, end } = getTimeRange();
            const validLabels = getValidLabels();
            const promQL = buildPromQL(metricName, validLabels);

            // 计算步长（根据时间范围自动计算，单位：秒）
            const step = Math.max(Math.floor((end - start) / 1000), 15); // 最少 15 秒

            // 后端期望的参数格式：
            // - datasourceIds: string
            // - query: string
            // - startTime: int64 (Unix 时间戳，秒)
            // - endTime: int64 (Unix 时间戳，秒)
            // - step: int64 (步长，秒)
            const requestParams = {
                datasourceIds: selectedDatasource,
                query: promQL,
                startTime: start,  // 修复：使用 startTime 而不是 start
                endTime: end,      // 修复：使用 endTime 而不是 end
                step: step         // 修复：使用数字而不是字符串 "15s"
            };
            
            const response = await queryRangePromMetrics(requestParams);

            // 检查请求是否被取消
            if (controller.signal.aborted) {
                return;
            }

            // 处理响应数据
            // 后端返回的是 Prometheus 标准格式：
            // {
            //   code: 200,
            //   data: [{
            //     status: "success",
            //     data: {
            //       resultType: "matrix",
            //       result: [{
            //         metric: {...},
            //         values: [[timestamp, value], ...]
            //       }]
            //     }
            //   }]
            // }
            let resultData = [];
            
            if (response?.data) {
                // 处理数组格式的响应（多个数据源）
                if (Array.isArray(response.data) && response.data.length > 0) {
                    // 取第一个数据源的结果
                    const firstResult = response.data[0];
                    
                    // 检查是否是 Prometheus 标准格式
                    if (firstResult?.data?.result && Array.isArray(firstResult.data.result)) {
                        // 直接使用 Prometheus 标准格式的数据
                        resultData = firstResult.data.result.map(item => ({
                            metric: item.metric || {},
                            values: item.values || [] // values 格式: [[timestamp(秒), value], ...]
                        }));
                    }
                    // 兼容扁平化格式（如果后端返回的是扁平化数据）
                    else if (firstResult?.data && Array.isArray(firstResult.data)) {
                        // 扁平化数据转换逻辑
                        const metricGroups = new Map();
                        
                        firstResult.data.forEach(item => {
                            const metric = item.Metric || item.metric || {};
                            let timestamp = item.Timestamp || item.timestamp || 0;
                            let value = item.Value !== undefined ? item.Value : (item.value !== undefined ? parseFloat(item.value) : 0);
                            
                            timestamp = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
                            value = typeof value === 'string' ? parseFloat(value) : value;
                            
                            if (!timestamp || isNaN(timestamp) || isNaN(value)) {
                                return;
                            }
                            
                            const metricKey = JSON.stringify(metric);
                            
                            if (!metricGroups.has(metricKey)) {
                                metricGroups.set(metricKey, {
                                    metric: metric,
                                    values: []
                                });
                            }
                            
                            metricGroups.get(metricKey).values.push([timestamp, value]);
                        });
                        
                        resultData = Array.from(metricGroups.values()).map(group => ({
                            metric: group.metric,
                            values: group.values.sort((a, b) => a[0] - b[0])
                        }));
                    }
                }
                // 处理单个数据源的响应（非数组格式）
                else if (response.data.data?.result && Array.isArray(response.data.data.result)) {
                    resultData = response.data.data.result.map(item => ({
                        metric: item.metric || {},
                        values: item.values || []
                    }));
                }
            }

            // 更新缓存
            queryCache.current.set(cacheKey, {
                data: resultData,
                timestamp: Date.now()
            });

            // 更新图表数据
            setChartData(prev => {
                const newMap = new Map(prev);
                newMap.set(metricName, {
                    data: resultData,
                    loading: false,
                    error: null,
                    timestamp: Date.now()
                });
                return newMap;
            });
        } catch (error) {
            // 忽略取消的请求
            if (error.name === 'AbortError' || controller.signal.aborted) {
                return;
            }

            setChartData(prev => {
                const newMap = new Map(prev);
                newMap.set(metricName, {
                    data: [],
                    loading: false,
                    error: error.message || '查询失败',
                    timestamp: Date.now()
                });
                return newMap;
            });
        } finally {
            abortControllers.current.delete(metricName);
        }
    }, [selectedDatasource, timeRange, getTimeRange, buildPromQL, getValidLabels, CACHE_TTL]);

    // 批量查询指标（并发控制）
    const queryBatch = useCallback(async (metrics) => {
        if (metrics.length === 0) return;

        setQuerying(true);
        const batchSize = CONCURRENT_QUERIES;

        try {
            for (let i = 0; i < metrics.length; i += batchSize) {
                const batch = metrics.slice(i, i + batchSize);
                await Promise.all(batch.map(metric => queryMetricData(metric)));
            }
        } finally {
            setQuerying(false);
        }
    }, [queryMetricData, CONCURRENT_QUERIES]);

    // 处理懒加载触发
    const handleLazyLoad = useCallback((metricName) => {
        // 如果数据已存在或正在加载，不需要再次查询
        const existingData = chartData.get(metricName);
        if (existingData && (existingData.data || existingData.loading)) {
            return;
        }
        
        // 如果指标在懒加载队列中，或者数据不存在，则触发查询
        if (queryQueue.has(metricName) || !chartData.has(metricName)) {
            queryMetricData(metricName);
            setQueryQueue(prev => {
                const newSet = new Set(prev);
                newSet.delete(metricName);
                return newSet;
            });
        }
    }, [queryQueue, chartData, queryMetricData]);

    // 处理搜索关键词变化（带防抖）
    const handleSearchChange = useCallback((value) => {
        setSearchKeyword(value);
        
        // 清除之前的防抖定时器
        if (searchDebounceTimer.current) {
            clearTimeout(searchDebounceTimer.current);
        }

        // 设置防抖
        searchDebounceTimer.current = setTimeout(() => {
        if (!value.trim()) {
            setFilteredMetrics(metricsList);
            return;
        }

        const keyword = value.toLowerCase().trim();
        const filtered = metricsList.filter(metric => 
            metric.toLowerCase().includes(keyword)
        );
        setFilteredMetrics(filtered);
        }, 300);
    }, [metricsList]);

    // 处理数据源变更
    const handleDatasourceChange = useCallback((datasourceId) => {
        // 取消所有进行中的请求
        abortControllers.current.forEach(controller => controller.abort());
        abortControllers.current.clear();

        setSelectedDatasource(datasourceId);
        setLabelRows([{
            id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            labelKey: '',
            labelValue: '',
            availableValues: []
        }]);
        labelValuesCache.current.clear();
        queryCache.current.clear();
        setSearchKeyword('');
        setMetricsList([]);
        setFilteredMetrics([]);
        setChartData(new Map());
        setQueryQueue(new Set());
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

    // 自动渲染：当 filteredMetrics 变化时自动查询
    useEffect(() => {
        // 取消所有进行中的请求
        abortControllers.current.forEach(controller => controller.abort());
        abortControllers.current.clear();

        if (!selectedDatasource || filteredMetrics.length === 0) {
            // 清空图表数据
            setChartData(new Map());
            setQueryQueue(new Set());
            return;
        }

        // 限制最多 50 个指标
        const metricsToRender = filteredMetrics.slice(0, MAX_RENDER_COUNT);
        
        // 如果超过限制，提示用户
        if (filteredMetrics.length > MAX_RENDER_COUNT) {
            message.info(`已匹配 ${filteredMetrics.length} 个指标，仅显示前 ${MAX_RENDER_COUNT} 个，请使用搜索进一步筛选`);
        }

        // 立即查询前 12 个
        const initialBatch = metricsToRender.slice(0, INITIAL_RENDER_COUNT);
        queryBatch(initialBatch);

        // 其余加入懒加载队列
        const lazyBatch = metricsToRender.slice(INITIAL_RENDER_COUNT);
        const timers = []; // 保存所有定时器 ID，用于清理
        
        if (lazyBatch.length > 0) {
            setQueryQueue(new Set(lazyBatch));
            
            // 延迟检查并查询已经在可视区域的图表（不等待 Intersection Observer）
            // 这样可以确保初始可视区域的图表都能被查询
            const visibleTimer = setTimeout(() => {
                lazyBatch.forEach(metricName => {
                    const chartElement = document.querySelector(`[data-metric-name="${metricName}"]`);
                    if (chartElement) {
                        const rect = chartElement.getBoundingClientRect();
                        const isVisible = (
                            rect.top >= -300 && 
                            rect.top <= window.innerHeight + 300 &&
                            rect.left >= -100 &&
                            rect.left <= window.innerWidth + 100
                        );
                        if (isVisible) {
                            queryMetricData(metricName);
                            setQueryQueue(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(metricName);
                                return newSet;
                            });
                        }
                    }
                });
            }, 800); // 延迟 800ms，确保 DOM 已渲染
            timers.push(visibleTimer);
            
            // 延迟分批查询所有懒加载队列中的指标（确保所有指标最终都会被查询）
            // 不依赖 Intersection Observer，主动查询所有指标
            const lazyLoadTimer = setTimeout(() => {
                // 分批查询，每批 6 个，避免一次性查询过多
                const batchSize = CONCURRENT_QUERIES;
                let currentIndex = 0;
                
                const queryNextBatch = () => {
                    if (currentIndex >= lazyBatch.length) return;
                    
                    const batch = lazyBatch.slice(currentIndex, currentIndex + batchSize);
                    currentIndex += batchSize;
                    
                    // 查询当前批次（queryMetricData 内部会检查是否已有数据）
                    batch.forEach(metricName => {
                        queryMetricData(metricName);
                        setQueryQueue(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(metricName);
                            return newSet;
                        });
                    });
                    
                    // 延迟查询下一批，避免阻塞
                    if (currentIndex < lazyBatch.length) {
                        const nextTimer = setTimeout(queryNextBatch, 2000); // 每批间隔 2 秒
                        timers.push(nextTimer);
                    }
                };
                
                // 延迟 3 秒后开始查询，确保初始批次已完成
                const firstBatchTimer = setTimeout(queryNextBatch, 3000);
                timers.push(firstBatchTimer);
            }, 0);
            timers.push(lazyLoadTimer);
        }

        // 清理函数：组件卸载时取消请求和定时器
        return () => {
            abortControllers.current.forEach(controller => controller.abort());
            abortControllers.current.clear();
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [filteredMetrics, selectedDatasource, queryBatch, queryMetricData, INITIAL_RENDER_COUNT, MAX_RENDER_COUNT, CONCURRENT_QUERIES]);

    // 计算要渲染的指标列表（限制数量）
    const metricsToRender = useMemo(() => {
        return filteredMetrics.slice(0, MAX_RENDER_COUNT);
    }, [filteredMetrics, MAX_RENDER_COUNT]);

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
        
        // 图表数据相关
        chartData,
        querying,
        metricsToRender,
        handleLazyLoad,
        
        // 操作
        handleQuery,
        handleRefresh
    };
};


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, Button, message, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getPrometheusLabels, getPrometheusLabelValues } from '../../../api/prometheus';
import './LabelSelector.css';

const { Option } = Select;

export const LabelSelector = ({ datasourceId, labels, onLabelsChange }) => {
    // 标签行列表
    const [labelRows, setLabelRows] = useState([]);
    
    // 可用的标签键列表（从Prometheus获取）
    const [availableKeys, setAvailableKeys] = useState([]);
    const [loadingKeys, setLoadingKeys] = useState(false);
    
    // 标签值缓存（避免重复请求）
    const labelValuesCache = useRef(new Map());
    const [loadingValues, setLoadingValues] = useState(new Set());
    
    // 防抖定时器
    const debounceTimer = useRef(null);

    // 添加新的标签行
    const addLabelRow = useCallback(() => {
        const newRow = {
            id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            labelKey: '',
            labelValue: '',
            availableValues: []
        };
        setLabelRows(prev => [...prev, newRow]);
    }, []);

    // 加载所有可用的标签键
    const loadAvailableKeys = useCallback(async () => {
        if (!datasourceId) return;

        setLoadingKeys(true);
        try {
            const response = await getPrometheusLabels(datasourceId);
            
            if (response?.data?.status === 'success' && response?.data?.data) {
                setAvailableKeys(response.data.data);
            } else if (response?.data && Array.isArray(response.data)) {
                setAvailableKeys(response.data);
            } else {
                console.warn('标签键响应格式异常:', response);
                setAvailableKeys([]);
            }
        } catch (error) {
            message.error(`加载标签键失败: ${error.message}`);
            console.error('加载标签键出错:', error);
            setAvailableKeys([]);
        } finally {
            setLoadingKeys(false);
        }
    }, [datasourceId]);

    // 初始化：添加第一个空标签行
    useEffect(() => {
        if (labelRows.length === 0) {
            addLabelRow();
        }
    }, [labelRows.length, addLabelRow]);

    // 当数据源改变时，加载标签键列表
    useEffect(() => {
        if (datasourceId) {
            loadAvailableKeys();
        } else {
            setAvailableKeys([]);
        }
    }, [datasourceId, loadAvailableKeys]);

    // 同步内部状态到父组件
    useEffect(() => {
        const validLabels = labelRows
            .filter(row => row.labelKey && row.labelValue)
            .map(row => ({
                id: row.id,
                labelKey: row.labelKey,
                labelValue: row.labelValue
            }));
        onLabelsChange?.(validLabels);
    }, [labelRows, onLabelsChange]);

    // 更新标签行的可用值
    const updateLabelRowValues = useCallback((rowId, values) => {
        setLabelRows(prev => prev.map(row => 
            row.id === rowId 
                ? { ...row, availableValues: values, labelValue: '' } // 清空已选值
                : row
        ));
    }, []);

    // 加载指定标签键的所有值（级联查询）
    const loadLabelValues = useCallback(async (labelKey, rowId) => {
        if (!datasourceId || !labelKey) return;

        // 检查缓存
        const cacheKey = `${datasourceId}_${labelKey}`;
        if (labelValuesCache.current.has(cacheKey)) {
            const cachedValues = labelValuesCache.current.get(cacheKey);
            updateLabelRowValues(rowId, cachedValues);
            return;
        }

        // 设置加载状态
        setLoadingValues(prev => new Set([...prev, labelKey]));

        try {
            const response = await getPrometheusLabelValues(datasourceId, labelKey);
            
            let values = [];
            if (response?.data?.status === 'success' && response?.data?.data) {
                values = response.data.data;
            } else if (response?.data && Array.isArray(response.data)) {
                values = response.data;
            } else {
                console.warn('标签值响应格式异常:', response);
                values = [];
            }

            // 缓存结果
            labelValuesCache.current.set(cacheKey, values);
            
            // 更新标签行的可用值
            updateLabelRowValues(rowId, values);
        } catch (error) {
            message.error(`加载标签 '${labelKey}' 的值失败: ${error.message}`);
            console.error(`加载标签值出错 ${labelKey}:`, error);
            updateLabelRowValues(rowId, []);
        } finally {
            setLoadingValues(prev => {
                const newSet = new Set(prev);
                newSet.delete(labelKey);
                return newSet;
            });
        }
    }, [datasourceId, updateLabelRowValues]);

    // 删除标签行
    const deleteLabelRow = useCallback((rowId) => {
        setLabelRows(prev => {
            const updated = prev.filter(row => row.id !== rowId);
            // 如果删除后没有行，添加一个空行
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
        // 更新标签键并清空标签值
        setLabelRows(prev => prev.map(row => 
            row.id === rowId 
                ? { ...row, labelKey: selectedKey, labelValue: '', availableValues: [] }
                : row
        ));

        // 防抖加载标签值
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

    // 清空所有标签
    const clearAllLabels = useCallback(() => {
        setLabelRows([{
            id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            labelKey: '',
            labelValue: '',
            availableValues: []
        }]);
        labelValuesCache.current.clear();
    }, []);

    // 获取可用的标签键（排除已选中的，但保留当前行选中的）
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

    return (
        <div className="label-selector">
            <div className="label-selector__rows">
                {labelRows.map((row) => {
                    const availableKeysForRow = getAvailableKeysForRow(row.id);
                    const isLoadingValues = loadingValues.has(row.labelKey);

                    return (
                        <div key={row.id} className="label-selector__row">
                            <Select
                                className="label-selector__key-select"
                                placeholder="选择标签键"
                                value={row.labelKey || undefined}
                                onChange={(value) => handleKeyChange(row.id, value)}
                                loading={loadingKeys}
                                disabled={!datasourceId || loadingKeys}
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
                                className="label-selector__value-select"
                                placeholder={isLoadingValues ? "加载中..." : "选择标签值"}
                                value={row.labelValue || undefined}
                                onChange={(value) => handleValueChange(row.id, value)}
                                loading={isLoadingValues}
                                disabled={!row.labelKey || !datasourceId || isLoadingValues}
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
                                className="label-selector__delete-btn"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => deleteLabelRow(row.id)}
                                disabled={labelRows.length === 1}
                                title="删除标签"
                            />
                        </div>
                    );
                })}
            </div>

            <div className="label-selector__actions">
                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addLabelRow}
                    disabled={!datasourceId}
                >
                    Add label
                </Button>
                
                <Button
                    type="text"
                    danger
                    onClick={clearAllLabels}
                    disabled={labelRows.length === 0 || !labelRows.some(row => row.labelKey)}
                >
                    清空全部
                </Button>
            </div>

            {loadingKeys && (
                <div className="label-selector__loading">
                    <Spin size="small" />
                    <span>正在从 Prometheus 加载标签键...</span>
                </div>
            )}

            {!datasourceId && (
                <div className="label-selector__empty">
                    请先选择数据源以加载标签过滤器
                </div>
            )}
        </div>
    );
};

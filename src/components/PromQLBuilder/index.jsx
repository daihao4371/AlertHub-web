import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Input, Space, Divider, message, Spin } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { getPrometheusMetrics, getPrometheusLabels, getPrometheusLabelValues } from '../../api/prometheus';
import './index.css';

const { Option } = Select;

/**
 * PromQLBuilder - PromQL 可视化查询构建器
 *
 * 参考 Grafana Query Builder 设计
 * 功能:
 * 1. Metric 选择
 * 2. Label Filters (标签过滤器)
 * 3. Operations (聚合函数/操作)
 */
const PromQLBuilder = ({ visible, onClose, datasourceId, onBuild }) => {
    // 基础状态
    const [loading, setLoading] = useState(false);

    // Metric 相关
    const [metrics, setMetrics] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState(null);
    const [metricSearch, setMetricSearch] = useState('');

    // Label Filters 相关
    const [labels, setLabels] = useState([]);
    const [labelFilters, setLabelFilters] = useState([]);

    // Operations 相关
    const [operations, setOperations] = useState([]);

    // 常用操作符
    const operators = [
        { label: '= (等于)', value: '=' },
        { label: '!= (不等于)', value: '!=' },
        { label: '=~ (正则匹配)', value: '=~' },
        { label: '!~ (正则不匹配)', value: '!~' },
    ];

    // 常用 PromQL 函数
    const promqlFunctions = [
        { label: 'rate (计算速率)', value: 'rate', params: ['range'] },
        { label: 'irate (即时速率)', value: 'irate', params: ['range'] },
        { label: 'sum (求和)', value: 'sum', params: ['by'] },
        { label: 'avg (平均值)', value: 'avg', params: ['by'] },
        { label: 'max (最大值)', value: 'max', params: ['by'] },
        { label: 'min (最小值)', value: 'min', params: ['by'] },
        { label: 'count (计数)', value: 'count', params: ['by'] },
        { label: 'increase (增长量)', value: 'increase', params: ['range'] },
    ];

    // 加载指标列表
    useEffect(() => {
        if (visible && datasourceId) {
            loadMetrics();
        }
    }, [visible, datasourceId]);

    // 当选择指标后,加载该指标的标签
    useEffect(() => {
        if (selectedMetric && datasourceId) {
            loadLabels(selectedMetric);
        }
    }, [selectedMetric, datasourceId]);

    const loadMetrics = async () => {
        setLoading(true);
        try {
            const response = await getPrometheusMetrics(datasourceId);
            const metricList = response.data.data || [];
            setMetrics(metricList);
        } catch (error) {
            console.error('加载指标失败:', error);
            message.error('加载指标失败');
        } finally {
            setLoading(false);
        }
    };

    const loadLabels = async (metricName) => {
        try {
            const response = await getPrometheusLabels(datasourceId, metricName);
            const labelList = response.data.data || [];
            setLabels(labelList);
        } catch (error) {
            console.error('加载标签失败:', error);
            message.error('加载标签失败');
        }
    };

    const loadLabelValues = async (labelName, filterIndex) => {
        try {
            const response = await getPrometheusLabelValues(datasourceId, labelName);
            const values = response.data.data || [];

            // 更新对应过滤器的可选值
            const newFilters = [...labelFilters];
            newFilters[filterIndex].availableValues = values;
            setLabelFilters(newFilters);
        } catch (error) {
            console.error('加载标签值失败:', error);
            message.error('加载标签值失败');
        }
    };

    // 添加标签过滤器
    const addLabelFilter = () => {
        setLabelFilters([
            ...labelFilters,
            { label: null, operator: '=', value: null, availableValues: [] }
        ]);
    };

    // 移除标签过滤器
    const removeLabelFilter = (index) => {
        const newFilters = labelFilters.filter((_, i) => i !== index);
        setLabelFilters(newFilters);
    };

    // 更新标签过滤器
    const updateLabelFilter = (index, field, value) => {
        const newFilters = [...labelFilters];
        newFilters[index][field] = value;

        // 当标签名改变时,加载该标签的可选值
        if (field === 'label' && value) {
            loadLabelValues(value, index);
        }

        setLabelFilters(newFilters);
    };

    // 添加操作/函数
    const addOperation = () => {
        setOperations([
            ...operations,
            { func: null, params: {} }
        ]);
    };

    // 移除操作
    const removeOperation = (index) => {
        const newOps = operations.filter((_, i) => i !== index);
        setOperations(newOps);
    };

    // 更新操作
    const updateOperation = (index, field, value) => {
        const newOps = [...operations];
        newOps[index][field] = value;
        setOperations(newOps);
    };

    // 构建 PromQL 查询
    const buildPromQL = () => {
        if (!selectedMetric) {
            message.warning('请先选择指标');
            return;
        }

        let query = selectedMetric;

        // 添加标签过滤器
        if (labelFilters.length > 0) {
            const filters = labelFilters
                .filter(f => f.label && f.value)
                .map(f => {
                    // 如果是正则匹配,值需要加双引号
                    const needQuotes = f.operator === '=~' || f.operator === '!~';
                    const valueStr = needQuotes ? `"${f.value}"` : `"${f.value}"`;
                    return `${f.label}${f.operator}${valueStr}`;
                })
                .join(', ');

            if (filters) {
                query = `${query}{${filters}}`;
            }
        }

        // 添加操作/函数
        operations.forEach(op => {
            if (!op.func) return;

            const funcDef = promqlFunctions.find(f => f.value === op.func);
            if (!funcDef) return;

            if (op.func === 'rate' || op.func === 'irate' || op.func === 'increase') {
                // 速率类函数需要时间范围参数
                const range = op.params.range || '5m';
                query = `${op.func}(${query}[${range}])`;
            } else if (op.func === 'sum' || op.func === 'avg' || op.func === 'max' ||
                       op.func === 'min' || op.func === 'count') {
                // 聚合函数
                if (op.params.by) {
                    query = `${op.func} by(${op.params.by}) (${query})`;
                } else {
                    query = `${op.func}(${query})`;
                }
            }
        });

        return query;
    };

    // 应用查询
    const handleApply = () => {
        const query = buildPromQL();
        if (query && onBuild) {
            onBuild(query);
        }
        onClose();
    };

    // 重置
    const handleReset = () => {
        setSelectedMetric(null);
        setLabelFilters([]);
        setOperations([]);
        setMetricSearch('');
    };

    const filteredMetrics = metrics.filter(m =>
        m.toLowerCase().includes(metricSearch.toLowerCase())
    );

    return (
        <Modal
            title="PromQL 查询构建器"
            open={visible}
            onCancel={onClose}
            width={800}
            footer={[
                <Button key="reset" onClick={handleReset}>
                    重置
                </Button>,
                <Button key="cancel" onClick={onClose}>
                    取消
                </Button>,
                <Button key="apply" type="primary" onClick={handleApply}>
                    应用
                </Button>,
            ]}
        >
            <div className="promql-builder">
                {/* Metric 选择 */}
                <div className="builder-section">
                    <div className="section-title">Metric (指标)</div>
                    <Select
                        showSearch
                        placeholder="选择指标"
                        style={{ width: '100%' }}
                        value={selectedMetric}
                        onChange={setSelectedMetric}
                        onSearch={setMetricSearch}
                        filterOption={false}
                        loading={loading}
                        notFoundContent={loading ? <Spin size="small" /> : "没有找到指标"}
                    >
                        {filteredMetrics.map(metric => (
                            <Option key={metric} value={metric}>
                                {metric}
                            </Option>
                        ))}
                    </Select>
                </div>

                <Divider />

                {/* Label Filters */}
                <div className="builder-section">
                    <div className="section-title">
                        Label filters (标签过滤器)
                        <Button
                            type="link"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={addLabelFilter}
                            disabled={!selectedMetric}
                        >
                            添加过滤器
                        </Button>
                    </div>

                    {labelFilters.map((filter, index) => (
                        <Space key={index} style={{ width: '100%', marginBottom: 8 }} align="start">
                            <Select
                                placeholder="选择标签"
                                style={{ width: 150 }}
                                value={filter.label}
                                onChange={(value) => updateLabelFilter(index, 'label', value)}
                            >
                                {labels.map(label => (
                                    <Option key={label} value={label}>
                                        {label}
                                    </Option>
                                ))}
                            </Select>

                            <Select
                                style={{ width: 80 }}
                                value={filter.operator}
                                onChange={(value) => updateLabelFilter(index, 'operator', value)}
                            >
                                {operators.map(op => (
                                    <Option key={op.value} value={op.value}>
                                        {op.value}
                                    </Option>
                                ))}
                            </Select>

                            <Select
                                showSearch
                                placeholder="选择值"
                                style={{ width: 200 }}
                                value={filter.value}
                                onChange={(value) => updateLabelFilter(index, 'value', value)}
                                disabled={!filter.label}
                            >
                                {filter.availableValues?.map(val => (
                                    <Option key={val} value={val}>
                                        {val}
                                    </Option>
                                ))}
                            </Select>

                            <Button
                                type="text"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => removeLabelFilter(index)}
                            />
                        </Space>
                    ))}

                    {labelFilters.length === 0 && (
                        <div style={{ color: '#999', fontSize: 12 }}>
                            {selectedMetric ? '点击上方按钮添加标签过滤器' : '请先选择指标'}
                        </div>
                    )}
                </div>

                <Divider />

                {/* Operations */}
                <div className="builder-section">
                    <div className="section-title">
                        Operations (操作/函数)
                        <Button
                            type="link"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={addOperation}
                            disabled={!selectedMetric}
                        >
                            添加操作
                        </Button>
                    </div>

                    {operations.map((op, index) => {
                        const funcDef = promqlFunctions.find(f => f.value === op.func);

                        return (
                            <Space key={index} style={{ width: '100%', marginBottom: 8 }} align="start">
                                <Select
                                    placeholder="选择函数"
                                    style={{ width: 200 }}
                                    value={op.func}
                                    onChange={(value) => updateOperation(index, 'func', value)}
                                >
                                    {promqlFunctions.map(func => (
                                        <Option key={func.value} value={func.value}>
                                            {func.label}
                                        </Option>
                                    ))}
                                </Select>

                                {/* 根据函数类型显示不同的参数输入 */}
                                {op.func && funcDef?.params.includes('range') && (
                                    <Input
                                        placeholder="时间范围 (如: 5m)"
                                        style={{ width: 150 }}
                                        value={op.params.range}
                                        onChange={(e) => {
                                            const newParams = { ...op.params, range: e.target.value };
                                            updateOperation(index, 'params', newParams);
                                        }}
                                    />
                                )}

                                {op.func && funcDef?.params.includes('by') && (
                                    <Input
                                        placeholder="聚合标签 (如: instance)"
                                        style={{ width: 150 }}
                                        value={op.params.by}
                                        onChange={(e) => {
                                            const newParams = { ...op.params, by: e.target.value };
                                            updateOperation(index, 'params', newParams);
                                        }}
                                    />
                                )}

                                <Button
                                    type="text"
                                    danger
                                    icon={<CloseOutlined />}
                                    onClick={() => removeOperation(index)}
                                />
                            </Space>
                        );
                    })}

                    {operations.length === 0 && (
                        <div style={{ color: '#999', fontSize: 12 }}>
                            {selectedMetric ? '点击上方按钮添加操作' : '请先选择指标'}
                        </div>
                    )}
                </div>

                <Divider />

                {/* 预览生成的 PromQL */}
                <div className="builder-section">
                    <div className="section-title">预览</div>
                    <div className="promql-preview">
                        <code>{buildPromQL() || '请先选择指标...'}</code>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PromQLBuilder;
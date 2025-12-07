import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Select, Input, Space, Divider, Spin, App } from 'antd';
import { PlusOutlined, CloseOutlined, ImportOutlined } from '@ant-design/icons';
import { getPrometheusMetrics, getPrometheusLabels, getPrometheusLabelValues } from '../../api/prometheus';
import { parsePromQL } from '../../utils/promqlParser';
import PromQLHighlighter from './PromQLHighlighter';
import './index.css';

const { Option } = Select;

/**
 * PromQLBuilder - PromQL 可视化查询构建器
 *
 * 参考 Grafana Query Builder 设计
 * 功能:
 * 1. Metric 选择
 * 2. Label Filters (标签过滤器)
 * 3. Operations (聚合函数/操作) - 支持嵌套操作和多个 by 子句
 * 4. 从 PromQL 反向解析到构建器状态
 */
const PromQLBuilder = ({ visible, onClose, datasourceId, onBuild, initialQuery }) => {
    // 使用 App hook 获取 message API（修复静态函数警告）
    const { message } = App.useApp();
    
    // 基础状态
    const [loading, setLoading] = useState(false);

    // Metric 相关
    const [metrics, setMetrics] = useState([]);
    const [metricSearch, setMetricSearch] = useState('');

    // 指标表达式数组（支持多个指标和算术运算）
    // 每个表达式包含：指标、标签过滤器、运算符（第一个表达式没有运算符）
    const [expressions, setExpressions] = useState([
        { metric: null, labelFilters: [], operator: null }
    ]);

    // 当前选中的表达式索引（用于加载标签）
    const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0);

    // Label Filters 相关（当前表达式的标签）
    const [labels, setLabels] = useState([]);

    // Operations 相关
    const [operations, setOperations] = useState([]);

    // 标签过滤器操作符
    const labelOperators = [
        { label: '= (等于)', value: '=' },
        { label: '!= (不等于)', value: '!=' },
        { label: '=~ (正则匹配)', value: '=~' },
        { label: '!~ (正则不匹配)', value: '!~' },
    ];

    // 算术运算符（用于指标之间的运算）
    const arithmeticOperators = [
        { label: '+ (加)', value: '+' },
        { label: '- (减)', value: '-' },
        { label: '* (乘)', value: '*' },
        { label: '/ (除)', value: '/' },
        { label: '% (取模)', value: '%' },
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

    // 定义加载函数（使用 useCallback 避免重复创建）
    const loadMetrics = useCallback(async () => {
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
    }, [datasourceId, message]);

    const loadLabels = useCallback(async (metricName) => {
        try {
            const response = await getPrometheusLabels(datasourceId, metricName);
            const labelList = response.data.data || [];
            setLabels(labelList);
        } catch (error) {
            console.error('加载标签失败:', error);
            message.error('加载标签失败');
        }
    }, [datasourceId, message]);

    const loadLabelValues = useCallback(async (labelName, exprIndex, filterIndex) => {
        try {
            const response = await getPrometheusLabelValues(datasourceId, labelName);
            const values = response.data.data || [];

            // 更新对应表达式的标签过滤器的可选值
            setExpressions(prevExpressions => {
                const newExpressions = [...prevExpressions];
                if (exprIndex >= 0 && exprIndex < newExpressions.length) {
                    const filters = [...(newExpressions[exprIndex].labelFilters || [])];
                    if (filterIndex >= 0 && filterIndex < filters.length && filters[filterIndex]) {
                        filters[filterIndex] = {
                            ...filters[filterIndex],
                            availableValues: values
                        };
                        newExpressions[exprIndex].labelFilters = filters;
                    }
                }
                return newExpressions;
            });
        } catch (error) {
            console.error('加载标签值失败:', error);
            message.error('加载标签值失败');
        }
    }, [datasourceId, message]);

    // 加载指标列表
    useEffect(() => {
        if (visible && datasourceId) {
            loadMetrics();
        }
    }, [visible, datasourceId, loadMetrics]);

    // 从初始查询反向解析（如果提供了 initialQuery）
    useEffect(() => {
        if (visible && initialQuery) {
            try {
                const parsed = parsePromQL(initialQuery);
                console.log('初始查询解析结果:', JSON.stringify(parsed, null, 2));
                
                // 使用新的表达式结构
                if (parsed.expressions && parsed.expressions.length > 0) {
                    const newExpressions = parsed.expressions.map(expr => ({
                        metric: expr.metric,
                        labelFilters: (expr.labelFilters || []).map(f => ({
                            ...f,
                            availableValues: []
                        })),
                        operator: expr.operator || null
                    }));
                    setExpressions(newExpressions);
                    
                    setOperations(parsed.operations.map(op => ({
                        func: op.func,
                        params: op.params || {}
                    })));
                    
                    // 加载标签值
                    newExpressions.forEach((expr, exprIndex) => {
                        if (expr.labelFilters && expr.labelFilters.length > 0 && datasourceId) {
                            expr.labelFilters.forEach((filter, filterIndex) => {
                                if (filter.label) {
                                    setTimeout(() => {
                                        loadLabelValues(filter.label, exprIndex, filterIndex);
                                    }, 100);
                                }
                            });
                        }
                    });
                    
                    // 设置当前表达式索引为第一个有指标的表达式
                    const firstMetricIndex = newExpressions.findIndex(e => e.metric);
                    if (firstMetricIndex >= 0) {
                        setCurrentExpressionIndex(firstMetricIndex);
                    }
                }
            } catch (error) {
                console.error('解析 PromQL 失败:', error);
                message.warning('无法解析查询语句，请手动构建');
            }
        }
    }, [visible, initialQuery, datasourceId, loadLabelValues, message]);

    // 当选择指标后,加载该指标的标签
    useEffect(() => {
        const currentExpr = expressions[currentExpressionIndex];
        if (currentExpr && currentExpr.metric && datasourceId) {
            loadLabels(currentExpr.metric);
        }
    }, [expressions, currentExpressionIndex, datasourceId, loadLabels]);

    // 表达式管理函数
    const addExpression = () => {
        setExpressions([
            ...expressions,
            { metric: null, labelFilters: [], operator: '-' } // 默认使用减法
        ]);
        setCurrentExpressionIndex(expressions.length);
    };

    const removeExpression = (index) => {
        if (expressions.length <= 1) {
            message.warning('至少需要保留一个指标表达式');
            return;
        }
        const newExpressions = expressions.filter((_, i) => i !== index);
        setExpressions(newExpressions);
        if (currentExpressionIndex >= newExpressions.length) {
            setCurrentExpressionIndex(newExpressions.length - 1);
        }
    };

    const updateExpression = (index, field, value) => {
        const newExpressions = [...expressions];
        newExpressions[index] = {
            ...newExpressions[index],
            [field]: value
        };
        setExpressions(newExpressions);
        
        // 如果更新的是指标，加载该指标的标签
        if (field === 'metric' && value && index === currentExpressionIndex) {
            loadLabels(value);
        }
    };

    // 更新表达式的运算符
    const updateExpressionOperator = (index, operator) => {
        if (index === 0) {
            message.warning('第一个表达式不需要运算符');
            return;
        }
        updateExpression(index, 'operator', operator);
    };

    // 添加标签过滤器（针对当前表达式）
    const addLabelFilter = (exprIndex) => {
        const newExpressions = [...expressions];
        if (!newExpressions[exprIndex].labelFilters) {
            newExpressions[exprIndex].labelFilters = [];
        }
        newExpressions[exprIndex].labelFilters.push({
            label: null,
            operator: '=',
            value: null,
            availableValues: []
        });
        setExpressions(newExpressions);
    };

    // 移除标签过滤器
    const removeLabelFilter = (exprIndex, filterIndex) => {
        const newExpressions = [...expressions];
        newExpressions[exprIndex].labelFilters = newExpressions[exprIndex].labelFilters.filter(
            (_, i) => i !== filterIndex
        );
        setExpressions(newExpressions);
    };

    // 更新标签过滤器
    const updateLabelFilter = (exprIndex, filterIndex, field, value) => {
        const newExpressions = [...expressions];
        const filters = [...newExpressions[exprIndex].labelFilters];
        filters[filterIndex] = {
            ...filters[filterIndex],
            [field]: value
        };
        newExpressions[exprIndex].labelFilters = filters;
        setExpressions(newExpressions);

        // 当标签名改变时,加载该标签的可选值
        if (field === 'label' && value) {
            loadLabelValues(value, exprIndex, filterIndex);
        }
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

    // 构建 PromQL 查询（支持多个指标和算术运算）
    const buildPromQL = () => {
        // 构建指标表达式部分
        const expressionParts = expressions
            .filter(expr => expr.metric) // 只处理有指标的表达式
            .map((expr, index) => {
                let metricQuery = expr.metric;

                // 添加标签过滤器（格式：label operator "value"，标签之间用 ", " 连接，无多余空格）
                if (expr.labelFilters && expr.labelFilters.length > 0) {
                    const filters = expr.labelFilters
                        .filter(f => f.label && f.value)
                        .map(f => {
                            const valueStr = `"${f.value}"`;
                            // 标签、操作符、值之间无空格，确保格式一致
                            return `${f.label}${f.operator}${valueStr}`;
                        })
                        .join(', '); // 标签之间用 ", " 连接（逗号+空格）

                    if (filters) {
                        metricQuery = `${metricQuery}{${filters}}`;
                    }
                }

                // 如果不是第一个表达式，添加运算符（运算符前后各一个空格）
                if (index > 0 && expr.operator) {
                    return ` ${expr.operator} ${metricQuery}`;
                }
                return metricQuery;
            });

        if (expressionParts.length === 0) {
            return '';
        }

        // 组合所有表达式
        let query = expressionParts.join('');

        // 从内到外应用操作（支持嵌套）
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
                // 聚合函数 - 支持多个 by 子句
                const byClause = op.params.by ? op.params.by.trim() : null;
                if (byClause) {
                    // by 子句中的标签之间用逗号分隔，去除多余空格
                    // 格式：func by(label1,label2) (query) 或 func by(label1, label2) (query)
                    const byLabels = byClause.split(',').map(l => l.trim()).filter(l => l).join(', ');
                    query = `${op.func} by(${byLabels}) (${query})`;
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
        setExpressions([{ metric: null, labelFilters: [], operator: null }]);
        setCurrentExpressionIndex(0);
        setOperations([]);
        setMetricSearch('');
    };

    // 从 PromQL 反向解析（从编辑器内容解析）
    const handleParseFromQuery = () => {
        // 优先使用 initialQuery（编辑器中的查询），如果没有则使用当前构建的查询
        const queryToParse = initialQuery || buildPromQL();
        
        if (!queryToParse || !queryToParse.trim()) {
            message.warning('当前没有可解析的查询，请先在编辑器中输入 PromQL 查询');
            return;
        }

        console.log('开始解析查询:', queryToParse);

        try {
            const parsed = parsePromQL(queryToParse);
            console.log('解析结果:', JSON.stringify(parsed, null, 2));
            
            if (parsed.expressions && parsed.expressions.length > 0) {
                const newExpressions = parsed.expressions.map(expr => ({
                    metric: expr.metric,
                    labelFilters: (expr.labelFilters || []).map(f => ({
                        ...f,
                        availableValues: []
                    })),
                    operator: expr.operator || null
                }));
                setExpressions(newExpressions);
                
                const newOperations = parsed.operations.map(op => ({
                    func: op.func,
                    params: op.params || {}
                }));
                setOperations(newOperations);
                
                console.log('设置状态:', {
                    expressions: newExpressions,
                    operations: newOperations
                });
                
                // 加载标签值
                newExpressions.forEach((expr, exprIndex) => {
                    if (expr.labelFilters && expr.labelFilters.length > 0 && datasourceId) {
                        expr.labelFilters.forEach((filter, filterIndex) => {
                            if (filter.label) {
                                setTimeout(() => {
                                    loadLabelValues(filter.label, exprIndex, filterIndex);
                                }, 100);
                            }
                        });
                    }
                });
                
                const metricCount = newExpressions.filter(e => e.metric).length;
                const totalFilters = newExpressions.reduce((sum, e) => sum + (e.labelFilters?.length || 0), 0);
                message.success(`解析成功：${metricCount} 个指标，${totalFilters} 个标签过滤器，${newOperations.length} 个操作`);
            } else {
                message.warning('无法解析查询语句：未找到指标名称');
                console.warn('解析结果:', parsed);
            }
        } catch (error) {
            console.error('解析失败:', error);
            message.error('解析失败: ' + (error.message || error.toString()));
        }
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
                {/* 指标表达式列表（支持多个指标和算术运算） */}
                {expressions.map((expr, exprIndex) => (
                    <React.Fragment key={exprIndex}>
                        <div className="builder-section">
                            <div className="section-title">
                                {exprIndex === 0 ? '指标表达式 1' : `指标表达式 ${exprIndex + 1}`}
                                {exprIndex > 0 && (
                                    <Select
                                        style={{ width: 80, marginLeft: 8 }}
                                        value={expr.operator}
                                        onChange={(value) => updateExpressionOperator(exprIndex, value)}
                                    >
                                        {arithmeticOperators.map(op => (
                                            <Option key={op.value} value={op.value}>
                                                {op.label}
                                            </Option>
                                        ))}
                                    </Select>
                                )}
                                {expressions.length > 1 && (
                                    <Button
                                        type="link"
                                        size="small"
                                        danger
                                        icon={<CloseOutlined />}
                                        onClick={() => removeExpression(exprIndex)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        删除
                                    </Button>
                                )}
                            </div>

                            {/* 指标选择 */}
                            <Select
                                showSearch
                                placeholder="选择指标"
                                style={{ width: '100%', marginBottom: 12 }}
                                value={expr.metric}
                                onChange={(value) => {
                                    updateExpression(exprIndex, 'metric', value);
                                    setCurrentExpressionIndex(exprIndex);
                                }}
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

                            {/* 标签过滤器 */}
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
                                    标签过滤器
                                    <Button
                                        type="link"
                                        size="small"
                                        icon={<PlusOutlined />}
                                        onClick={() => addLabelFilter(exprIndex)}
                                        disabled={!expr.metric}
                                        style={{ padding: 0, marginLeft: 4 }}
                                    >
                                        添加
                                    </Button>
                                </div>

                                {(expr.labelFilters || []).map((filter, filterIndex) => (
                                    <Space key={filterIndex} style={{ width: '100%', marginBottom: 8 }} align="start">
                                        <Select
                                            placeholder="选择标签"
                                            style={{ width: 150 }}
                                            value={filter.label}
                                            onChange={(value) => {
                                                updateLabelFilter(exprIndex, filterIndex, 'label', value);
                                                setCurrentExpressionIndex(exprIndex);
                                            }}
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
                                            onChange={(value) => updateLabelFilter(exprIndex, filterIndex, 'operator', value)}
                                        >
                                            {labelOperators.map(op => (
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
                                            onChange={(value) => updateLabelFilter(exprIndex, filterIndex, 'value', value)}
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
                                            onClick={() => removeLabelFilter(exprIndex, filterIndex)}
                                        />
                                    </Space>
                                ))}

                                {(!expr.labelFilters || expr.labelFilters.length === 0) && (
                                    <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>
                                        {expr.metric ? '点击上方按钮添加标签过滤器' : '请先选择指标'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {exprIndex < expressions.length - 1 && <Divider />}
                    </React.Fragment>
                ))}

                {/* 添加新表达式按钮 */}
                <div className="builder-section">
                    <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={addExpression}
                        block
                    >
                        添加指标表达式（支持算术运算）
                    </Button>
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
                            disabled={expressions.length === 0 || !expressions.some(e => e.metric)}
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
                                        placeholder="聚合标签 (如: instance 或 cpu,instance)"
                                        style={{ width: 200 }}
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
                            {expressions.some(e => e.metric) ? '点击上方按钮添加操作' : '请先选择指标'}
                        </div>
                    )}
                </div>

                <Divider />

                {/* 预览生成的 PromQL */}
                <div className="builder-section">
                    <div className="section-title">
                        预览（构建器生成的查询）
                        <Button
                            type="link"
                            size="small"
                            icon={<ImportOutlined />}
                            onClick={handleParseFromQuery}
                            disabled={!initialQuery && !buildPromQL()}
                            title={initialQuery ? "从编辑器中的查询反向解析" : "从当前构建的查询反向解析"}
                        >
                            反向解析
                        </Button>
                    </div>
                    <div className="promql-preview">
                        <PromQLHighlighter query={buildPromQL()} />
                    </div>
                    {initialQuery && initialQuery.trim() && initialQuery !== buildPromQL() && (
                        <div style={{ marginTop: 12, padding: 8, background: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
                            <div style={{ fontSize: 12, color: '#d46b08', fontWeight: 500, marginBottom: 4 }}>
                                ⚠️ 编辑器中的原始查询（包含构建器不支持的功能）：
                            </div>
                            <div style={{ display: 'block', marginTop: 4, padding: 4, background: '#fff', borderRadius: 4, fontSize: 11, wordBreak: 'break-all' }}>
                                <PromQLHighlighter query={initialQuery} />
                            </div>
                            <div style={{ marginTop: 6, fontSize: 11, color: '#8c8c8c' }}>
                                说明：构建器当前仅支持单个指标的查询。如果原始查询包含算术运算（+、-、*、/）或多个指标，将只解析第一个指标部分。
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PromQLBuilder;
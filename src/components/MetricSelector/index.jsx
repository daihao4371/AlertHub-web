import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Spin, Empty, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getPrometheusMetrics } from '../../api/prometheus';
import './index.css';

/**
 * MetricSelector - 指标选择器组件
 *
 * 功能:
 * 1. 展示所有可用的 Prometheus 指标
 * 2. 支持实时搜索过滤
 * 3. 点击指标名称插入到 PromQL 输入框
 *
 * 类似 Grafana 的 Metrics explorer
 */
const MetricSelector = ({ visible, onClose, datasourceId, onSelect }) => {
    const [loading, setLoading] = useState(false);
    const [metrics, setMetrics] = useState([]);
    const [filteredMetrics, setFilteredMetrics] = useState([]);
    const [searchText, setSearchText] = useState('');

    // 加载指标列表
    useEffect(() => {
        if (visible && datasourceId) {
            loadMetrics();
        }
    }, [visible, datasourceId]);

    // 搜索过滤
    useEffect(() => {
        if (searchText) {
            const filtered = metrics.filter(metric =>
                metric.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredMetrics(filtered);
        } else {
            setFilteredMetrics(metrics);
        }
    }, [searchText, metrics]);

    const loadMetrics = async () => {
        setLoading(true);
        try {
            const response = await getPrometheusMetrics(datasourceId);
            const metricList = response.data.data || [];
            setMetrics(metricList);
            setFilteredMetrics(metricList);
        } catch (error) {
            console.error('加载指标失败:', error);
            message.error('加载指标失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMetric = (metric) => {
        if (onSelect) {
            onSelect(metric);
        }
        onClose();
    };

    return (
        <Modal
            title="指标浏览器"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
            bodyStyle={{ padding: '16px' }}
        >
            <div className="metric-selector">
                <Input
                    prefix={<SearchOutlined />}
                    placeholder="搜索指标名称..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ marginBottom: 16 }}
                    allowClear
                />

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin tip="加载指标中..." />
                    </div>
                ) : filteredMetrics.length === 0 ? (
                    <Empty description="没有找到匹配的指标" />
                ) : (
                    <div className="metric-list-container">
                        <div className="metric-count">
                            共 {filteredMetrics.length} 个指标
                        </div>
                        <List
                            size="small"
                            dataSource={filteredMetrics}
                            renderItem={(metric) => (
                                <List.Item
                                    className="metric-item"
                                    onClick={() => handleSelectMetric(metric)}
                                    style={{ cursor: 'pointer', padding: '8px 12px' }}
                                >
                                    <span className="metric-name">{metric}</span>
                                </List.Item>
                            )}
                            style={{
                                maxHeight: '400px',
                                overflowY: 'auto',
                                border: '1px solid #f0f0f0',
                                borderRadius: '4px'
                            }}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default MetricSelector;
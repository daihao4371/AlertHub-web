import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Rate, Empty, Alert, Select } from 'antd';
import { BulbOutlined, RedoOutlined } from '@ant-design/icons';
import {
    RCACluster,
    RCACommitFeedback,
} from '../../api/rca';
import { getSystemSetting } from '../../api/settings';
import { HandleShowTotal } from '../../utils/lib';
import {
    createAlertColumns,
    createIncidentColumns,
    SearchBar,
    IncidentDetailDrawer,
} from './components';
import { useAlertData, useClusterResult, useWindowHeight } from './hooks';
import './rca.css';

/**
 * 根因分析页面 - 按照处理记录的架构重构
 */
export const RCAPage = () => {
    // 搜索和筛选状态
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFaultCenter, setSelectedFaultCenter] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // 数据管理 Hook
    const {
        eventList,
        faultCenterList,
        loading: loadingEvents,
        pagination,
        setPagination,
        loadFaultCenterList,
        loadEventList,
    } = useAlertData();

    // 聚类结果管理 Hook
    const {
        clusterResult,
        setClusterResult,
        selectedIncident,
        detailDrawerOpen,
        openDetail,
        closeDetail,
    } = useClusterResult();

    // 聚类状态
    const [clustering, setClustering] = useState(false);

    // 模型选择状态
    const [modelList, setModelList] = useState([]);
    const [selectedModel, setSelectedModel] = useState(undefined);

    // 反馈模态框
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackForm] = Form.useForm();

    // 窗口高度
    const height = useWindowHeight();

    // 处理表格变化
    const handleTableChange = (newPagination) => {
        loadEventList(newPagination.current, newPagination.pageSize, selectedFaultCenter);
    };

    // 处理搜索
    const handleSearch = () => {
        setPagination(prev => ({ ...prev, current: 1 }));
        // 过滤本地数据
        loadEventList(1, pagination.pageSize, selectedFaultCenter);
    };

    // 处理重置
    const handleReset = () => {
        setSearchQuery('');
        setSelectedFaultCenter('');
        setPagination(prev => ({ ...prev, current: 1 }));
        loadEventList(1, pagination.pageSize, '');
    };

    // 处理刷新
    const handleRefresh = () => {
        loadEventList(pagination.current, pagination.pageSize, selectedFaultCenter);
    };

    // 执行聚类分析
    const handleCluster = async (forceRefresh = false) => {
        if (selectedRowKeys.length === 0) {
            Modal.error({
                title: '提示',
                content: '请先选择至少一条告警',
            });
            return;
        }

        setClustering(true);
        try {
            const res = await RCACluster({
                alertIds: selectedRowKeys,
                topologyData: '',
                forceRefresh: forceRefresh,
                modelName: selectedModel || '',
            });
            if (res && res.data) {
                setClusterResult(res.data);
            } else {
                Modal.error({
                    title: '错误',
                    content: '聚类分析失败',
                });
            }
        } catch (error) {
            Modal.error({
                title: '错误',
                content: '聚类分析出错',
            });
        } finally {
            setClustering(false);
        }
    };

    // 提交反馈
    const handleSubmitFeedback = async (values) => {
        try {
            await RCACommitFeedback(clusterResult.suggestionId, {
                status: values.status || 'accepted',
                score: values.score || 3,
                comment: values.comment,
            });
            Modal.success({
                title: '成功',
                content: '反馈已提交',
            });
            setShowFeedbackModal(false);
            feedbackForm.resetFields();
        } catch (error) {
            Modal.error({
                title: '错误',
                content: '提交反馈失败',
            });
        }
    };

    // 初始化加载
    useEffect(() => {
        const initLoad = async () => {
            // 先加载故障中心
            const centers = await loadFaultCenterList();
            // 再加载事件列表，传入故障中心列表
            loadEventList(1, 10, '', centers);
        };
        initLoad();

        // 加载可用模型列表
        const loadModels = async () => {
            try {
                const res = await getSystemSetting();
                const aiConfig = res.data?.aiConfig || {};
                let providers = aiConfig.providers || {};

                // 数据兼容：旧格式适配
                if (!providers || Object.keys(providers).length === 0) {
                    if (aiConfig.provider && aiConfig.url) {
                        providers = {
                            [aiConfig.provider]: {
                                url: aiConfig.url,
                                appKey: aiConfig.appKey,
                                models: aiConfig.model ? [aiConfig.model] : [],
                            },
                        };
                    }
                }

                // 收集所有 Provider 的模型并去重
                const allModels = [];
                Object.values(providers).forEach((provider) => {
                    if (provider.models && Array.isArray(provider.models)) {
                        allModels.push(...provider.models);
                    }
                });
                const uniqueModels = [...new Set(allModels)];
                setModelList(
                    uniqueModels.map((model) => ({ label: model, value: model }))
                );
            } catch (error) {
                console.error('加载模型列表失败:', error);
            }
        };
        loadModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 创建表格列
    const alertColumns = createAlertColumns();
    const incidentColumns = createIncidentColumns(openDetail);

    // 过滤告警列表（本地过滤）- 使用 useMemo 避免无关状态变化时重建数组引用
    const filteredAlerts = useMemo(() => {
        if (!searchQuery) return eventList;
        const query = searchQuery.toLowerCase();
        return eventList.filter(item =>
            item.rule_name?.toLowerCase().includes(query) ||
            item.eventId?.toLowerCase().includes(query)
        );
    }, [eventList, searchQuery]);

    return (
        <div className="rca-container">
            {/* 搜索和筛选区域 */}
            <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedFaultCenter={selectedFaultCenter}
                setSelectedFaultCenter={setSelectedFaultCenter}
                faultCenterList={faultCenterList}
                onSearch={handleSearch}
                onReset={handleReset}
                onRefresh={handleRefresh}
            />

            {/* 第一步：选择告警 */}
            <div className="rca-card">
                <h3 className="rca-step-title">
                    第一步：选择告警
                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280' }}>
                        （共 {filteredAlerts.length} 条告警）
                    </span>
                </h3>

                <Table
                    columns={alertColumns}
                    dataSource={filteredAlerts}
                    loading={loadingEvents}
                    rowKey="eventId"
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showTotal: HandleShowTotal,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    onChange={handleTableChange}
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        overflow: 'hidden',
                    }}
                    scroll={{
                        y: height - 400,
                        x: 'max-content',
                    }}
                    locale={{
                        emptyText: <Empty description="暂无告警数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                    }}
                    rowSelection={{
                        onChange: (keys) => setSelectedRowKeys(keys),
                        selectedRowKeys: selectedRowKeys,
                    }}
                />

                <div className="rca-button-group">
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        已选择 {selectedRowKeys.length} 条告警
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Select
                            value={selectedModel}
                            onChange={setSelectedModel}
                            placeholder="默认模型"
                            allowClear
                            style={{ width: 200 }}
                            options={modelList}
                        />
                        <Button
                            type="primary"
                            size="large"
                            loading={clustering}
                            disabled={selectedRowKeys.length === 0}
                            onClick={() => handleCluster(false)}
                            icon={<BulbOutlined />}
                        >
                            开始聚类分析
                        </Button>
                    </div>
                </div>
            </div>

            {/* 第二步：查看分析结果 */}
            {clusterResult && (
                <div className="rca-card rca-fade-in">
                    <h3 className="rca-step-title">
                        第二步：查看分析结果
                        <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280' }}>
                            （{clusterResult.incidents?.length || 0} 个事件候选）
                        </span>
                    </h3>

                    {clusterResult.incidents && clusterResult.incidents.length > 0 && (
                        <Table
                            columns={incidentColumns}
                            dataSource={clusterResult.incidents}
                            rowKey="id"
                            pagination={{
                                pageSize: 10,
                                showTotal: HandleShowTotal,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50'],
                            }}
                            style={{
                                backgroundColor: '#fff',
                                borderRadius: '8px',
                                overflow: 'hidden',
                            }}
                            scroll={{
                                y: height - 400,
                                x: 'max-content',
                            }}
                            locale={{
                                emptyText: <Empty description="暂无聚类结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                            }}
                        />
                    )}

                    <Alert
                        message="聚类分析完成"
                        type="success"
                        className="rca-cluster-alert success"
                        description={`本次分析共识别出 ${clusterResult.incidents?.length || 0} 个事件候选，平均置信度 ${(
                            (clusterResult.incidents?.reduce((sum, i) => sum + i.confidenceScore, 0) /
                                (clusterResult.incidents?.length || 1)) *
                            100
                        ).toFixed(0)}%`}
                        showIcon
                        closable
                    />

                    <div className="rca-button-group" style={{ marginTop: 24 }}>
                        <Button
                            icon={<RedoOutlined />}
                            loading={clustering}
                            onClick={() => handleCluster(true)}
                        >
                            重新分析
                        </Button>
                        <Button
                            type="primary"
                            onClick={() => setShowFeedbackModal(true)}
                        >
                            提交分析反馈
                        </Button>
                    </div>
                </div>
            )}

            {/* 详情抽屉 */}
            <IncidentDetailDrawer
                visible={detailDrawerOpen}
                incident={selectedIncident}
                onClose={closeDetail}
            />

            {/* 反馈模态框 */}
            <Modal
                title="提交分析反馈"
                open={showFeedbackModal}
                onCancel={() => {
                    setShowFeedbackModal(false);
                    feedbackForm.resetFields();
                }}
                onOk={() => feedbackForm.submit()}
            >
                <Form
                    form={feedbackForm}
                    layout="vertical"
                    onFinish={handleSubmitFeedback}
                >
                    <Form.Item
                        label="态度"
                        name="status"
                        initialValue="accepted"
                    >
                        <Select
                            options={[
                                { label: '接受', value: 'accepted' },
                                { label: '拒绝', value: 'rejected' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        label="满意度评分"
                        name="score"
                        initialValue={3}
                    >
                        <Rate />
                    </Form.Item>
                    <Form.Item
                        label="备注"
                        name="comment"
                    >
                        <Input.TextArea rows={4} placeholder="请输入您的反馈意见" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default RCAPage;
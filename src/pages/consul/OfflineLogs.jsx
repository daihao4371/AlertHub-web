import { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Pagination,
    Popconfirm,
    Tooltip,
    message,
} from 'antd';
import { RedoOutlined } from '@ant-design/icons';
import {
    GetConsulOfflineLogs,
    ReRegisterConsulTarget,
    GetConsulTargets,
} from '../../api/consul';

/**
 * Consul 注销记录管理组件
 * 提供注销历史记录查看和重新上线功能
 */
export const OfflineLogs = ({ activeTab, onRefreshTargets }) => {
    const [offlineLogs, setOfflineLogs] = useState([]);
    const [offlineLogsLoading, setOfflineLogsLoading] = useState(false);
    const [offlineLogsTotal, setOfflineLogsTotal] = useState(0);
    const [offlineLogsPage, setOfflineLogsPage] = useState(1);
    const [offlineLogsPageSize, setOfflineLogsPageSize] = useState(20);

    // 获取注销记录列表
    const fetchOfflineLogs = async (page, size) => {
        setOfflineLogsLoading(true);
        try {
            const res = await GetConsulOfflineLogs({
                index: page,
                size: size,
            });
            if (res.code === 200 && res.data) {
                setOfflineLogs(res.data.list || []);
                setOfflineLogsTotal(res.data.total || 0);
            }
        } catch (error) {
            console.error('获取注销记录失败:', error);
            message.error('获取注销记录失败');
        } finally {
            setOfflineLogsLoading(false);
        }
    };

    // 重新上线
    const handleReRegister = async (log) => {
        try {
            // 从注销记录中获取目标ID，需要通过实例地址查找
            // 注意：注销的目标可能不在正常列表中，需要搜索所有目标（包括已注销的）
            // 但由于后端接口只返回未注销的目标，我们需要通过详情接口查找
            // 这里先尝试通过实例地址精确匹配查找
            const targetRes = await GetConsulTargets({
                keyword: log.instance,
                index: 1,
                size: 100, // 扩大搜索范围
            });
            
            let target = null;
            if (targetRes.code === 200 && targetRes.data && targetRes.data.list) {
                // 精确匹配实例地址
                target = targetRes.data.list.find(t => t.instance === log.instance);
            }
            
            if (target) {
                const res = await ReRegisterConsulTarget({ id: target.id });
                if (res.code === 200) {
                    message.success('目标已重新上线');
                    // 刷新注销记录列表，自动获取最新数据
                    fetchOfflineLogs(offlineLogsPage, offlineLogsPageSize);
                    // 如果提供了刷新目标列表的回调，调用它
                    if (onRefreshTargets) {
                        onRefreshTargets();
                    }
                } else {
                    message.error(res.message || '重新上线失败');
                }
            } else {
                message.warning('未找到对应的目标记录，可能已被删除。请先同步 Consul 目标，然后再尝试重新上线。');
            }
        } catch (error) {
            console.error('重新上线失败:', error);
            message.error('重新上线失败，请稍后重试');
        }
    };

    // 注销记录分页变化
    const handleOfflineLogsPageChange = (page, size) => {
        setOfflineLogsPage(page);
        setOfflineLogsPageSize(size);
        // 直接调用数据获取函数，确保数据立即刷新
        fetchOfflineLogs(page, size);
    };

    // 组件挂载时加载数据
    useEffect(() => {
        fetchOfflineLogs(offlineLogsPage, offlineLogsPageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 监听 activeTab 变化，当切换到注销记录标签页时自动刷新数据
    useEffect(() => {
        if (activeTab === 'offline-logs') {
            fetchOfflineLogs(offlineLogsPage, offlineLogsPageSize);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // 注销记录表格列定义
    const offlineLogsColumns = [
        {
            title: '实例地址',
            dataIndex: 'instance',
            key: 'instance',
            width: 200,
            ellipsis: true,
        },
        {
            title: 'Job',
            dataIndex: 'job',
            key: 'job',
            width: 150,
            ellipsis: true,
        },
        {
            title: '注销原因',
            dataIndex: 'reason',
            key: 'reason',
            width: 200,
            ellipsis: true,
        },
        {
            title: '操作人',
            dataIndex: 'deregisteredBy',
            key: 'deregisteredBy',
            width: 120,
            render: (text) => text || '-',
        },
        {
            title: '清理告警数',
            dataIndex: 'alertEventsCleared',
            key: 'alertEventsCleared',
            width: 100,
        },
        {
            title: '注销时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (text) => text ? new Date(text).toLocaleString() : '-',
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Tooltip title="重新上线">
                    <Popconfirm
                        title="确定要重新上线此目标吗？"
                        description="重新上线后，目标将重新注册到 Consul 并恢复监控"
                        onConfirm={() => handleReRegister(record)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            icon={<RedoOutlined />}
                            size="small"
                        >
                            重新上线
                        </Button>
                    </Popconfirm>
                </Tooltip>
            ),
        },
    ];

    return (
        <>
            {/* 注销记录列表 */}
            <div
                style={{
                    overflowX: 'auto',
                    marginTop: 10,
                    borderRadius: 6,
                }}
            >
                <Table
                    columns={offlineLogsColumns}
                    dataSource={offlineLogs}
                    rowKey="id"
                    loading={offlineLogsLoading}
                    pagination={false}
                    scroll={{
                        x: 'max-content',
                    }}
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        overflow: 'hidden',
                    }}
                />
            </div>
            <div
                style={{
                    width: '100%',
                    background: '#fff',
                    padding: '8px 0',
                    zIndex: 100,
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}
            >
                <Pagination
                    size="small"
                    current={offlineLogsPage}
                    pageSize={offlineLogsPageSize}
                    total={offlineLogsTotal}
                    showTotal={(total) => `共 ${total} 条`}
                    pageSizeOptions={['10', '20', '50', '100']}
                    showSizeChanger
                    showQuickJumper
                    onChange={handleOfflineLogsPageChange}
                    onShowSizeChange={handleOfflineLogsPageChange}
                />
            </div>
        </>
    );
};

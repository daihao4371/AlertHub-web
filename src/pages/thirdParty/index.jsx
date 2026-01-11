import React, { useState, useEffect } from 'react';
import { Tabs, Table, Tag, Space, Input, Select, Button, message, Popconfirm } from 'antd';
import { getWebhookList, deleteWebhook } from '../../api/thirdPartyWebhook';
import { getThirdPartyAlertList } from '../../api/thirdPartyAlert';
import { HandleShowTotal } from '../../utils/lib';
import { DeleteOutlined, PlusOutlined, EditOutlined, CopyOutlined, FileTextOutlined } from '@ant-design/icons';
import { WebhookModal } from './WebhookModal';
import { WebhookDocModal } from './WebhookDoc';
import './index.css';

const { Search } = Input;
const { Option } = Select;

// 告警等级映射配置（与通知记录保持一致）
const SEVERITY_MAP = {
    P0: {
        text: "P0",
        style: {
            background: "linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(255, 77, 79, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
    P1: {
        text: "P1",
        style: {
            background: "linear-gradient(135deg, #ffb84d 0%, #faad14 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(250, 173, 20, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
    P2: {
        text: "P2",
        style: {
            background: "linear-gradient(135deg, #91d5ff 0%, #69c0ff 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(105, 192, 255, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
};

// 处理状态映射配置（与通知记录状态样式保持一致）
const PROCESS_STATUS_MAP = {
    success: {
        text: "成功",
        style: {
            background: "linear-gradient(135deg, #73d13d 0%, #52c41a 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(82, 196, 26, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
    failed: {
        text: "失败",
        style: {
            background: "linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(255, 77, 79, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
    pending: {
        text: "待处理",
        style: {
            background: "linear-gradient(135deg, #ffb84d 0%, #faad14 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(250, 173, 20, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
};

// 告警状态映射配置
const ALERT_STATUS_MAP = {
    firing: {
        text: "触发中",
        style: {
            background: "linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(255, 77, 79, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
    resolved: {
        text: "已恢复",
        style: {
            background: "linear-gradient(135deg, #73d13d 0%, #52c41a 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(82, 196, 26, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
};

// Webhook配置列表组件
const WebhookList = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [searchParams, setSearchParams] = useState({
        query: '',
        source: '',
        status: '',
    });
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState('create');
    const [selectedRow, setSelectedRow] = useState(null);
    const [copiedId, setCopiedId] = useState(null); // 跟踪哪个URL被复制了
    const [docVisible, setDocVisible] = useState(false); // 文档弹窗状态
    const [docWebhookUrl, setDocWebhookUrl] = useState(''); // 当前查看文档的 Webhook URL

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            width: 200,
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            width: 200,
        },
        {
            title: '来源系统',
            dataIndex: 'source',
            key: 'source',
            width: 150,
        },
        {
            title: 'Webhook URL',
            dataIndex: 'webhookUrl',
            key: 'webhookUrl',
            width: 400,
            render: (text, record) => {
                // 拼接完整URL
                const fullUrl = `${window.location.protocol}//${window.location.host}${text}`;
                const isCopied = copiedId === record.id;

                const handleCopy = async () => {
                    // 使用 Clipboard API 或降级方案
                    try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(fullUrl);
                        } else {
                            // 降级方案
                            const textArea = document.createElement('textarea');
                            textArea.value = fullUrl;
                            textArea.style.position = 'fixed';
                            textArea.style.top = '0';
                            textArea.style.left = '0';
                            textArea.style.opacity = '0';
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                        }

                        // 设置已复制状态
                        setCopiedId(record.id);

                        // 2秒后恢复
                        setTimeout(() => {
                            setCopiedId(null);
                        }, 2000);
                    } catch (err) {
                        console.error('复制失败:', err);
                    }
                };

                return (
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <code style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                            maxWidth: '280px'
                        }}>
                            {fullUrl}
                        </code>
                        <div
                            onClick={handleCopy}
                            style={{
                                cursor: 'pointer',
                                padding: '4px 12px',
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: isCopied ? '#52c41a' : '#666',
                                backgroundColor: isCopied ? '#f6ffed' : '#fff',
                                transition: 'all 0.3s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {isCopied ? (
                                <>
                                    <span>✓</span>
                                    <span>已复制</span>
                                </>
                            ) : (
                                <>
                                    <CopyOutlined />
                                    <span>复制</span>
                                </>
                            )}
                        </div>
                    </Space>
                );
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => (
                <div className="status-container">
                    <div
                        className={`status-dot ${status === 'active' ? 'status-enabled' : 'status-disabled'}`}
                    />
                    <span>{status === 'active' ? '启用' : '禁用'}</span>
                </div>
            ),
        },
        {
            title: '调用次数',
            dataIndex: 'callCount',
            key: 'callCount',
            width: 100,
        },
        {
            title: '最后调用时间',
            dataIndex: 'lastCallAt',
            key: 'lastCallAt',
            width: 180,
            render: (time) => (time ? new Date(time * 1000).toLocaleString() : '-'),
        },
        {
            title: '操作',
            key: 'action',
            width: 200,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<FileTextOutlined />}
                        onClick={() => {
                            const fullUrl = `${window.location.protocol}//${window.location.host}${record.webhookUrl}`;
                            setDocWebhookUrl(fullUrl);
                            setDocVisible(true);
                        }}
                    >
                        文档
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setSelectedRow(record);
                            setModalType('update');
                            setModalVisible(true);
                        }}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定要删除这个Webhook配置吗？"
                        description="删除后无法恢复，关联的告警记录将保留"
                        onConfirm={async () => {
                            try {
                                await deleteWebhook({ id: record.id });
                                handleList();
                            } catch (error) {
                                console.error('删除失败:', error);
                            }
                        }}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const handleList = async () => {
        setLoading(true);
        try {
            const params = {
                index: pagination.current,
                size: pagination.pageSize,
                ...searchParams,
            };
            const res = await getWebhookList(params);
            if (res && res.data) {
                setList(res.data.list || []);
                setPagination({
                    ...pagination,
                    total: res.data.total || 0,
                });
            }
        } catch (error) {
            console.error('获取Webhook列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.current, pagination.pageSize, searchParams]);

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Search
                    placeholder="搜索名称或描述"
                    allowClear
                    style={{ width: 200 }}
                    onSearch={(value) => {
                        setSearchParams({ ...searchParams, query: value });
                        setPagination({ ...pagination, current: 1 });
                    }}
                />
                <Select
                    placeholder="来源系统"
                    allowClear
                    style={{ width: 150 }}
                    onChange={(value) => {
                        setSearchParams({ ...searchParams, source: value || '' });
                        setPagination({ ...pagination, current: 1 });
                    }}
                >
                    <Option value="prometheus">Prometheus</Option>
                    <Option value="grafana">Grafana</Option>
                    <Option value="zabbix">Zabbix</Option>
                    <Option value="other">其他</Option>
                </Select>
                <Select
                    placeholder="状态"
                    allowClear
                    style={{ width: 120 }}
                    onChange={(value) => {
                        setSearchParams({ ...searchParams, status: value || '' });
                        setPagination({ ...pagination, current: 1 });
                        setTimeout(handleList, 100);
                    }}
                >
                    <Option value="active">启用</Option>
                    <Option value="disabled">禁用</Option>
                </Select>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setSelectedRow(null);
                        setModalType('create');
                        setModalVisible(true);
                    }}
                >
                    创建Webhook
                </Button>
                <Button
                    icon={<FileTextOutlined />}
                    onClick={() => {
                        setDocWebhookUrl('');
                        setDocVisible(true);
                    }}
                >
                    接入文档
                </Button>
            </Space>
            <Table
                columns={columns}
                dataSource={list}
                rowKey="id"
                loading={loading}
                pagination={{
                    ...pagination,
                    showTotal: HandleShowTotal,
                }}
                onChange={handleTableChange}
                scroll={{ x: 1500 }}
            />
            <WebhookModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedRow(null);
                }}
                selectedRow={selectedRow}
                type={modalType}
                handleList={handleList}
            />
            <WebhookDocModal
                visible={docVisible}
                onClose={() => setDocVisible(false)}
                webhookUrl={docWebhookUrl}
            />
        </div>
    );
};

// 第三方告警列表组件
const ThirdPartyAlertList = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [searchParams, setSearchParams] = useState({
        webhookId: '',
        processStatus: '',
        status: '',
    });

    const columns = [
        {
            title: '告警ID',
            dataIndex: 'alertId',
            key: 'alertId',
            width: 150,
        },
        {
            title: '标题',
            dataIndex: 'title',
            key: 'title',
            width: 200,
        },
        {
            title: '来源系统',
            dataIndex: 'source',
            key: 'source',
            width: 120,
        },
        {
            title: '告警等级',
            dataIndex: 'severity',
            key: 'severity',
            width: 100,
            render: (severity) => {
                const severityInfo = SEVERITY_MAP[severity];
                return (
                    <Tag style={severityInfo?.style || {}}>
                        {severityInfo?.text || severity || 'P2'}
                    </Tag>
                );
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => {
                const statusInfo = ALERT_STATUS_MAP[status];
                return (
                    <Tag style={statusInfo?.style || {}}>
                        {statusInfo?.text || status}
                    </Tag>
                );
            },
        },
        {
            title: '处理状态',
            dataIndex: 'processStatus',
            key: 'processStatus',
            width: 120,
            render: (status) => {
                const statusInfo = PROCESS_STATUS_MAP[status || 'pending'];
                return (
                    <Tag style={statusInfo?.style || {}}>
                        {statusInfo?.text || status || '待处理'}
                    </Tag>
                );
            },
        },
        {
            title: '主机',
            dataIndex: 'host',
            key: 'host',
            width: 150,
        },
        {
            title: '服务',
            dataIndex: 'service',
            key: 'service',
            width: 150,
        },
        {
            title: '接收时间',
            dataIndex: 'processTime',
            key: 'processTime',
            width: 180,
            render: (time) => (time ? new Date(time * 1000).toLocaleString() : '-'),
        },
    ];

    const handleList = async () => {
        setLoading(true);
        try {
            const params = {
                index: pagination.current,
                size: pagination.pageSize,
                ...searchParams,
            };
            const res = await getThirdPartyAlertList(params);
            if (res && res.data) {
                setList(res.data.list || []);
                setPagination({
                    ...pagination,
                    total: res.data.total || 0,
                });
            }
        } catch (error) {
            console.error('获取第三方告警列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.current, pagination.pageSize, searchParams]);

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Select
                    placeholder="处理状态"
                    allowClear
                    style={{ width: 150 }}
                    onChange={(value) => {
                        setSearchParams({ ...searchParams, processStatus: value || '' });
                        setPagination({ ...pagination, current: 1 });
                        setTimeout(handleList, 100);
                    }}
                >
                    <Option value="success">成功</Option>
                    <Option value="failed">失败</Option>
                    <Option value="pending">待处理</Option>
                </Select>
                <Select
                    placeholder="告警状态"
                    allowClear
                    style={{ width: 120 }}
                    onChange={(value) => {
                        setSearchParams({ ...searchParams, status: value || '' });
                        setPagination({ ...pagination, current: 1 });
                        setTimeout(handleList, 100);
                    }}
                >
                    <Option value="firing">触发中</Option>
                    <Option value="resolved">已恢复</Option>
                </Select>
            </Space>
            <Table
                columns={columns}
                dataSource={list}
                rowKey="id"
                loading={loading}
                pagination={{
                    ...pagination,
                    showTotal: HandleShowTotal,
                }}
                onChange={handleTableChange}
                scroll={{ x: 1200 }}
            />
        </div>
    );
};

// 主组件
export const ThirdPartyAlert = () => {
    const items = [
        {
            key: 'webhook',
            label: 'Webhook配置',
            children: <WebhookList />,
        },
        {
            key: 'alerts',
            label: '第三方告警',
            children: <ThirdPartyAlertList />,
        },
    ];

    return <Tabs items={items} />;
};

import { Table, Button, Card, Space, Tag, Input, message, Modal, Form, Select, Alert, Tree, Tabs } from 'antd';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getApiPermissions, 
    getRolePermissions, 
    setRolePermissions, 
    removeRolePermissions,
    getUserPermissions,
    checkPermission,
    initDefaultPermissions
} from '../../../api/casbinPermission';
import { getUserRoles, checkUserPermission } from '../../../api/role';
import { SearchOutlined, ReloadOutlined, SafetyOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Option } = Select;

/**
 * 权限管理页面
 * 实现所有 Casbin 权限管理和用户角色权限相关的功能
 */
export const PermissionManagement = () => {
    const [apiList, setApiList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [checkModalVisible, setCheckModalVisible] = useState(false);
    const [checkResult, setCheckResult] = useState(null);
    const [initModalVisible, setInitModalVisible] = useState(false);
    const [checkedKeys, setCheckedKeys] = useState([]); // 选中的 API 节点
    const [expandedKeys, setExpandedKeys] = useState([]); // 展开的节点

    // 加载所有 API 权限列表
    const loadApiList = async () => {
        setLoading(true);
        try {
            const res = await getApiPermissions();
            if (res && res.data && Array.isArray(res.data)) {
                setApiList(res.data);
            } else {
                setApiList([]);
                if (res.code === 403) {
                    message.warning('无权限查看 API 权限列表');
                }
            }
        } catch (error) {
            console.error('获取 API 权限列表失败:', error);
            message.error('获取 API 权限列表失败');
            setApiList([]);
        } finally {
            setLoading(false);
        }
    };

    // 初始化默认权限
    const handleInitPermissions = async (values) => {
        try {
            const res = await initDefaultPermissions({ force: values.force || false });
            if (res && res.code === 200) {
                message.success('默认权限初始化成功');
                setInitModalVisible(false);
                loadApiList();
            } else {
                message.error(res?.message || '初始化默认权限失败');
            }
        } catch (error) {
            console.error('初始化默认权限失败:', error);
            message.error('初始化默认权限失败');
        }
    };

    useEffect(() => {
        loadApiList();
    }, []);

    // 将 API 列表转换为树形结构数据（用于可选择的树形展示）
    const treeData = useMemo(() => {
        if (!apiList || apiList.length === 0) {
            return [];
        }

        // 按分组归类 API
        const groupMap = new Map();
        apiList.forEach(api => {
            const group = api.apiGroup || '未分组';
            if (!groupMap.has(group)) {
                groupMap.set(group, []);
            }
            groupMap.get(group).push(api);
        });

        // 转换为树形结构
        const treeNodes = [];
        groupMap.forEach((apis, groupName) => {
            const children = apis.map(api => ({
                title: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Tag color={
                            api.method === 'GET' ? 'blue' : 
                            api.method === 'POST' ? 'green' : 
                            api.method === 'PUT' ? 'orange' : 
                            api.method === 'DELETE' ? 'red' : 
                            api.method === 'PATCH' ? 'purple' : 'default'
                        }>
                            {api.method}
                        </Tag>
                        <span style={{ fontWeight: 500, color: '#1890ff', marginRight: '8px' }}>
                            {api.path}
                        </span>
                        {api.description && (
                            <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                                {api.description}
                            </span>
                        )}
                    </div>
                ),
                key: `api-${api.id}`,
                isLeaf: true,
                apiData: api,
            }));

            treeNodes.push({
                title: (
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>
                        {groupName}
                        <span style={{ marginLeft: '8px', color: '#8c8c8c', fontSize: '12px', fontWeight: 400 }}>
                            ({apis.length})
                        </span>
                    </span>
                ),
                key: `group-${groupName}`,
                children: children,
            });
        });

        // 按分组名称排序
        treeNodes.sort((a, b) => {
            const aName = a.key.replace('group-', '');
            const bName = b.key.replace('group-', '');
            return aName.localeCompare(bName, 'zh-CN');
        });

        return treeNodes;
    }, [apiList]);

    // 处理树节点选择变化
    const onCheck = (checkedKeysValue, info) => {
        // 只保留 API 节点的 key（过滤掉 group 节点的 key）
        const apiKeys = checkedKeysValue.filter(key => key.toString().startsWith('api-'));
        setCheckedKeys(apiKeys);
    };

    // 处理树节点展开/收起
    const onExpand = (expandedKeysValue) => {
        setExpandedKeys(expandedKeysValue);
    };

    // 全选/取消全选
    const handleSelectAll = () => {
        if (checkedKeys.length === apiList.length) {
            // 取消全选
            setCheckedKeys([]);
        } else {
            // 全选所有 API
            const allApiKeys = apiList.map(api => `api-${api.id}`);
            setCheckedKeys(allApiKeys);
        }
    };

    // 表格列定义
    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'API 路径',
            dataIndex: 'path',
            key: 'path',
            width: '30%',
        },
        {
            title: 'HTTP 方法',
            dataIndex: 'method',
            key: 'method',
            width: '15%',
            render: (method) => {
                const colors = {
                    'GET': 'blue',
                    'POST': 'green',
                    'PUT': 'orange',
                    'DELETE': 'red',
                    'PATCH': 'purple',
                };
                return (
                    <Tag color={colors[method] || 'default'}>
                        {method}
                    </Tag>
                );
            },
        },
        {
            title: 'API 分组',
            dataIndex: 'apiGroup',
            key: 'apiGroup',
            width: '20%',
            render: (text) => text || '-',
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            width: '25%',
            render: (text) => text || '-',
        },
        {
            title: '状态',
            dataIndex: 'enabled',
            key: 'enabled',
            width: '10%',
            render: (enabled) => (
                <Tag color={enabled ? 'green' : 'red'}>
                    {enabled ? '启用' : '禁用'}
                </Tag>
            ),
        },
    ];

    return (
        <div>
            {/* API 树形选择展示 */}
            <Card
                title={
                    <Space>
                        <SafetyOutlined />
                        <span>API 权限树形选择</span>
                        <span style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 400 }}>
                            （已选择 {checkedKeys.length} / {apiList.length} 个 API）
                        </span>
                    </Space>
                }
                extra={
                    <Space>
                        <Button
                            onClick={handleSelectAll}
                            disabled={apiList.length === 0}
                        >
                            {checkedKeys.length === apiList.length ? '取消全选' : '全选'}
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={loadApiList}
                            loading={loading}
                        >
                            刷新
                        </Button>
                    </Space>
                }
                style={{ marginBottom: 16 }}
            >
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        加载中...
                    </div>
                ) : treeData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        暂无 API 数据
                    </div>
                ) : (
                    <div style={{ 
                        maxHeight: '60vh', 
                        overflowY: 'auto',
                        padding: '16px',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0'
                    }}>
                        <Tree
                            checkable
                            showLine={{ showLeafIcon: false }}
                            checkedKeys={checkedKeys}
                            expandedKeys={expandedKeys}
                            onCheck={onCheck}
                            onExpand={onExpand}
                            treeData={treeData}
                            style={{
                                backgroundColor: 'transparent',
                            }}
                            checkStrictly={false}
                        />
                    </div>
                )}
            </Card>

            {/* API 权限列表表格 */}
            <Card
                title={
                    <Space>
                        <SafetyOutlined />
                        <span>API 权限列表</span>
                    </Space>
                }
                extra={
                    <Space>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={loadApiList}
                            loading={loading}
                        >
                            刷新
                        </Button>
                        <Button
                            type="primary"
                            onClick={() => setInitModalVisible(true)}
                        >
                            初始化默认权限
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={apiList}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条`,
                    }}
                />
            </Card>

            {/* 初始化默认权限弹窗 */}
            <Modal
                title="初始化默认权限"
                visible={initModalVisible}
                onCancel={() => setInitModalVisible(false)}
                onOk={() => {
                    const form = document.querySelector('form');
                    if (form) {
                        form.requestSubmit();
                    }
                }}
                okText="确定"
                cancelText="取消"
            >
                <Alert
                    message="注意"
                    description="初始化默认权限将为 admin 角色分配所有权限。如果选择强制初始化，将清除现有权限配置。"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                <Form onFinish={handleInitPermissions}>
                    <Form.Item
                        name="force"
                        label="强制初始化"
                        valuePropName="checked"
                        initialValue={false}
                    >
                        <Select>
                            <Option value={false}>否（保留现有配置）</Option>
                            <Option value={true}>是（清除现有配置）</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};


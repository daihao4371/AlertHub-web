import { Table, Button, Card, Space, Tag, Input, message, Modal, Form, Select, Alert } from 'antd';
import React, { useState, useEffect } from 'react';
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
            <Card
                title={
                    <Space>
                        <SafetyOutlined />
                        <span>API 权限管理</span>
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


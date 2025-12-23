import {Table, Button, Popconfirm, Tooltip, Space, Modal, Tag, message} from 'antd';
import React, { useState, useEffect } from 'react';
import UserRoleCreateModal from './UserRoleCreateModal';
import { deleteRole, getRoleList, getRolePermissions } from '../../../api/role';
import {CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined, EyeOutlined} from "@ant-design/icons";
import {HandleShowTotal} from "../../../utils/lib";
import {copyToClipboard} from "../../../utils/copyToClipboard";

export const UserRole = () => {
    const [selectedRow, setSelectedRow] = useState(null);
    const [updateVisible, setUpdateVisible] = useState(false);
    const [visible, setVisible] = useState(false);
    const [list, setList] = useState([]);
    const [permissionVisible, setPermissionVisible] = useState(false);
    const [rolePermissions, setRolePermissions] = useState([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    // 表头
    const columns = [
        {
            title: '角色名称',
            dataIndex: 'name',
            key: 'name',
            width: 'auto',
            render: (text, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {text}
                    <Tooltip title="点击复制 ID">
                        <span
                            style={{
                                color: '#8c8c8c',     // 灰色字体
                                fontSize: '12px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'inline-block',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                            onClick={() => copyToClipboard(record.id)}
                        >
                            {record.id}
                            <CopyOutlined style={{ marginLeft: 8 }} />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            width: 'auto',
            render: (text) => (!text ? '-' : text),
        },
        {
            title: "更新时间",
            dataIndex: "updateAt",
            key: "updateAt",
            width: "auto",
            render: (text) => {
                const date = new Date(text * 1000)
                    return (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{date.toLocaleString()}</span>
                        </div>
                    )
            },
        },
        {
            title: '操作',
            dataIndex: 'operation',
            fixed: 'right',
            width: 180,
            render: (_, record) =>
                list.length >= 1 ? (
                    <Space size="middle">
                        <Tooltip title="查看权限">
                            <Button
                                type="text"
                                icon={<EyeOutlined />}
                                onClick={() => handleViewPermissions(record)}
                                style={{ color: "#1677ff" }}
                            />
                        </Tooltip>
                        <Tooltip title="更新">
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => handleUpdateModalOpen(record)}
                                style={{ color: "#1677ff" }}
                            />
                        </Tooltip>
                        <Tooltip title="删除">
                            <Popconfirm
                                title="确定要删除此角色吗?"
                                onConfirm={() => handleDelete(record)}
                                okText="确定"
                                cancelText="取消"
                                placement="left"
                            >
                                <Button type="text" icon={<DeleteOutlined />} style={{ color: "#ff4d4f" }} />
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                ) : null,
        },
    ];

    const [height, setHeight] = useState(window.innerHeight);

    useEffect(() => {
        // 定义一个处理窗口大小变化的函数
        const handleResize = () => {
            setHeight(window.innerHeight);
        };

        // 监听窗口的resize事件
        window.addEventListener('resize', handleResize);

        // 在组件卸载时移除监听器
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleList = async () => {
        try {
            const res = await getRoleList();
            // 修复：添加空值检查
            if (res && res.data && Array.isArray(res.data)) {
                setList(res.data);
            } else {
                setList([]);
            }
        } catch (error) {
            console.error('获取角色列表失败:', error);
            message.error('获取角色列表失败');
            setList([]);
        }
    };

    const handleDelete = async (record) => {
        const params = {
            id: record.id,
        };
        await deleteRole(params);
        handleList();
    };

    const handleModalClose = () => {
        setVisible(false);
    };

    const handleUpdateModalClose = () => {
        setUpdateVisible(false);
    };

    const handleUpdateModalOpen = (record) => {
        setSelectedRow(record);
        setUpdateVisible(true);
    };

    // 查看角色权限
    const handleViewPermissions = async (record) => {
        setSelectedRow(record);
        setPermissionVisible(true);
        setLoadingPermissions(true);
        
        try {
            const res = await getRolePermissions({ roleId: record.id });
            
            // 检查权限错误
            if (res.code === 403) {
                message.warning('无权限查看角色权限');
                setRolePermissions([]);
                return;
            }
            
            // 处理权限数据
            if (res && res.data && Array.isArray(res.data)) {
                setRolePermissions(res.data);
            } else {
                setRolePermissions([]);
            }
        } catch (error) {
            console.error('获取角色权限失败:', error);
            message.error('获取角色权限失败');
            setRolePermissions([]);
        } finally {
            setLoadingPermissions(false);
        }
    };

    useEffect(() => {
        handleList();
    }, []);

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    type="primary"
                    onClick={() => setVisible(true)}
                    icon={<PlusOutlined />}
                >
                    创建
                </Button>
            </div>

            <UserRoleCreateModal visible={visible} onClose={handleModalClose} type="create" handleList={handleList} />

            <UserRoleCreateModal
                visible={updateVisible}
                onClose={handleUpdateModalClose}
                selectedRow={selectedRow}
                type="update"
                handleList={handleList}
            />

            <div style={{ overflowX: 'auto', marginTop: 10, height: '65vh' }}>
                <Table
                    columns={columns}
                    dataSource={list}
                    scroll={{
                        y: height - 280, // 动态设置滚动高度
                        x: 'max-content', // 水平滚动
                    }}
                    style={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        overflow: "hidden",
                    }}
                    pagination={{
                        showTotal: HandleShowTotal,
                        pageSizeOptions: ['10'],
                    }}
                    rowKey={(record) => record.id} // 设置行唯一键
                />
            </div>

            {/* 查看权限弹窗 */}
            <Modal
                title={`查看角色权限 - ${selectedRow?.name || ''}`}
                visible={permissionVisible}
                onCancel={() => {
                    setPermissionVisible(false);
                    setRolePermissions([]);
                }}
                footer={[
                    <Button key="close" onClick={() => {
                        setPermissionVisible(false);
                        setRolePermissions([]);
                    }}>
                        关闭
                    </Button>
                ]}
                width={800}
            >
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {loadingPermissions ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            加载中...
                        </div>
                    ) : rolePermissions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            该角色暂无权限
                        </div>
                    ) : (
                        <Table
                            columns={[
                                {
                                    title: 'API 路径',
                                    dataIndex: 'path',
                                    key: 'path',
                                    width: '40%',
                                },
                                {
                                    title: 'HTTP 方法',
                                    dataIndex: 'method',
                                    key: 'method',
                                    width: '15%',
                                    render: (method) => (
                                        <Tag color={method === 'GET' ? 'blue' : method === 'POST' ? 'green' : method === 'PUT' ? 'orange' : 'red'}>
                                            {method}
                                        </Tag>
                                    ),
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
                            ]}
                            dataSource={rolePermissions}
                            pagination={false}
                            rowKey={(record) => `${record.path}-${record.method}`}
                            size="small"
                        />
                    )}
                </div>
            </Modal>
        </>
    );
};
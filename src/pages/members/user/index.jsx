import {Input, Table, Button, Popconfirm, Tooltip, Space, message} from 'antd';
import React, { useState, useEffect } from 'react';
import UserCreateModal from './UserCreateModal';
import UserChangePass from './UserChangePass';
import { deleteUser, getUserList } from '../../../api/user';
import { getUserRoles } from '../../../api/role';
import { getUserPermissions } from '../../../api/casbinPermission';
import {CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SafetyOutlined} from "@ant-design/icons";
import {HandleShowTotal} from "../../../utils/lib";
import {copyToClipboard} from "../../../utils/copyToClipboard";
import { PermissionViewModal, enrichPermissionsWithGroups } from '../../../components/PermissionViewModal';

const { Search } = Input;

export const User = () => {
    const [selectedRow, setSelectedRow] = useState(null); // 当前选中行
    const [updateVisible, setUpdateVisible] = useState(false); // 更新弹窗可见性
    const [changeVisible, setChangeVisible] = useState(false); // 修改密码弹窗可见性
    const [visible, setVisible] = useState(false); // 创建弹窗可见性
    const [list, setList] = useState([]); // 用户列表
    const [height, setHeight] = useState(window.innerHeight); // 动态表格高度
    const [permissionVisible, setPermissionVisible] = useState(false); // 权限查看弹窗可见性
    const [userRoles, setUserRoles] = useState([]); // 用户角色列表
    const [userPermissions, setUserPermissions] = useState([]); // 用户权限列表
    const [loadingPermissions, setLoadingPermissions] = useState(false); // 加载权限状态

    // 表格列定义
    const columns = [
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
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
                            onClick={() => copyToClipboard(record.userid)}
                        >
                            {record.userid}
                            <CopyOutlined style={{ marginLeft: 8 }} />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
        {
            title: '真实姓名',
            dataIndex: 'realName',
            key: 'realName',
            render: (text) => text || '-',
        },
        {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email',
            render: (text) => text || '-',
        },
        {
            title: '手机号',
            dataIndex: 'phone',
            key: 'phone',
            render: (text) => text || '-',
        },
        {
            title: '创建人',
            dataIndex: 'create_by',
            key: 'create_by',
        },
        {
            title: '创建时间',
            dataIndex: 'create_at',
            key: 'create_at',
            render: (text) => new Date(text * 1000).toLocaleString(),
        },
        {
            title: '操作',
            dataIndex: 'operation',
            fixed: 'right',
            width: 250,
            render: (_, record) => (
                list.length >= 1 && (
                    <div>
                        <Button
                            type="link"
                            onClick={() => openChangePassModal(record)}
                            disabled={record.create_by === 'LDAP'}
                        >
                            重置密码
                        </Button>
                        <Space size="middle">
                            <Tooltip title="查看权限">
                                <Button
                                    type="text"
                                    icon={<SafetyOutlined />}
                                    onClick={() => handleViewUserPermissions(record)}
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
                                    title="确定要删除此用户吗?"
                                    onConfirm={() => handleDelete(record)}
                                    okText="确定"
                                    cancelText="取消"
                                    placement="left"
                                >
                                    <Button type="text" icon={<DeleteOutlined />} style={{ color: "#ff4d4f" }} />
                                </Popconfirm>
                            </Tooltip>
                        </Space>
                    </div>
                )
            ),
        },
    ];

    // 动态调整表格高度
    useEffect(() => {
        const handleResize = () => setHeight(window.innerHeight);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 加载用户列表
    const handleList = async () => {
        try {
            const res = await getUserList();
            setList(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    // 删除用户
    const handleDelete = async (record) => {
        try {
            await deleteUser({ userid: record.userid });
            handleList();
        } catch (error) {
            console.error(error);
        }
    };

    // 打开更新用户弹窗
    const handleUpdateModalOpen = (record) => {
        setSelectedRow(record);
        setUpdateVisible(true);
    };

    // 打开重置密码弹窗
    const openChangePassModal = (record) => {
        setSelectedRow(record); // 动态绑定当前选中用户
        setChangeVisible(true);
    };

    // 查看用户权限
    const handleViewUserPermissions = async (record) => {
        setSelectedRow(record);
        setPermissionVisible(true);
        setLoadingPermissions(true);
        setUserRoles([]);
        setUserPermissions([]);
        
        try {
            // 获取用户角色列表
            const rolesRes = await getUserRoles({ userId: record.userid });
            console.log('获取用户角色响应:', rolesRes);
            
            // 处理角色数据
            if (rolesRes) {
                // 检查是否有错误码
                if (rolesRes.code === 403) {
                    message.warning('无权限查看用户角色');
                    setUserRoles([]);
                } else if (rolesRes.code && rolesRes.code !== 200) {
                    message.warning(rolesRes.message || rolesRes.msg || '获取用户角色失败');
                    setUserRoles([]);
                } else if (rolesRes.data !== undefined) {
                    // 确保 data 是数组
                    let rolesData = [];
                    if (Array.isArray(rolesRes.data)) {
                        rolesData = rolesRes.data;
                    } else if (rolesRes.data && typeof rolesRes.data === 'object') {
                        // 如果 data 是单个对象，转换为数组
                        rolesData = [rolesRes.data];
                    }
                    
                    // 处理 enabled 字段，确保是布尔值
                    rolesData = rolesData.map(role => ({
                        ...role,
                        enabled: role.enabled !== null && role.enabled !== undefined 
                            ? (typeof role.enabled === 'boolean' ? role.enabled : Boolean(role.enabled))
                            : true // 默认启用
                    }));
                    
                    console.log('处理后的用户角色数据:', rolesData);
                    setUserRoles(rolesData);
                    
                    if (rolesData.length === 0) {
                        console.log('用户角色列表为空，原始响应:', rolesRes);
                    }
                } else {
                    // 如果返回格式不符合预期，尝试直接使用 res
                    const rolesData = Array.isArray(rolesRes) ? rolesRes : [];
                    console.log('使用备用方式处理角色数据:', rolesData);
                    setUserRoles(rolesData);
                }
            } else {
                console.log('角色响应为空');
                setUserRoles([]);
            }
            
            // 获取用户权限列表（Casbin 方式）
            const permsRes = await getUserPermissions({ userId: record.userid });
            console.log('获取用户权限响应:', permsRes);
            
            // 处理权限数据
            if (permsRes) {
                // 检查是否有错误码
                if (permsRes.code === 403) {
                    message.warning('无权限查看用户权限');
                    setUserPermissions([]);
                } else if (permsRes.code && permsRes.code !== 200) {
                    message.warning(permsRes.message || '获取用户权限失败');
                    setUserPermissions([]);
                } else if (permsRes.data) {
                    // 确保 data 是数组
                    let permsData = Array.isArray(permsRes.data) ? permsRes.data : [];
                    
                    // 使用公共函数补充分组信息
                    permsData = await enrichPermissionsWithGroups(permsData);
                    
                    setUserPermissions(permsData);
                    
                    if (permsData.length === 0) {
                        console.log('用户权限列表为空');
                    }
                } else {
                    // 如果返回格式不符合预期，尝试直接使用 res
                    const permsData = Array.isArray(permsRes) ? permsRes : [];
                    setUserPermissions(permsData);
                }
            } else {
                setUserPermissions([]);
            }
        } catch (error) {
            console.error('获取用户权限失败:', error);
            // 区分不同类型的错误
            if (error?.response?.status === 403) {
                message.warning('无权限查看用户权限信息');
            } else if (error?.response?.status === 404) {
                message.warning('用户不存在或接口未找到');
            } else {
                message.error('获取用户权限失败: ' + (error?.message || '未知错误'));
            }
            // 确保设置空数组，避免显示错误
            setUserRoles([]);
            setUserPermissions([]);
        } finally {
            setLoadingPermissions(false);
        }
    };

    // 刷新权限数据
    const handleRefreshPermissions = async () => {
        if (!selectedRow) return;
        await handleViewUserPermissions(selectedRow);
    };

    // 搜索用户
    const onSearch = async (value) => {
        try {
            const params = {
                query: value
            }
            const res = await getUserList(params)
            setList(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    // 初始化加载用户列表
    useEffect(() => {
        handleList();
    }, []);

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Search
                    allowClear
                    placeholder="输入搜索关键字"
                    onSearch={onSearch}
                    style={{ width: 300 }}
                />
                <Button
                    type="primary"
                    onClick={() => setVisible(true)}
                    icon={<PlusOutlined />}
                >
                    创建
                </Button>
            </div>

            {/* 用户创建弹窗 */}
            <UserCreateModal
                visible={visible}
                onClose={() => setVisible(false)}
                type="create"
                handleList={handleList}
            />

            {/* 用户更新弹窗 */}
            <UserCreateModal
                visible={updateVisible}
                onClose={() => setUpdateVisible(false)}
                selectedRow={selectedRow}
                type="update"
                handleList={handleList}
            />

            {/* 重置密码弹窗 */}
            {selectedRow && (
                <UserChangePass
                    visible={changeVisible}
                    onClose={() => setChangeVisible(false)}
                    userid={selectedRow.userid}
                    username={selectedRow.username}
                />
            )}

            {/* 用户表格 */}
            <div style={{ overflowX: 'auto', marginTop: 10 }}>
                <Table
                    columns={columns}
                    dataSource={list}
                    rowKey="userid"
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
                />
            </div>

            {/* 查看用户权限弹窗 */}
            <PermissionViewModal
                visible={permissionVisible}
                onClose={() => {
                    setPermissionVisible(false);
                    setUserRoles([]);
                    setUserPermissions([]);
                }}
                title={`查看用户权限 - ${selectedRow?.username || ''}`}
                mode="rolesAndPermissions"
                permissions={userPermissions}
                roles={userRoles}
                loading={loadingPermissions}
                onRefresh={handleRefreshPermissions}
            />
        </>
    );
};

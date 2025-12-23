import { Modal, Button, Space, Tree, Tag, Tabs, Table } from 'antd';
import React, { useState, useEffect, useMemo } from 'react';
import { getApiPermissions } from '../../api/casbinPermission';

/**
 * Convert permissions array to tree structure
 * @param {Array} permissions - Array of permission objects with path, method, description, apiGroup/group
 * @returns {Array} Tree structure data for Ant Design Tree component
 */
export const convertPermissionsToTreeData = (permissions) => {
    if (!permissions || permissions.length === 0) {
        return [];
    }

    // Group permissions by apiGroup or group
    const groupMap = new Map();
    permissions.forEach(api => {
        const group = api.apiGroup || api.group || '未分组';
        if (!groupMap.has(group)) {
            groupMap.set(group, []);
        }
        groupMap.get(group).push(api);
    });

    // Convert to tree structure
    const treeNodes = [];
    groupMap.forEach((apis, groupName) => {
        const children = apis.map(api => ({
            title: (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    flexWrap: 'wrap',
                    padding: '4px 0'
                }}>
                    {/* HTTP Method Tag */}
                    <Tag color={
                        api.method === 'GET' ? 'blue' : 
                        api.method === 'POST' ? 'green' : 
                        api.method === 'PUT' ? 'orange' : 
                        api.method === 'DELETE' ? 'red' : 
                        api.method === 'PATCH' ? 'purple' : 'default'
                    }>
                        {api.method}
                    </Tag>
                    {/* API Path */}
                    <span style={{ 
                        fontWeight: 500, 
                        color: '#1890ff', 
                        marginRight: '8px',
                        fontFamily: 'monospace'
                    }}>
                        {api.path}
                    </span>
                    {/* Description */}
                    {api.description && (
                        <span style={{ 
                            color: '#8c8c8c', 
                            fontSize: '12px'
                        }}>
                            {api.description}
                        </span>
                    )}
                </div>
            ),
            key: `api-${api.path}-${api.method}`,
            isLeaf: true,
        }));

        treeNodes.push({
            title: (
                <span style={{ fontWeight: 600, fontSize: '14px' }}>
                    {groupName}
                    <span style={{ 
                        marginLeft: '8px', 
                        color: '#8c8c8c', 
                        fontSize: '12px', 
                        fontWeight: 400 
                    }}>
                        ({apis.length})
                    </span>
                </span>
            ),
            key: `group-${groupName}`,
            children: children,
        });
    });

    // Sort by group name
    treeNodes.sort((a, b) => {
        const aName = a.key.replace('group-', '');
        const bName = b.key.replace('group-', '');
        return aName.localeCompare(bName, 'zh-CN');
    });

    return treeNodes;
};

/**
 * Enrich permissions with group information from API list
 * @param {Array} permissions - Array of permission objects
 * @returns {Promise<Array>} Permissions with enriched group information
 */
export const enrichPermissionsWithGroups = async (permissions) => {
    if (!permissions || permissions.length === 0) {
        return permissions;
    }

    // Check if permissions already have group information
    if (permissions[0].apiGroup || permissions[0].group) {
        return permissions;
    }

    try {
        // Fetch all API list to match group information
        const apiListRes = await getApiPermissions();
        if (apiListRes && apiListRes.data && Array.isArray(apiListRes.data)) {
            // Create mapping from path+method to apiGroup
            const apiMap = new Map();
            apiListRes.data.forEach(api => {
                const key = `${api.path}|${api.method}`;
                apiMap.set(key, api.apiGroup || '未分组');
            });
            
            // Enrich permissions with group information
            return permissions.map(perm => {
                const key = `${perm.path}|${perm.method}`;
                const group = apiMap.get(key) || '未分组';
                return {
                    ...perm,
                    apiGroup: group,
                    group: group,
                };
            });
        }
    } catch (error) {
        console.warn('Failed to fetch API list, using default group:', error);
        // If fetching API list fails, use default group
        return permissions.map(perm => ({
            ...perm,
            apiGroup: '未分组',
            group: '未分组',
        }));
    }

    return permissions;
};

/**
 * Permission View Modal Component
 * Supports two modes:
 * 1. permissionsOnly: Only show permissions (for role management)
 * 2. rolesAndPermissions: Show roles and permissions (for user management)
 */
export const PermissionViewModal = ({
    visible,
    onClose,
    title,
    mode = 'permissionsOnly', // 'permissionsOnly' | 'rolesAndPermissions'
    permissions = [],
    roles = [],
    loading = false,
    onRefresh,
}) => {
    const [expandedKeys, setExpandedKeys] = useState([]);

    // Convert permissions to tree data
    const permissionTreeData = useMemo(() => {
        return convertPermissionsToTreeData(permissions);
    }, [permissions]);

    // Auto expand all groups when permissions change
    useEffect(() => {
        if (permissions.length > 0 && permissionTreeData.length > 0) {
            const allKeys = permissionTreeData.map(node => node.key);
            setExpandedKeys(allKeys);
        } else {
            setExpandedKeys([]);
        }
    }, [permissions, permissionTreeData]);

    // Handle tree expand/collapse
    const onExpand = (expandedKeysValue) => {
        setExpandedKeys(expandedKeysValue);
    };

    // Expand all nodes
    const expandAll = () => {
        const allKeys = permissionTreeData.map(node => node.key);
        setExpandedKeys(allKeys);
    };

    // Collapse all nodes
    const collapseAll = () => {
        setExpandedKeys([]);
    };

    // Handle modal close
    const handleClose = () => {
        setExpandedKeys([]);
        onClose();
    };

    // Render permissions tree
    const renderPermissionsTree = () => {
        if (loading) {
            return (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    加载中...
                </div>
            );
        }

        if (permissions.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    暂无权限
                </div>
            );
        }

        return (
            <div style={{ 
                padding: '16px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #f0f0f0'
            }}>
                <Tree
                    showLine={{ showLeafIcon: false }}
                    expandedKeys={expandedKeys}
                    onExpand={onExpand}
                    treeData={permissionTreeData}
                    style={{
                        backgroundColor: 'transparent',
                    }}
                />
                <div style={{ 
                    marginTop: 16, 
                    color: '#8c8c8c', 
                    fontSize: '12px',
                    textAlign: 'right'
                }}>
                    共 {permissions.length} 个权限
                </div>
            </div>
        );
    };

    // Render roles table (for user management mode)
    const renderRolesTable = () => {
        if (loading) {
            return (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    加载中...
                </div>
            );
        }

        if (roles.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    暂无角色
                </div>
            );
        }

        return (
            <Table
                columns={[
                    {
                        title: '角色ID',
                        dataIndex: 'id',
                        key: 'id',
                        width: '30%',
                    },
                    {
                        title: '角色名称',
                        dataIndex: 'name',
                        key: 'name',
                        width: '25%',
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
                        width: '20%',
                        render: (enabled) => {
                            const isEnabled = enabled !== null && enabled !== undefined 
                                ? Boolean(enabled) 
                                : true;
                            return (
                                <Tag color={isEnabled ? 'green' : 'red'}>
                                    {isEnabled ? '启用' : '禁用'}
                                </Tag>
                            );
                        },
                    },
                ]}
                dataSource={roles}
                pagination={false}
                rowKey="id"
                size="small"
            />
        );
    };

    // Determine tab items based on mode
    const tabItems = mode === 'rolesAndPermissions' ? [
        {
            key: 'roles',
            label: '用户角色',
            children: (
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {renderRolesTable()}
                </div>
            ),
        },
        {
            key: 'permissions',
            label: '用户权限',
            children: (
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {renderPermissionsTree()}
                </div>
            ),
        },
    ] : [
        {
            key: 'permissions',
            label: '权限',
            children: (
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {renderPermissionsTree()}
                </div>
            ),
        },
    ];

    return (
        <Modal
            title={title}
            visible={visible}
            onCancel={handleClose}
            footer={[
                <Space key="footer">
                    {permissions.length > 0 && (
                        <>
                            <Button
                                onClick={expandAll}
                                disabled={permissionTreeData.length === 0}
                                size="small"
                            >
                                展开全部
                            </Button>
                            <Button
                                onClick={collapseAll}
                                disabled={permissionTreeData.length === 0}
                                size="small"
                            >
                                收起全部
                            </Button>
                        </>
                    )}
                    {onRefresh && (
                        <Button
                            onClick={onRefresh}
                            size="small"
                        >
                            刷新
                        </Button>
                    )}
                    <Button key="close" onClick={handleClose}>
                        关闭
                    </Button>
                </Space>
            ]}
            width={900}
        >
            {mode === 'rolesAndPermissions' ? (
                <Tabs defaultActiveKey="roles" items={tabItems} />
            ) : (
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {renderPermissionsTree()}
                </div>
            )}
        </Modal>
    );
};


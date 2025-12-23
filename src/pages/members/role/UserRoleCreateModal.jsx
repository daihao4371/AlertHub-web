/* eslint-disable react-hooks/exhaustive-deps */
import { Modal, Form, Input, Button, Tree, Tag, message, Space } from 'antd'
import React, { useEffect, useState, useMemo } from 'react'
import { createRole, updateRole, setRolePermissions, getRolePermissions } from '../../../api/role'
import { getApiPermissions } from '../../../api/casbinPermission'
const MyFormItemContext = React.createContext([])

function toArr(str) {
    return Array.isArray(str) ? str : [str]
}

// 表单
const MyFormItem = ({ name, ...props }) => {
    const prefixPath = React.useContext(MyFormItemContext)
    const concatName = name !== undefined ? [...prefixPath, ...toArr(name)] : undefined
    return <Form.Item name={concatName} {...props} />
}

// 函数组件
const UserRoleCreateModal = ({ visible, onClose, selectedRow, type, handleList }) => {
    const [form] = Form.useForm()
    const [apiList, setApiList] = useState([])
    const [checkedKeys, setCheckedKeys] = useState([])
    const [expandedKeys, setExpandedKeys] = useState([])
    const [disabledPermission, setDisabledPermission] = useState(false)

    // 禁止输入空格
    const [spaceValue, setSpaceValue] = useState('')

    const handleInputChange = (e) => {
        // 移除输入值中的空格
        const newValue = e.target.value.replace(/\s/g, '')
        setSpaceValue(newValue)
    }

    const handleKeyPress = (e) => {
        // 阻止空格键的默认行为
        if (e.key === ' ') {
            e.preventDefault()
        }
    }

    // 加载角色权限数据
    const loadRolePermissions = async (roleId) => {
        if (!roleId) return
        
        try {
            const res = await getRolePermissions({ roleId })
            
            // 检查权限错误
            if (res.code === 403) {
                message.warning('无权限查看角色权限')
                setCheckedKeys([])
                return
            }
            
            // 处理权限数据：SysApi 数组，提取 ID
            if (res && res.data && Array.isArray(res.data)) {
                const permissionIds = res.data.map(api => api.id).filter(Boolean).map(id => `api-${id}`)
                setCheckedKeys(permissionIds)
                form.setFieldsValue({
                    permissions: permissionIds.map(key => key.replace('api-', '')),
                })
            } else {
                setCheckedKeys([])
            }
        } catch (error) {
            console.error('获取角色权限失败:', error)
            message.error('获取角色权限失败')
            setCheckedKeys([])
        }
    }

    useEffect(() => {
        if (selectedRow) {
            // 设置表单基本字段
            form.setFieldsValue({
                id: selectedRow.id,
                name: selectedRow.name,
                description: selectedRow.description,
            })
            
            // 设置权限禁用状态
            if (selectedRow.name === 'admin') {
                setDisabledPermission(true)
            } else {
                setDisabledPermission(false)
            }
            
            // 加载角色权限数据
            loadRolePermissions(selectedRow.id)
        } else {
            // 清空表单
            setCheckedKeys([])
            setExpandedKeys([])
            form.resetFields()
        }
    }, [selectedRow, form])


    // 提交
    const handleFormSubmit = async (values) => {
        try {
            let roleId = null

            if (type === 'create') {
                // 创建角色
                const createParams = {
                    name: values.name,
                    description: values.description
                }
                await createRole(createParams)
                
                // 创建成功后，刷新列表并从列表中查找刚创建的角色
                await handleList()
                
                // 通过回调获取列表，查找刚创建的角色
                // 注意：由于 handleList 是异步的，我们需要等待它完成
                // 如果用户选择了权限，提示需要稍后编辑设置
                if (Array.isArray(checkedKeys) && checkedKeys.length > 0) {
                    message.warning('角色创建成功，请稍后编辑角色以设置权限')
                }
            }

            if (type === 'update') {
                // 更新角色
                const updateParams = {
                    id: selectedRow.id,
                    name: values.name,
                    description: values.description
                }
                await updateRole(updateParams)
                roleId = selectedRow.id
                
                // 设置角色权限（更新时）
                if (roleId) {
                    const apiIds = Array.isArray(checkedKeys) 
                        ? checkedKeys
                            .filter(key => key.toString().startsWith('api-'))
                            .map(key => Number(key.toString().replace('api-', '')))
                            .filter(id => !isNaN(id))
                        : []
                    
                    const permissionParams = {
                        roleId: roleId,
                        apiIds: apiIds
                    }
                    await setRolePermissions(permissionParams)
                    message.success('角色权限设置成功')
                }
            }

            // 刷新列表
            handleList()
            // 关闭弹窗
            onClose()
        } catch (error) {
            console.error("提交角色失败:", error)
            message.error('操作失败，请重试')
        }
    }

    // 加载 API 列表
    const fetchApiList = async () => {
        try {
            const response = await getApiPermissions()
            if (response && response.data && Array.isArray(response.data)) {
                setApiList(response.data)
            } else {
                setApiList([])
            }
        } catch (error) {
            console.error("获取权限列表失败:", error)
            setApiList([])
        }
    }

    useEffect(() => {
        fetchApiList()
    }, [])

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
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        flexWrap: 'wrap',
                        padding: '4px 0'
                    }}>
                        {/* HTTP 方法标签 */}
                        <Tag color={
                            api.method === 'GET' ? 'blue' : 
                            api.method === 'POST' ? 'green' : 
                            api.method === 'PUT' ? 'orange' : 
                            api.method === 'DELETE' ? 'red' : 
                            api.method === 'PATCH' ? 'purple' : 'default'
                        }>
                            {api.method}
                        </Tag>
                        {/* API 路径 */}
                        <span style={{ 
                            fontWeight: 500, 
                            color: '#1890ff', 
                            marginRight: '8px',
                            fontFamily: 'monospace'
                        }}>
                            {api.path}
                        </span>
                        {/* 描述 */}
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
                key: `api-${api.id}`, // 使用 API ID 作为 key
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

        // 按分组名称排序
        treeNodes.sort((a, b) => {
            const aName = a.key.replace('group-', '');
            const bName = b.key.replace('group-', '');
            return aName.localeCompare(bName, 'zh-CN');
        });

        return treeNodes;
    }, [apiList]);

    // 处理树节点选择变化
    const onCheck = (checkedKeysValue) => {
        // 只保留 API 节点的 key（过滤掉 group 节点的 key）
        const apiKeys = checkedKeysValue.filter(key => key.toString().startsWith('api-'));
        setCheckedKeys(apiKeys);
        // 更新表单值
        const apiIds = apiKeys.map(key => key.toString().replace('api-', ''));
        form.setFieldsValue({
            permissions: apiIds,
        });
    };

    // 处理树节点展开/收起
    const onExpand = (expandedKeysValue) => {
        setExpandedKeys(expandedKeysValue);
    };

    // 展开所有节点
    const expandAll = () => {
        const allKeys = treeData.map(node => node.key);
        setExpandedKeys(allKeys);
    };

    // 收起所有节点
    const collapseAll = () => {
        setExpandedKeys([]);
    };

    return (
        <Modal visible={visible} onCancel={onClose} footer={null} width={690}>
            <Form form={form} name="form_item_path" layout="vertical" onFinish={handleFormSubmit}>

                <MyFormItem name="name" label="角色名称"
                    rules={[
                        {
                            required: true,
                            message: 'Please input your roleName!',
                        },
                    ]}>
                    <Input
                        value={spaceValue}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        disabled={type === 'update'} />
                </MyFormItem>

                <MyFormItem name="description" label="描述">
                    <Input />
                </MyFormItem>

                <MyFormItem name="permissions" label="选择权限">
                    <div style={{ 
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        padding: '16px',
                        backgroundColor: '#fafafa',
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}>
                        <Space style={{ marginBottom: '12px' }}>
                            <Button
                                size="small"
                                onClick={expandAll}
                                disabled={treeData.length === 0 || disabledPermission}
                            >
                                展开全部
                            </Button>
                            <Button
                                size="small"
                                onClick={collapseAll}
                                disabled={treeData.length === 0 || disabledPermission}
                            >
                                收起全部
                            </Button>
                            <span style={{ 
                                color: '#8c8c8c', 
                                fontSize: '12px',
                                marginLeft: '8px'
                            }}>
                                已选择 {checkedKeys.filter(key => key.toString().startsWith('api-')).length} / {apiList.length} 个 API
                            </span>
                        </Space>
                        <Tree
                            checkable
                            showLine={{ showLeafIcon: false }}
                            checkedKeys={checkedKeys}
                            expandedKeys={expandedKeys}
                            onCheck={onCheck}
                            onExpand={onExpand}
                            treeData={treeData}
                            disabled={disabledPermission}
                            style={{
                                backgroundColor: 'transparent',
                            }}
                            checkStrictly={false}
                        />
                    </div>
                </MyFormItem>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                    >
                        提交
                    </Button>
                </div>
            </Form>
        </Modal>
    )
}

export default UserRoleCreateModal
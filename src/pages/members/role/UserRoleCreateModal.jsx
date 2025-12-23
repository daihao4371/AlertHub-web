/* eslint-disable react-hooks/exhaustive-deps */
import { Modal, Form, Input, Button, Transfer, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { createRole, updateRole, setRolePermissions, getRolePermissions } from '../../../api/role'
import { getPermissionsList } from '../../../api/permissions'
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
    const [mockData, setMockData] = useState([])
    const [targetKeys, setTargetKeys] = useState([])
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
                setTargetKeys([])
                return
            }
            
            // 处理权限数据：SysApi 数组，提取 ID
            if (res && res.data && Array.isArray(res.data)) {
                const permissionIds = res.data.map(api => api.id).filter(Boolean)
                setTargetKeys(permissionIds)
                form.setFieldsValue({
                    permissions: permissionIds,
                })
            } else {
                setTargetKeys([])
            }
        } catch (error) {
            console.error('获取角色权限失败:', error)
            message.error('获取角色权限失败')
            setTargetKeys([])
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
            setTargetKeys([])
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
                if (Array.isArray(targetKeys) && targetKeys.length > 0) {
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
                    const apiIds = Array.isArray(targetKeys) 
                        ? targetKeys.map(id => Number(id)).filter(id => !isNaN(id))
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

    const fetchData = async () => {
        try {
            const response = await getPermissionsList()
            // 修复：添加空值检查，防止访问 undefined 的 data
            const data = (response && Array.isArray(response.data)) ? response.data : []
            // 传递当前的 targetKeys 给 formatData
            formatData(data, targetKeys) // 格式化数据
        } catch (error) {
            console.error("获取权限列表失败:", error)
            // 确保即使出错也设置空数组
            setMockData([])
        }
    }

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // 当 selectedRow 变化时，如果已有 mockData，重新加载权限数据
    useEffect(() => {
        if (selectedRow && mockData.length > 0) {
            // 重新加载角色权限数据
            loadRolePermissions(selectedRow.id)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRow])

    const formatData = (data, currentTargetKeys = []) => {
        // 修复：确保 data 是数组
        if (!Array.isArray(data)) {
            setMockData([])
            return
        }

        const tempTargetKeys = []
        // 修复：使用新的数据格式，SysApi 使用 id 而不是 key
        const tempMockData = data.map((item) => {
            // 新格式：SysApi 有 id, path, method, apiGroup, description
            const apiId = item.id
            const keysToCheck = Array.isArray(currentTargetKeys) ? currentTargetKeys : (Array.isArray(targetKeys) ? targetKeys : [])
            const isChosen = keysToCheck.includes(apiId)
            
            if (isChosen) {
                tempTargetKeys.push(apiId)
            }
            
            // 构建显示标题：使用 path + method 或 description
            const title = item.description || `${item.path} [${item.method}]`
            
            return {
                key: apiId, // Transfer 组件需要 key
                id: apiId,
                path: item.path,
                method: item.method,
                apiGroup: item.apiGroup,
                description: item.description,
                title: title,
                chosen: isChosen,
            }
        })

        setMockData(tempMockData)
        // 只在编辑模式下且 currentTargetKeys 有值时更新 targetKeys
        if (selectedRow && currentTargetKeys.length > 0) {
            setTargetKeys(tempTargetKeys)
        }
    }

    const handleOnChange = (keys) => {
        // 修复：新权限系统只需要 ID 数组，不需要对象数组
        // keys 已经是 ID 数组，直接设置
        setTargetKeys(Array.isArray(keys) ? keys : [])
    }

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
                    <Transfer
                        showSearch
                        dataSource={mockData}
                        // 修复：targetKeys 现在直接是 ID 数组
                        targetKeys={Array.isArray(targetKeys) ? targetKeys : []}
                        onChange={(keys) => handleOnChange(keys)}
                        render={(item) => item.title || `${item.path} [${item.method}]`}
                        listStyle={{ height: 300, width: 300 }} // 设置列表样式
                        disabled={disabledPermission}
                    />
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
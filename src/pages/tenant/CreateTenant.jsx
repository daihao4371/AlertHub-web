import { Modal, Form, Input, Button, Divider, Select } from 'antd'
import React, { useState, useEffect } from 'react'
import { createTenant, updateTenant } from '../../api/tenant'
import { getUserList } from '../../api/user'
import { MyFormItem } from '../../utils/formItem'

export const CreateTenant = ({ visible, onClose, selectedRow, type, handleList }) => {
    const [form] = Form.useForm()
    const { Option } = Select
    const [filteredOptions, setFilteredOptions] = useState([])
    const [selectedManager, setSelectedManager] = useState(null)
    const [loading, setLoading] = useState(false)

    // 获取用户列表
    const handleSearchUsers = async () => {
        if (loading) return // 防止重复请求
        try {
            setLoading(true)
            const res = await getUserList()
            if (res && res.data && Array.isArray(res.data)) {
                const options = res.data.map((item) => ({
                    username: item.username || item.userName,
                    userid: item.userid || item.userId,
                    realName: item.realName || item.real_name || ''
                }))
                setFilteredOptions(options)
            } else {
                console.warn('用户列表数据格式不正确:', res)
            }
        } catch (error) {
            console.error('获取用户列表失败:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (visible) {
            // 加载用户列表
            handleSearchUsers()
            
            if (selectedRow) {
                form.setFieldsValue({
                    name: selectedRow.name,
                    manager: selectedRow.manager,
                    description: selectedRow.description,
                })
                setSelectedManager({
                    value: selectedRow.manager,
                    realName: selectedRow.managerRealName || ''
                })
            } else {
                form.resetFields()
                setSelectedManager(null)
            }
        }
    }, [visible, selectedRow, form])

    // 创建
    const handleCreate = async (data) => {
        try {
            await createTenant(data)
            handleList()
        } catch (error) {
            console.error(error)
        }
    }

    // 更新
    const handleUpdate = async (data) => {
        try {
            await updateTenant(data)
            handleList()
        } catch (error) {
            console.error(error)
        }
    }

    // 处理选择变化
    const handleSelectChange = (value, option) => {
        const selectedOption = filteredOptions.find(item => item.username === value)
        setSelectedManager({
            value: value,
            realName: selectedOption?.realName || option?.realName || ''
        })
        // 同步更新表单值
        form.setFieldsValue({ manager: value })
    }

    // 渲染选项
    const renderOption = (item) => {
        const displayName = item.realName || item.username
        return <Option key={item.username} value={item.username} userid={item.userid}>{displayName}</Option>
    }

    // 提交
    const handleFormSubmit = async (values) => {
        if (type === 'create') {
            const params = {
                ...values,
                manager: selectedManager?.value || values.manager,
                userNumber: 10,
                ruleNumber: 50,
                dutyNumber: 10,
                noticeNumber: 10,
                removeProtection: false,
            }

            await handleCreate(params)
        }

        if (type === 'update') {
            const params = {
                ...values,
                manager: selectedManager?.value || values.manager,
                id: selectedRow.id,
            }

            await handleUpdate(params)
        }

        // 关闭弹窗
        onClose()
    }

    return (
        <>
            <Modal visible={visible} onCancel={onClose} footer={null}>
                <Form form={form} name="form_item_path" layout="vertical" onFinish={handleFormSubmit}>
                    <strong style={{ fontSize: '15px' }}>基础信息</strong>
                    <MyFormItem
                            name="name"
                            label="租户名称"
                            style={{
                                marginRight: '10px',
                                width: '472px',
                            }}
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Input />
                        </MyFormItem>

                    <MyFormItem
                            name="manager"
                            label="租户负责人"
                            style={{
                                width: '472px',
                            }}
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Select
                                showSearch
                                placeholder="请选择租户负责人"
                                onChange={handleSelectChange}
                                onFocus={handleSearchUsers}
                                onDropdownVisibleChange={(open) => {
                                    if (open) {
                                        handleSearchUsers()
                                    }
                                }}
                                value={selectedManager?.value}
                                loading={loading}
                                notFoundContent={loading ? '加载中...' : '暂无数据'}
                                filterOption={(input, option) =>
                                    (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
                                }
                                style={{
                                    width: '100%',
                                }}
                            >
                                {filteredOptions.map(renderOption)}
                            </Select>
                        </MyFormItem>

                    <MyFormItem
                        name="description"
                        label="描述"
                        style={{
                            width: '472px',
                        }}
                        rules={[
                            {
                                required: true,
                            },
                        ]}
                    >
                        <Input maxLength={30} />
                    </MyFormItem>
                    <Divider />

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            style={{
                                backgroundColor: '#000000'
                            }}
                        >
                            提交
                        </Button>
                    </div>
                </Form>
            </Modal>
        </>
    )
}
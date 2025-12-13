import { createDutyManager, updateDutyManager } from '../../api/duty'
import { Modal, Form, Input, Button, Select } from 'antd'
import React, { useState, useEffect } from 'react'
import {getUserList} from "../../api/user";

export const CreateDutyModal = ({ visible, onClose, handleList, selectedRow, type }) => {
    const [form] = Form.useForm()
    const { Option } = Select
    const [filteredOptions, setFilteredOptions] = useState([])
    const [selectedItems, setSelectedItems] = useState({})

    useEffect(() => {
        if (visible) {
            if (selectedRow) {
                form.setFieldsValue({
                    name: selectedRow.name,
                    description: selectedRow.description,
                    manager: selectedRow.manager.username,
                })
                setSelectedItems({
                    value: selectedRow.manager.username,
                    userid: selectedRow.manager.userid,
                    realName: selectedRow.manager.realName || ''
                })
            } else {
                form.resetFields()
                setSelectedItems({})
            }
        }
    }, [visible, selectedRow, form])

    // 禁止输入空格的处理函数
    const handleInputChange = (e) => {
        const newValue = e.target.value.replace(/\s/g, '')
        form.setFieldsValue({ name: newValue })
    }

    const handleKeyPress = (e) => {
        if (e.key === ' ') {
            e.preventDefault()
        }
    }

    const handleFormSubmit = async (values) => {
        const newData = {
            ...values,
            manager: {
                username: selectedItems.value,
                userid: selectedItems.userid,
            }
        }

        try {
            if (type === 'create') {
                await createDutyManager(newData)
            } else if (type === 'update') {
                await updateDutyManager({
                    ...newData,
                    tenantId: selectedRow.tenantId,
                    id: selectedRow.id,
                })
            }
            handleList()
            onClose()
        } catch (error) {
            console.error(error)
        }
    }

    const handleSelectChange = (value, option) => {
        const selectedOption = filteredOptions.find(item => item.username === value)
        setSelectedItems({
            value: value,
            userid: selectedOption?.userid || option?.userid,
            realName: selectedOption?.realName || option?.realName
        })
    }

    const handleSearchDutyUser = async () => {
        try {
            const params = {
                joinDuty: "true",
            }
            const res = await getUserList(params)
            const options = res.data.map((item) => ({
                username: item.username,
                userid: item.userid,
                realName: item.realName
            }))
            setFilteredOptions(options)
        } catch (error) {
            console.error(error)
        }
    }

    const renderOption = (item) => {
        const displayName = item.realName || item.username;
        return <Option key={item.username} value={item.username} userid={item.userid}>{displayName}</Option>;
    };

    return (
        <Modal visible={visible} onCancel={onClose} footer={null}>
            <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
                <Form.Item 
                    name="name" 
                    label="名称"
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Input
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress} 
                    />
                </Form.Item>

                <Form.Item name="description" label="描述">
                    <Input />
                </Form.Item>

                <Form.Item
                    name="manager"
                    label="负责人"
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Select
                        showSearch
                        placeholder="管理当前值班值班表的负责人"
                        onChange={handleSelectChange}
                        onClick={handleSearchDutyUser}
                        value={selectedItems.value}
                        style={{
                            width: '100%',
                        }}
                    >
                        {filteredOptions.map(renderOption)}
                    </Select>
                </Form.Item>

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
    )
}
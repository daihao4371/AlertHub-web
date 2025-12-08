"use client"
import { updateCalendar } from "../../../api/duty"
import {Modal, Form, Button, message, Select, Typography} from "antd"
import React, { useState, useEffect, useCallback } from "react"
import {getUserList} from "../../../api/user";

export const UpdateCalendarModal = ({ visible, onClose, time, tenantId, dutyId, date, currentDutyUsers, onSuccess }) => {
    const { Option } = Select
    const [form] = Form.useForm() // 使用 Ant Design 的 form hook 来设置表单值
    const [selectedUsersForUpdate, setSelectedUsersForUpdate] = useState([]) // 存储选中的用户对象 { username, userid }
    const [filteredOptions, setFilteredOptions] = useState([]) // 搜索框可用的用户列表

    // 获取所有可选择的用户列表
    const handleSearchDutyUser = useCallback(async () => {
        try {
            const params = {
                joinDuty: "true",
            }
            const res = await getUserList(params)
            const options = res.data.map((item) => ({
                username: item.username,
                userid: item.userid,
                realName: item.realName,
                phone: item.phone,
                mobile: item.phone // Member 模型使用 phone，映射到 mobile 用于 DutyUser
            }))
            setFilteredOptions(options)
        } catch (error) {
            console.error(error)
            message.error("获取用户列表失败")
        }
    }, [])

    // 提取当前用户列表的辅助函数（处理多组和单组结构）
    const getCurrentUsers = useCallback(() => {
        if (!currentDutyUsers || currentDutyUsers.length === 0) {
            return []
        }
        if (Array.isArray(currentDutyUsers[0])) {
            // 多组结构：取第一个组
            return currentDutyUsers[0]
        }
        // 单组结构：直接使用
        return currentDutyUsers
    }, [currentDutyUsers])

    // 计算当前用户数量的辅助函数
    const getCurrentUsersCount = useCallback(() => {
        return getCurrentUsers().length
    }, [getCurrentUsers])

    // Modal 打开时加载数据并初始化表单
    useEffect(() => {
        if (visible && currentDutyUsers) {
            const currentUsers = getCurrentUsers()

            setSelectedUsersForUpdate(currentUsers)

            // 为 Ant Design 的 Select 组件设置初始值
            // Select 在 multiple 模式下期望一个键数组作为值
            form.setFieldsValue({
                dutyUser: currentUsers.map((user) => user.userid), // 将用户对象映射为 userid 数组
            })
            handleSearchDutyUser() // 模态框打开时获取所有用户列表
        } else if (!visible) {
            // 模态框关闭时重置状态
            setSelectedUsersForUpdate([])
            setFilteredOptions([])
            form.resetFields() // 清空表单字段
        }
    }, [visible, currentDutyUsers, getCurrentUsers, form, handleSearchDutyUser]) // 依赖 visible, currentDutyUsers, getCurrentUsers, form 和 handleSearchDutyUser

    // 处理 Select 框选择变化
    const handleSelectChange = (value, options) => {
        // 'value' 是一个包含选中 Option value (这里是 userid) 的数组
        // 'options' 是一个包含选中 Option 对象 (包含 key, value, children, userid 等) 的数组
        const newSelectedUsers = options.map((option) => ({
            username: option.label,
            userid: option.key,
            realName: option.realName,
            mobile: option.mobile || option.phone || '' // 优先使用 mobile，如果没有则使用 phone
        }))
        setSelectedUsersForUpdate(newSelectedUsers)
    }

    // 提交表单数据到后端
    const handleFormSubmit = async () => {
        const currentDutyUsersCount = getCurrentUsersCount()
        const currentSelectedCount = selectedUsersForUpdate.length

        if (currentSelectedCount !== currentDutyUsersCount) {
            message.error(`请选择 ${currentDutyUsersCount} 名值班人员。`)
            return
        }

        // 构建后端数据结构
        // 确保用户对象包含 mobile 字段（DutyUser 模型要求）
        const usersForSubmit = selectedUsersForUpdate.map((user) => ({
            userid: user.userid,
            username: user.username,
            email: user.email || '',
            mobile: user.mobile || user.phone || '' // 优先使用 mobile，如果没有则使用 phone
        }))

        const calendarData = {
            tenantId: tenantId,
            dutyId: dutyId,
            time: date,
            users: usersForSubmit,
            status: "Temporary"
        }

        try {
            await updateCalendar(calendarData)
            message.success("值班人员更新成功！")
            onClose()
            if (onSuccess) {
                onSuccess()
            }
        } catch (error) {
            console.error("更新失败:", error)
            message.error("更新值班人员失败。")
        }
    }

    return (
        <Modal visible={visible} onCancel={onClose} footer={null} style={{ marginTop: "20vh" }}>
            <div>调整值班人员, 当前值班日期: {time}</div>
            <Form form={form} layout="vertical">
                {" "}
                {/* 关联表单实例 */}
                <Form.Item
                    name="dutyUser"
                    // 根据初始人数动态显示提示
                    label={`值班人员 (当前${getCurrentUsersCount()}人，请更新为${getCurrentUsersCount()}人)`}
                    rules={[
                        {
                            required: true,
                            message: "请选择值班人员",
                        },
                        // 其他校验逻辑已在 handleFormSubmit 中处理
                    ]}
                    style={{ marginTop: "20px" }}
                >
                    <Typography.Text type="secondary" style={{marginTop: '5px', fontSize: '12px'}}>
                        {"更新某一天的值班组，则称为临时调班，不在发布日程的用户列表内体现。"}
                    </Typography.Text>
                    <Select
                        mode="multiple"
                        showSearch
                        placeholder="Select person(s)"
                        optionFilterProp="children"
                        onChange={handleSelectChange}
                        onFocus={handleSearchDutyUser}
                        style={{
                            width: "100%",
                        }}
                         value={selectedUsersForUpdate.map((user) => user.userid)}
                    >
                        {filteredOptions.map((item) => (
                             <Option 
                                key={item.userid} 
                                value={item.userid} 
                                disabled={selectedUsersForUpdate.length === getCurrentUsersCount()}
                                realName={item.realName} 
                                mobile={item.mobile} 
                                phone={item.phone}
                            >
                                {item.realName || item.username}({item.mobile || item.phone || '无电话'})
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Button
                    type="primary"
                    htmlType="submit"
                    onClick={handleFormSubmit}
                    style={{
                        backgroundColor: "#000000",
                        width: "100%", // 按钮宽度占满
                    }}
                >
                    提交
                </Button>
            </Form>
        </Modal>
    )
}

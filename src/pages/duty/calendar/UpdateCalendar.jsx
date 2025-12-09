"use client"
import { updateCalendar } from "../../../api/duty"
import {Modal, Form, Button, message, Select, Typography} from "antd"
import { useState, useEffect, useCallback } from "react"
import {getUserList} from "../../../api/user";

export const UpdateCalendarModal = ({ visible, onClose, time, tenantId, dutyId, date, currentDutyUsers, onSuccess }) => {
    const { Option } = Select
    const [form] = Form.useForm()
    const [selectedUsersForUpdate, setSelectedUsersForUpdate] = useState([])
    const [filteredOptions, setFilteredOptions] = useState([])

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
                mobile: item.phone
            }))
            setFilteredOptions(options)
        } catch (error) {
            console.error(error)
            message.error("获取用户列表失败")
        }
    }, [])

    const getCurrentUsers = useCallback(() => {
        if (!currentDutyUsers || currentDutyUsers.length === 0) {
            return []
        }
        if (Array.isArray(currentDutyUsers[0])) {
            return currentDutyUsers[0]
        }
        return currentDutyUsers
    }, [currentDutyUsers])

    const getCurrentUsersCount = useCallback(() => {
        return getCurrentUsers().length
    }, [getCurrentUsers])

    useEffect(() => {
        if (visible && currentDutyUsers) {
            const currentUsers = getCurrentUsers()

            setSelectedUsersForUpdate(currentUsers)
            form.setFieldsValue({
                dutyUser: currentUsers.map((user) => user.userid),
            })
            handleSearchDutyUser()
        } else if (!visible) {
            setSelectedUsersForUpdate([])
            setFilteredOptions([])
            form.resetFields()
        }
    }, [visible, currentDutyUsers, getCurrentUsers, form, handleSearchDutyUser])

    const handleSelectChange = (value, options) => {
        const newSelectedUsers = options.map((option) => ({
            username: option.label,
            userid: option.key,
            realName: option.realName,
            mobile: option.mobile || option.phone || ''
        }))
        setSelectedUsersForUpdate(newSelectedUsers)
    }

    const handleFormSubmit = async () => {
        const currentDutyUsersCount = getCurrentUsersCount()
        const currentSelectedCount = selectedUsersForUpdate.length

        if (currentSelectedCount !== currentDutyUsersCount) {
            message.error(`请选择 ${currentDutyUsersCount} 名值班人员。`)
            return
        }

        const usersForSubmit = selectedUsersForUpdate.map((user) => ({
            userid: user.userid,
            username: user.username,
            email: user.email || '',
            mobile: user.mobile || user.phone || ''
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
                <Form.Item
                    name="dutyUser"
                    label={`值班人员 (当前${getCurrentUsersCount()}人，请更新为${getCurrentUsersCount()}人)`}
                    rules={[
                        {
                            required: true,
                            message: "请选择值班人员",
                        },
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
                        width: "100%",
                    }}
                >
                    提交
                </Button>
            </Form>
        </Modal>
    )
}

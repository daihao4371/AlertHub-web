"use client"

import { useEffect, useState, useCallback } from "react"
import { Form, Modal, DatePicker, Select, Button, List, Avatar, Space, Drawer, InputNumber, message } from "antd"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { DeleteOutlined, MenuOutlined } from "@ant-design/icons"
import { createCalendar, GetCalendarUsers } from "../../../api/duty"
import Search from "antd/es/input/Search"
import { v4 as uuidv4 } from "uuid"
import dayjs from "dayjs"
import {getUserList} from "../../../api/user";

export const CreateCalendarModal = ({ visible, onClose,onSuccess, dutyId }) => {
    const { Option } = Select
    const [form] = Form.useForm()
    const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"))
    const [dutyPeriod, setDutyPeriod] = useState(1)
    const [filteredOptions, setFilteredOptions] = useState([])
    const [dateType, setDateType] = useState("week")
    const [selectedGroups, setSelectedGroups] = useState([])
    const [searchVisible, setSearchVisible] = useState(false)
    const [currentGroupIndexForUserSelection, setCurrentGroupIndexForUserSelection] = useState(null)

    const handleGetCalendarUsers = useCallback(async () => {
        try {
            const params = {
                dutyId: dutyId,
            }
            const res = await GetCalendarUsers(params)

            // 获取所有用户列表，用于补充电话号码
            let allUsersMap = new Map()
            try {
                const userRes = await getUserList({ joinDuty: "true" })
                if (userRes.data && Array.isArray(userRes.data)) {
                    userRes.data.forEach((user) => {
                        allUsersMap.set(user.userid, user)
                    })
                }
            } catch (err) {
                console.error("获取用户列表失败:", err)
            }

            if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                const loadedGroups = res.data
                    .filter((userList) => Array.isArray(userList)) // 确保每个 userList 都是数组
                    .map((userList) => {
                        // 补充用户信息：如果 mobile 为空，从用户列表获取 phone
                            const enrichedUsers = userList.map((dutyUser) => {
                            const fullUser = allUsersMap.get(dutyUser.userid)
                            return {
                                ...dutyUser,
                                realName: dutyUser.realName || (fullUser ? fullUser.realName : ''),
                                phone: fullUser ? fullUser.phone : dutyUser.phone || '',
                                mobile: dutyUser.mobile || (fullUser ? fullUser.phone : '')
                            }
                        })
                        
                        return {
                            id: uuidv4(),
                            users: enrichedUsers,
                        }
                    })
                setSelectedGroups(loadedGroups)
            } else {
                setSelectedGroups([{ id: uuidv4(), users: [] }])
            }
        } catch (error) {
            console.error(error)
            setSelectedGroups([{ id: uuidv4(), users: [] }])
        }
    }, [dutyId])

    useEffect(() => {
        if (visible) {
            const date =dayjs().format("YYYY-MM")
            form.setFieldsValue({
                "year-month": dayjs(date),
            })
            handleGetCalendarUsers()
            setDutyPeriod(1)
        }
    }, [visible, form, handleGetCalendarUsers])

    const onChangeDate = (date, dateString) => {
        setSelectedMonth(dateString)
    }

    const handleDutyPeriodChange = (value) => {
        setDutyPeriod(value || 1)
    }

    const handleFormSubmit = async (calendarData) => {
        try {
            await createCalendar(calendarData)
        } catch (error) {
            console.error(error)
        }
        onClose()
        onSuccess()
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
                realName: item.realName,
                phone: item.phone,
                mobile: item.phone
            }))
            setFilteredOptions(options)
        } catch (error) {
            console.error(error)
        }
    }

    const onSearchDutyUser = (query) => {
        if (!query || typeof query !== "string") {
            handleSearchDutyUser() // 如果查询为空，重新加载所有用户
            return
        }
        const filtered = filteredOptions.filter((item) => 
            (item.realName && item.realName.toLowerCase().includes(query.toLowerCase())) ||
            (item.username && item.username.toLowerCase().includes(query.toLowerCase())) ||
            (item.phone && item.phone.includes(query)) ||
            (item.mobile && item.mobile.includes(query))
        )
        setFilteredOptions(filtered)
    }

    const handleAddUserToGroup = (user) => {
        if (currentGroupIndexForUserSelection !== null) {
            const newGroups = [...selectedGroups]
            const currentGroup = newGroups[currentGroupIndexForUserSelection]
            if (!currentGroup.users.some((u) => u.userid === user.userid)) {
                currentGroup.users.push(user)
                setSelectedGroups(newGroups)
            }
        }
        setSearchVisible(false)
        setCurrentGroupIndexForUserSelection(null)
    }

    const handleAddGroup = () => {
        setSelectedGroups([...selectedGroups, { id: uuidv4(), users: [] }])
    }

    const handleDeleteGroup = (groupIndex) => {
        const newGroups = selectedGroups.filter((_, idx) => idx !== groupIndex)
        setSelectedGroups(newGroups)
    }

    const handleDeleteUserFromGroup = (groupIndex, userIndex) => {
        const newGroups = [...selectedGroups]
        newGroups[groupIndex].users = newGroups[groupIndex].users.filter((_, idx) => idx !== userIndex)
        setSelectedGroups(newGroups)
    }

    const handleDragEnd = (result) => {
        const { source, destination, type } = result

        if (!destination) return

        // 组的排序
        if (type === "groups") {
            const items = Array.from(selectedGroups)
            const [reorderedItem] = items.splice(source.index, 1)
            items.splice(destination.index, 0, reorderedItem)
            setSelectedGroups(items)
        }

        // 组内人员的排序或跨组移动
        if (type === "users") {
            const sourceGroupId = source.droppableId
            const destinationGroupId = destination.droppableId

            const sourceGroupIndex = selectedGroups.findIndex((group) => group.id === sourceGroupId)
            const destinationGroupIndex = selectedGroups.findIndex((group) => group.id === destinationGroupId)

            if (sourceGroupIndex === -1 || destinationGroupIndex === -1) return

            const newGroups = [...selectedGroups]

            // 在同一个组内移动
            if (sourceGroupId === destinationGroupId) {
                const users = Array.from(newGroups[sourceGroupIndex].users)
                const [reorderedUser] = users.splice(source.index, 1)
                users.splice(destination.index, 0, reorderedUser)
                newGroups[sourceGroupIndex].users = users
                setSelectedGroups(newGroups)
            } else {
                // 跨组移动
                const sourceUsers = Array.from(newGroups[sourceGroupIndex].users)
                const destinationUsers = Array.from(newGroups[destinationGroupIndex].users)
                const [movedUser] = sourceUsers.splice(source.index, 1)
                destinationUsers.splice(destination.index, 0, movedUser)

                newGroups[sourceGroupIndex].users = sourceUsers
                newGroups[destinationGroupIndex].users = destinationUsers
                setSelectedGroups(newGroups)
            }
        }
    }

    const DutyUserGroupList = () => (
        <Form.Item name="dutyUserGroups" rules={[{ required: true, message: "请至少添加一个值班组" }]}>
            <div>
                <Button type="dashed" onClick={handleAddGroup} style={{ marginBottom: 16 }}>
                    + 添加值班组
                </Button>
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="all-groups" type="groups">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef}>
                                {selectedGroups.map((group, groupIndex) => (
                                    <Draggable key={group.id} draggableId={group.id} index={groupIndex}>
                                        {(providedGroup) => (
                                            <div
                                                ref={providedGroup.innerRef}
                                                {...providedGroup.draggableProps}
                                                style={{
                                                    position: "relative",
                                                    padding: "16px",
                                                    paddingLeft: "24px",
                                                    marginBottom: "16px",
                                                    border: "1px solid #e0e0e0",
                                                    borderRadius: "8px",
                                                    backgroundColor: "#f9f9f9",
                                                    overflow: "hidden",
                                                    ...providedGroup.draggableProps.style,
                                                }}
                                            >
                                                <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: "12px" }}>
                                                  <span {...providedGroup.dragHandleProps} style={{ cursor: "move" }}>
                                                    <MenuOutlined />
                                                  </span>
                                                    <div style={{ flex: 1 }} />
                                                    <Button
                                                        type="text"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        onClick={() => handleDeleteGroup(groupIndex)}
                                                    />
                                                </Space>
                                                <Button
                                                    type="dashed"
                                                    onClick={() => {
                                                        handleSearchDutyUser()
                                                        setCurrentGroupIndexForUserSelection(groupIndex)
                                                        setSearchVisible(true)
                                                    }}
                                                    style={{ marginBottom: 12, width: "100%" }}
                                                    disabled={group.users.length >= 2}
                                                >
                                                    + 添加组内人员
                                                </Button>
                                                <Droppable droppableId={group.id} type="users">
                                                    {(providedUsers) => (
                                                        <div {...providedUsers.droppableProps} ref={providedUsers.innerRef}>
                                                            {group.users.map((user, userIndex) => (
                                                                <Draggable key={user.userid} draggableId={user.userid} index={userIndex}>
                                                                    {(providedUser) => (
                                                                        <div
                                                                            ref={providedUser.innerRef}
                                                                            {...providedUser.draggableProps}
                                                                            style={{
                                                                                padding: "8px",
                                                                                marginBottom: "8px",
                                                                                border: "1px solid #f0f0f0",
                                                                                borderRadius: "4px",
                                                                                backgroundColor: "white",
                                                                                ...providedUser.draggableProps.style,
                                                                            }}
                                                                        >
                                                                            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                                                                <Space>
                                                                                    <span {...providedUser.dragHandleProps}>
                                                                                      <MenuOutlined />
                                                                                    </span>
                                                                                    <Avatar>
                                                                                        {(user.realName && user.realName[0]) || user.username[0]}
                                                                                    </Avatar>
                                                                                    <div>
                                                                                        <div>{user.realName || user.username}</div>
                                                                                        <div style={{fontSize: '12px', color: '#666'}}>{user.mobile || user.phone}</div>
                                                                                    </div>
                                                                                </Space>
                                                                                <Button
                                                                                    type="text"
                                                                                    danger
                                                                                    icon={<DeleteOutlined />}
                                                                                    onClick={() => handleDeleteUserFromGroup(groupIndex, userIndex)}
                                                                                />
                                                                            </Space>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {providedUsers.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </Form.Item>
    )

    const generateCalendar = () => {
        if (selectedMonth && dutyPeriod && selectedGroups.length > 0) {
            const allGroupsHaveUsers = selectedGroups.every((group) => group.users.length > 0)
            if (!allGroupsHaveUsers) {
                message.error("每个值班组至少需要一名值班人员")
                return
            }

            const userGroupData = selectedGroups.map((group) => 
                group.users.map((user) => {
                    const mobile = user.mobile || user.phone || ''
                    return {
                        userid: user.userid,
                        username: user.username,
                        email: user.email || '',
                        mobile: mobile
                    }
                })
            )

            const calendarData = {
                dutyId: dutyId,
                month: selectedMonth,
                dutyPeriod: dutyPeriod,
                dateType: dateType,
                userGroup: userGroupData,
                status: "Formal",
            }
            handleFormSubmit(calendarData)
            form.resetFields()
        } else {
            message.error("请填写所有必填项并至少添加一个值班组")
        }
    }

    return (
        <Drawer title="发布日程" open={visible} onClose={onClose} size="large">
            <Form form={form} layout="vertical">
                <Form.Item
                    name="year-month"
                    label="选择月份"
                    rules={[
                        {
                            required: true,
                            message: "请选择月份",
                        },
                    ]}
                    value={selectedMonth ? dayjs(selectedMonth) : null}
                    onChange={(date, dateString) => onChangeDate(date, dateString)}
                >
                    <DatePicker onChange={onChangeDate} picker="month" format="YYYY-MM" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                    name="dutyPeriod"
                    label="每组持续"
                    rules={[
                        {
                            required: true,
                            message: "请输入持续天数/周数",
                        },
                    ]}
                    initialValue={1}
                >
                    <InputNumber
                        style={{ width: "100%" }}
                        placeholder="1"
                        min={1}
                        onChange={handleDutyPeriodChange}
                        addonAfter={
                            <Select onChange={setDateType} value={dateType}>
                                <Option value="day">{"天"}</Option>
                                <Option value="week">{"周"}</Option>
                            </Select>
                        }
                    />
                </Form.Item>
                <DutyUserGroupList />
            </Form>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 0" }}>
                <Button
                    type="primary"
                    onClick={generateCalendar}
                    style={{
                        backgroundColor: "#000000",
                    }}
                >
                    提交
                </Button>
            </div>
            <Modal
                title="选择值班人员"
                open={searchVisible}
                onCancel={() => {
                    setSearchVisible(false)
                    setCurrentGroupIndexForUserSelection(null)
                }}
                footer={null}
                styles={{ body: { maxHeight: "calc(100vh - 300px)", overflowY: "auto" } }}
            >
                <Search
                    placeholder="搜索值班人员"
                    onSearch={onSearchDutyUser}
                    onChange={(e) => onSearchDutyUser(e.target.value)}
                    style={{ marginBottom: 16 }}
                />
                <List
                    dataSource={filteredOptions.filter((option) => {
                        if (currentGroupIndexForUserSelection !== null) {
                            return !selectedGroups[currentGroupIndexForUserSelection].users.some(
                                (user) => user.userid === option.userid,
                            )
                        }
                        return true
                    })}
                    renderItem={(item) => (
                        <List.Item onClick={() => handleAddUserToGroup(item)} style={{ cursor: "pointer" }}>
                            <List.Item.Meta 
                                avatar={<Avatar>{(item.realName && item.realName[0]) || item.username[0]}</Avatar>} 
                                title={item.realName || item.username}
                                description={item.mobile || item.phone}
                            />

                        </List.Item>
                    )}
                />
            </Modal>
        </Drawer>
    )
}

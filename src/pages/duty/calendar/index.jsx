"use client"

import { Calendar, Button, message, Spin } from "antd"
import React, { useState, useEffect, useCallback } from "react"
import {CalendarIcon} from "lucide-react"
import { UpdateCalendarModal } from "./UpdateCalendar"
import { searchCalendar } from "../../../api/duty"
import { useParams } from "react-router-dom"
import {CreateCalendarModal} from "./CreateCalendar";
import {PlusOutlined, ReloadOutlined} from "@ant-design/icons";
import {getUserList} from "../../../api/user";

export const fetchDutyData = async (dutyId, year, month) => {
    try {
        const params = {
            dutyId: dutyId,
            ...(year &&
                month && {
                    time: year+"-"+(month + 1),
                }),
        }
        const res = await searchCalendar(params)
        return res.data
    } catch (error) {
        console.error(error)
        message.error("获取日程数据失败")
        return []
    }
}

export const CalendarApp = ({ tenantId }) => {
    const url = new URL(window.location)
    const calendarName = url.searchParams.get("calendarName")
    const { id } = useParams()
    const [dutyData, setDutyData] = useState([])
    const [createCalendarModal, setCreateCalendarModal] = useState(false)
    const [selectedDate, setSelectedDate] = useState(null)
    const [modalVisible, setModalVisible] = useState(false)
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
    const [loading, setLoading] = useState(false)
    const [selectedDayDutyUsers, setSelectedDayDutyUsers] = useState(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchDutyData(id, currentYear, currentMonth)
            
            // 如果数据中有用户但 mobile 字段为空，尝试从用户列表补充电话号码
            if (data && data.length > 0) {
                // 获取所有用户列表，用于补充电话号码
                // 注意：不限制 joinDuty，因为值班表中可能包含任何用户
                let allUsersMap = new Map() // 通过 userid 索引
                let allUsersByUsername = new Map() // 通过 username 索引
                let allUsersByRealName = new Map() // 通过 realName 索引
                
                // 构建用户索引的辅助函数
                const buildUserMaps = (users) => {
                    if (users && Array.isArray(users)) {
                        users.forEach((user) => {
                            allUsersMap.set(user.userid, user)
                            if (user.username) {
                                allUsersByUsername.set(user.username, user)
                            }
                            if (user.realName) {
                                allUsersByRealName.set(user.realName, user)
                            }
                        })
                    }
                }
                
                try {
                    // 先尝试获取所有用户（不限制 joinDuty）
                    const userRes = await getUserList({})
                    buildUserMaps(userRes.data)
                } catch (err) {
                    console.error("获取用户列表失败:", err)
                    // 如果获取所有用户失败，尝试获取 joinDuty 的用户作为备用
                    try {
                        const userRes = await getUserList({ joinDuty: "true" })
                        buildUserMaps(userRes.data)
                    } catch (err2) {
                        console.error("获取 joinDuty 用户列表也失败:", err2)
                    }
                }
                
                // 补充电话号码：如果 mobile 为空，从用户列表获取 phone
                const enrichedData = data.map((item) => {
                    if (item.users && item.users.length > 0) {
                        // 处理多组结构（二维数组）和单组结构（一维数组）
                        const enrichUser = (dutyUser) => {
                            // 如果 mobile 为空，优先使用 phone，如果 phone 也为空，从用户列表获取
                            let mobile = dutyUser.mobile || dutyUser.phone || ''
                            let phone = dutyUser.phone || dutyUser.mobile || ''
                            
                            // 在整个函数作用域内查找完整用户信息（用于补充 realName 和 phone）
                            let fullUser = null
                            
                            // 查找完整用户信息的辅助函数
                            const findFullUser = () => {
                                // 首先尝试通过 userid 查找
                                let found = allUsersMap.get(dutyUser.userid)
                                if (found) return found
                                
                                // 如果没找到，尝试通过 username 查找
                                if (dutyUser.username) {
                                    found = allUsersByUsername.get(dutyUser.username)
                                    if (found) return found
                                }
                                
                                // 如果还没找到，尝试通过 realName 查找
                                if (dutyUser.realName) {
                                    // 精确匹配
                                    found = allUsersByRealName.get(dutyUser.realName)
                                    if (found) return found
                                    
                                    // 去除空格后匹配
                                    const trimmedRealName = dutyUser.realName.trim()
                                    found = allUsersByRealName.get(trimmedRealName)
                                    if (found) return found
                                    
                                    // 模糊匹配
                                    found = Array.from(allUsersMap.values()).find(
                                        u => u.realName && (
                                            u.realName === dutyUser.realName ||
                                            u.realName.trim() === dutyUser.realName.trim() ||
                                            u.realName.includes(dutyUser.realName) ||
                                            dutyUser.realName.includes(u.realName)
                                        )
                                    )
                                    if (found) return found
                                }
                                
                                return null
                            }
                            
                            // 如果都没有电话号码，从用户列表获取
                            if (!mobile && !phone) {
                                fullUser = findFullUser()
                                if (fullUser && fullUser.phone) {
                                    mobile = fullUser.phone
                                    phone = fullUser.phone
                                }
                            } else {
                                // 即使已经有电话号码，也尝试查找完整用户信息以补充 realName
                                if (!dutyUser.realName) {
                                    fullUser = findFullUser()
                                }
                            }
                            
                            // 如果 mobile 为空但 phone 有值，使用 phone 填充 mobile
                            if (!mobile && phone) {
                                mobile = phone
                            }
                            // 如果 mobile 有值但 phone 为空，使用 mobile 填充 phone
                            if (mobile && !phone) {
                                phone = mobile
                            }
                            
                            // 补充 realName（如果 dutyUser 中没有，但从用户列表找到了）
                            const realName = dutyUser.realName || (fullUser && fullUser.realName ? fullUser.realName : '')
                            
                            return {
                                ...dutyUser,
                                realName: realName,
                                mobile: mobile,
                                phone: phone
                            }
                        }
                        
                        // 检查是否为多组结构（第一个元素是数组）
                        let enrichedUsers
                        if (Array.isArray(item.users[0])) {
                            // 多组结构：处理每个组
                            enrichedUsers = item.users.map((group) => {
                                if (Array.isArray(group)) {
                                    return group.map(enrichUser)
                                }
                                return group
                            })
                        } else {
                            // 单组结构：处理用户数组
                            enrichedUsers = item.users.map(enrichUser)
                        }
                        
                        return {
                            ...item,
                            users: enrichedUsers
                        }
                    }
                    return item
                })
                
                setDutyData(enrichedData)
            } else {
            setDutyData(data)
            }
        } catch (error) {
            console.error("Error:", error)
            message.error("加载数据失败")
        } finally {
            setLoading(false)
        }
    }, [id, currentYear, currentMonth])

    useEffect(() => {
        fetchData()
    }, [fetchData])


    // 查找匹配日期的值班数据的辅助函数
    const findMatchingDutyData = (date) => {
        return dutyData.find((item) => {
            const itemDate = new Date(item.time)
            return (
                itemDate.getFullYear() === date.year() &&
                itemDate.getMonth() === date.month() &&
                itemDate.getDate() === date.date()
            )
        })
    }

    const dateCellRender = (value) => {
        const today = new Date()
        const isToday =
            value.year() === today.getFullYear() && value.month() === today.getMonth() && value.date() === today.getDate()

        const matchingDutyData = findMatchingDutyData(value)

        const hasData = !!matchingDutyData
        const dayOfWeek = value.day()
        const weekday = ["日", "一", "二", "三", "四", "五", "六"][dayOfWeek]

        return (
            <div
                onDoubleClick={() => handleDoubleClick(value)}
                className={`
                    relative cursor-pointer p-2 min-h-[80px]
                    ${isToday
                    ? "bg-blue-100 border-2 border-blue-400"
                    : hasData
                        ? "bg-white border border-gray-200 hover:border-gray-300"
                        : "bg-white border border-gray-100"}
                  `}
                style={{
                    borderRadius: '4px'
                }}
            >
                {/* 日期显示 */}
                <div className="mb-1">
                    <div className={`text-sm font-semibold ${isToday ? "text-blue-600" : "text-gray-900"}`}>
                        {dateFullCellRender(value)}
                    </div>
                    <div className={`text-xs ${isToday ? "text-blue-500" : "text-gray-500"}`}>
                        周{weekday}
                    </div>
                    </div>

                {/* 值班人员信息 */}
                {matchingDutyData && matchingDutyData.users && matchingDutyData.users.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {/* 渲染用户信息的辅助函数 */}
                        {(() => {
                            const renderUser = (user) => {
                                const phoneNumber = user.mobile || user.phone || ''
                                const displayName = user.realName || user.username || ''
                                return (
                                    <div
                                        key={user.userid}
                                        className={`text-xs ${isToday ? "text-blue-700" : "text-gray-700"}`}
                                    >
                                        {phoneNumber ? `${displayName}(${phoneNumber})` : displayName}
                                    </div>
                                )
                            }
                            
                            // 检查是否为多组结构（二维数组）：判断第一个元素是否为数组
                            if (Array.isArray(matchingDutyData.users[0])) {
                                // 多组结构：[][]DutyUser
                                return matchingDutyData.users.map((userGroup, groupIndex) => {
                                    if (Array.isArray(userGroup) && userGroup.length > 0) {
                                        return (
                                            <div key={groupIndex} className="space-y-0.5">
                                                {userGroup.map(renderUser)}
                                            </div>
                                        )
                                    }
                                    return null
                                })
                            } else {
                                // 单组结构：[]DutyUser
                                return matchingDutyData.users.map(renderUser)
                            }
                        })()}
                    </div>
                )}

                {/* 修改按钮 */}
                {hasData && (
                    <div className="mt-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDoubleClick(value)
                            }}
                            className={`text-xs ${isToday ? "text-blue-300 hover:text-blue-100" : "text-gray-500 hover:text-gray-700"} hover:underline`}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            修改
                        </button>
                    </div>
                )}
            </div>
        )
    }

    const handleDoubleClick = (date) => {
        const matchingData = findMatchingDutyData(date)
        
        if (!matchingData) {
            return
        }

        if (!matchingData || !matchingData.users || matchingData.users.length === 0) {
            return // If no matching data or no duty groups, do nothing
        }
        setSelectedDayDutyUsers(matchingData.users) // Store the full matching data for the modal

        const m = date.month()
        const month = m + 1
        const year = date.year()

        setSelectedDate(`${year}-${month}-${date.date()}`)
        setModalVisible(true)
    }

    const dateFullCellRender = (date) => {
        const month = date.month() + 1 // month() 返回 0-11，需要 +1
        const day = date.date()
        return `${month}-${String(day).padStart(2, '0')}`
    }


    const handlePanelChange = (date) => {
        const year = date.year()
        const month = date.month()
        setCurrentYear(year)
        setCurrentMonth(month)
    }

    // 自定义日历头部渲染，显示年月和导航按钮
    const headerRender = ({ value, onChange }) => {
        const year = value.year()
        const month = value.month() + 1 // month() 返回 0-11，需要 +1 显示为 1-12
        
        // 更新月份状态的辅助函数
        const updateMonthState = (newValue) => {
            onChange(newValue)
            setCurrentYear(newValue.year())
            setCurrentMonth(newValue.month())
        }
        
        // 上个月
        const handlePrevMonth = () => {
            updateMonthState(value.clone().subtract(1, 'month'))
        }
        
        // 下个月
        const handleNextMonth = () => {
            updateMonthState(value.clone().add(1, 'month'))
        }
        
        // 今天
        const handleToday = () => {
            const today = new Date()
            updateMonthState(value.clone().year(today.getFullYear()).month(today.getMonth()).date(today.getDate()))
        }

        return (
            <div style={{ 
                padding: '8px 12px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#333' }}>
                    {year}年{month}月
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                        size="small" 
                        onClick={handlePrevMonth}
                        style={{ borderColor: '#d9d9d9' }}
                    >
                        上个月
                    </Button>
                    <Button 
                        size="small" 
                        onClick={handleToday}
                        style={{ borderColor: '#d9d9d9' }}
                    >
                        今天
                    </Button>
                    <Button 
                        size="small" 
                        onClick={handleNextMonth}
                        style={{ borderColor: '#d9d9d9' }}
                    >
                        下个月
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div>
            <Spin spinning={loading} tip="加载中..." className="custom-spin">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-black rounded-lg">
                            <CalendarIcon className="w-6 h-6 text-white"/>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">{calendarName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            type="primary"
                            size="default"
                            onClick={fetchData}
                            icon={<ReloadOutlined />}
                            style={{ backgroundColor: '#000000' }}
                            loading={loading}
                        >
                            刷新
                        </Button>

                        <Button
                            type="primary"
                            size="default"
                            style={{ backgroundColor: '#000000' }}
                            onClick={() => setCreateCalendarModal(true)}
                            icon={<PlusOutlined />}
                        >
                            发布
                        </Button>
                    </div>
                </div>

                {/* Calendar Section */}
                <div>
                    <Calendar
                        onPanelChange={handlePanelChange}
                        cellRender={dateCellRender}
                        headerRender={headerRender}
                        fullscreen={false}
                    />
                </div>

                {/* Modals */}
                <CreateCalendarModal
                    visible={createCalendarModal}
                    onClose={() => setCreateCalendarModal(false)}
                    dutyId={id}
                    onSuccess={fetchData}
                />

                <UpdateCalendarModal
                    visible={modalVisible}
                    onClose={() => {
                        setModalVisible(false)
                        setSelectedDayDutyUsers(null)
                    }} // Clear on close
                    onSuccess={fetchData}
                    time={selectedDate}
                    tenantId={tenantId}
                    dutyId={id}
                    date={selectedDate}
                    currentDutyUsers={selectedDayDutyUsers} // Pass the new prop
                />
            </Spin>
        </div>
    )
}

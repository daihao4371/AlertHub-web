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
        // Get data for current month and adjacent months to handle cross-month dates
        const currentMonthParams = {
            dutyId: dutyId,
            ...(year &&
                month !== undefined && {
                    time: year+"-"+(month + 1),
                }),
        }
        
        // Also fetch previous and next month data
        const prevMonth = month === 0 ? 11 : month - 1
        const prevYear = month === 0 ? year - 1 : year
        const nextMonth = month === 11 ? 0 : month + 1
        const nextYear = month === 11 ? year + 1 : year
        
        const prevMonthParams = {
            dutyId: dutyId,
            time: prevYear+"-"+(prevMonth + 1),
        }
        
        const nextMonthParams = {
            dutyId: dutyId,
            time: nextYear+"-"+(nextMonth + 1),
        }
        
        // Fetch all three months data in parallel
        const [currentRes, prevRes, nextRes] = await Promise.allSettled([
            searchCalendar(currentMonthParams),
            searchCalendar(prevMonthParams),
            searchCalendar(nextMonthParams)
        ])
        
        // Combine results
        let allData = []
        
        if (currentRes.status === 'fulfilled' && currentRes.value?.data) {
            allData = [...allData, ...currentRes.value.data]
        }
        if (prevRes.status === 'fulfilled' && prevRes.value?.data) {
            allData = [...allData, ...prevRes.value.data]
        }
        if (nextRes.status === 'fulfilled' && nextRes.value?.data) {
            allData = [...allData, ...nextRes.value.data]
        }
        
        return allData
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
        
        // Check if this date is in the current displayed month
        const isCurrentMonth = value.month() === currentMonth

        const matchingDutyData = findMatchingDutyData(value)

        const hasData = !!matchingDutyData

        return (
            <div
                onDoubleClick={() => handleDoubleClick(value)}
                className={`
                    flex flex-col cursor-pointer p-2
                    ${isToday
                    ? "bg-blue-50 border border-blue-200"
                    : hasData
                        ? "bg-white border border-gray-200 hover:border-gray-300"
                        : isCurrentMonth 
                            ? "bg-white border border-gray-100"
                            : "bg-gray-50 border border-gray-100"}
                  `}
                style={{
                    borderRadius: '4px',
                    minHeight: '140px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* 日期显示 - 固定在顶部 */}
                <div className="flex-shrink-0 mb-2">
                    <div className={`text-sm font-semibold ${ 
                        isToday ? "text-blue-600" : 
                        isCurrentMonth ? "text-gray-900" : 
                        "text-gray-400"
                    }`}>
                        {dateFullCellRender(value)}
                    </div>
                </div>

                {/* 值班人员信息 - 自动扩展区域，有最大高度限制 */}
                {matchingDutyData && matchingDutyData.users && matchingDutyData.users.length > 0 && (
                    <div 
                        className="flex-1 min-h-0"
                        style={{
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <div className="space-y-1" style={{ overflowY: 'auto', flex: 1 }}>
                            {/* 渲染用户信息的辅助函数 */}
                            {(() => {
                                const renderUser = (user) => {
                                    const phoneNumber = user.mobile || user.phone || ''
                                    const displayName = user.realName || user.username || ''
                                    return (
                                        <div
                                            key={user.userid}
                                            className={`text-xs leading-relaxed ${
                                                isToday ? "text-blue-700" : 
                                                isCurrentMonth ? "text-gray-700" : 
                                                "text-gray-500"
                                            }`}
                                            style={{
                                                wordBreak: 'break-word',
                                                lineHeight: '1.4'
                                            }}
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
                    </div>
                )}

                {/* 修改按钮 - 固定在底部，居中显示 */}
                {hasData && (
                    <div 
                        className="flex-shrink-0 mt-auto flex justify-center"
                        style={{
                            minHeight: '28px',
                            marginTop: '10px',
                            paddingTop: '6px'
                        }}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDoubleClick(value)
                            }}
                            className={`text-xs transition-all duration-200 rounded ${
                                isToday 
                                    ? "text-blue-500 hover:text-blue-600 hover:bg-blue-50" 
                                    : isCurrentMonth 
                                        ? "text-gray-500 hover:text-gray-700 hover:bg-gray-50" 
                                        : "text-gray-400 hover:text-gray-500 hover:bg-gray-50"
                            }`}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                lineHeight: '1.4',
                                fontWeight: '400',
                                letterSpacing: '0.3px'
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
        
        if (!matchingData || !matchingData.users || matchingData.users.length === 0) {
            return
        }
        
        setSelectedDayDutyUsers(matchingData.users)
        const month = date.month() + 1
        const year = date.year()
        setSelectedDate(`${year}-${month}-${date.date()}`)
        setModalVisible(true)
    }

    const dateFullCellRender = (date) => {
        const month = date.month() + 1
        const day = date.date()
        return `${month}-${String(day).padStart(2, '0')}`
    }


    const handlePanelChange = (date) => {
        const year = date.year()
        const month = date.month()
        setCurrentYear(year)
        setCurrentMonth(month)
    }

    const headerRender = ({ value, onChange }) => {
        const year = value.year()
        const month = value.month() + 1
        
        const updateMonthState = (newValue) => {
            onChange(newValue)
            setCurrentYear(newValue.year())
            setCurrentMonth(newValue.month())
        }
        
        const handlePrevMonth = () => {
            updateMonthState(value.clone().subtract(1, 'month'))
        }
        
        const handleNextMonth = () => {
            updateMonthState(value.clone().add(1, 'month'))
        }
        
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
                    <style>
                        {`
                        /* Hide the 6th week row in Ant Design Calendar to show only 5 weeks */
                        .ant-picker-calendar tbody tr:nth-child(6) {
                            display: none !important;
                        }
                        
                        /* Alternative selectors for different Ant Design versions */
                        .ant-picker-panel-body tbody tr:nth-child(6) {
                            display: none !important;
                        }
                        
                        /* For older Ant Design versions */
                        .ant-fullcalendar tbody tr:nth-child(6) {
                            display: none !important;
                        }
                        
                        /* Additional selectors to ensure compatibility */
                        .ant-picker-calendar .ant-picker-panel .ant-picker-date-panel .ant-picker-body tbody tr:nth-child(6) {
                            display: none !important;
                        }
                        
                        /* Hide default date value display in non-fullscreen calendar */
                        .ant-picker-calendar .ant-picker-cell-inner .ant-picker-calendar-date-value {
                            display: none !important;
                        }
                        
                        /* Hide calendar date content that appears alongside custom cellRender */
                        .ant-picker-calendar .ant-picker-cell-inner .ant-picker-calendar-date {
                            display: none !important;
                        }
                        
                        /* Hide direct text nodes that are just numbers (default date display) */
                        .ant-picker-calendar .ant-picker-cell-inner::before {
                            content: none !important;
                        }
                        
                        /* Ensure calendar displays properly with 5 weeks */
                        .ant-picker-calendar {
                            width: 100%;
                        }
                        
                        /* Ensure table structure is maintained */
                        .ant-picker-calendar .ant-picker-panel .ant-picker-date-panel .ant-picker-body table {
                            width: 100%;
                            table-layout: fixed;
                        }
                        
                        /* 确保日历单元格有足够的高度，防止内容重叠 */
                        .ant-picker-calendar .ant-picker-cell {
                            height: auto !important;
                            min-height: 140px !important;
                            vertical-align: top !important;
                        }
                        
                        .ant-picker-calendar .ant-picker-cell-inner {
                            height: 100% !important;
                            min-height: 140px !important;
                            display: flex !important;
                            flex-direction: column !important;
                        }
                        
                        /* 确保表格行有足够高度 */
                        .ant-picker-calendar .ant-picker-panel .ant-picker-date-panel .ant-picker-body tbody tr {
                            height: auto !important;
                        }
                        
                        .ant-picker-calendar .ant-picker-panel .ant-picker-date-panel .ant-picker-body tbody td {
                            height: auto !important;
                            min-height: 140px !important;
                            vertical-align: top !important;
                            padding: 4px !important;
                        }
                        `}
                    </style>
                    <Calendar
                        onPanelChange={handlePanelChange}
                        cellRender={dateCellRender}
                        headerRender={headerRender}
                        fullscreen={false}
                        style={{ width: '100%' }}
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
                    }}
                    onSuccess={fetchData}
                    time={selectedDate}
                    tenantId={tenantId}
                    dutyId={id}
                    date={selectedDate}
                    currentDutyUsers={selectedDayDutyUsers}
                />
            </Spin>
        </div>
    )
}

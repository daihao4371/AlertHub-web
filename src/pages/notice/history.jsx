"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
    Table,
    message,
    Tag,
    Button,
    Drawer,
    Divider,
    Input,
    Select,
    Space,
    Typography,
    Descriptions,
    Tooltip,
    Empty,
    Skeleton,
} from "antd"
import { noticeRecordList } from "../../api/notice"
import TextArea from "antd/es/input/TextArea"
import { NotificationTypeIcon } from "./notification-type-icon"
import { SearchIcon, FilterIcon, AlertTriangle, CheckCircle, XCircle, Clock, FileText, RefreshCw } from "lucide-react"
import {HandleShowTotal} from "../../utils/lib";
import {ReloadOutlined} from "@ant-design/icons";

const { Title, Text } = Typography
const { Search } = Input

// Constants
const SEVERITY_LABELS = {
    P0: "P0",
    P1: "P1",
    P2: "P2",
}

// 告警等级映射配置，包含文本和样式信息
const SEVERITY_MAP = {
    P0: { 
        text: "P0",
        style: {
            background: "linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(255, 77, 79, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
    P1: { 
        text: "P1",
        style: {
            background: "linear-gradient(135deg, #ffb84d 0%, #faad14 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(250, 173, 20, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
    P2: { 
        text: "P2",
        style: {
            background: "linear-gradient(135deg, #91d5ff 0%, #69c0ff 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(105, 192, 255, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
}

// 发送状态映射配置，包含文本和样式信息
const STATUS_MAP = {
    0: { 
        text: "发送成功",
        style: {
            background: "linear-gradient(135deg, #73d13d 0%, #52c41a 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(82, 196, 26, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
    1: { 
        text: "发送失败",
        style: {
            background: "linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%)",
            border: "none",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(255, 77, 79, 0.3)",
            padding: "2px 12px",
            fontSize: "12px",
            color: "#fff"
        }
    },
}

const ITEMS_PER_PAGE = 10

export const NoticeRecords = () => {
    const [height, setHeight] = useState(window.innerHeight)
    const [loading, setLoading] = useState(false)
    const [list, setList] = useState([])
    const [selectedRecord, setSelectedRecord] = useState(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [filters, setFilters] = useState({
        severity: undefined,
        status: undefined,
        query: "",
    })
    const [pagination, setPagination] = useState({
        pageIndex: 1,
        pageSize: ITEMS_PER_PAGE,
        pageTotal: 0,
    })

    // Table columns definition
    const columns = useMemo(
        () => [
            {
                title: "规则名称",
                dataIndex: "ruleName",
                key: "ruleName",
                ellipsis: true,
                render: (_, record) => (
                    <Tooltip title={record.ruleName}>
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={() => showDrawer(record)}
                            style={{ cursor: 'pointer', color: 'rgb(22, 119, 255)', textDecoration: 'none', marginTop: '1px' }}
                            >
                                {record.ruleName}
                        </span>
                    </Tooltip>
                ),
            },
            {
                title: "告警等级",
                dataIndex: "severity",
                key: "severity",
                width: 120,
                render: (text) => {
                    const severityInfo = SEVERITY_MAP[text]
                    return (
                        <Tag style={severityInfo?.style || {}}>
                            {severityInfo?.text || SEVERITY_LABELS[text] || text}
                        </Tag>
                    )
                },
            },
            {
                title: "通知类型",
                dataIndex: "nType",
                key: "nType",
                width: 120,
                render: (type) => (
                    <div style={{ display: "flex" }}>
                        <NotificationTypeIcon type={type} />
                    </div>
                ),
            },
            {
                title: "通知对象",
                dataIndex: "nObj",
                key: "nObj",
                ellipsis: true,
                render: (text) => (
                    <Tooltip title={text}>
                        <span>{text}</span>
                    </Tooltip>
                ),
            },
            {
                title: "状态",
                dataIndex: "status",
                key: "status",
                width: 120,
                render: (status) => {
                    const statusInfo = STATUS_MAP[status]
                    return (
                        <Tag style={statusInfo.style}>
                            {statusInfo.text}
                        </Tag>
                    )
                },
            },
            {
                title: "通知时间",
                dataIndex: "createAt",
                key: "createAt",
                width: 180,
                render: (text) => {
                    const date = new Date(text * 1000)
                    return (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{date.toLocaleString()}</span>
                        </div>
                    )
                },
            },
        ],
        [],
    )

    // Initialize chart and fetch data
    useEffect(() => {
        const handleResize = () => {
            setHeight(window.innerHeight)
        }

        fetchRecords(pagination.pageIndex, pagination.pageSize)

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
        }
    }, [])

    // Fetch records when filters change
    useEffect(() => {
        fetchRecords(1, pagination.pageSize)
    }, [filters])

    // Fetch notification records
    const fetchRecords = async (pageIndex, pageSize) => {
        try {
            setLoading(true)
            const params = {
                index: pageIndex,
                size: pageSize,
                severity: filters.severity,
                status: filters.status,
                query: filters.query || undefined,
            }

            const res = await noticeRecordList(params)

            setList(res.data.list || [])
            setPagination({
                pageIndex: res.data.index,
                pageSize,
                pageTotal: res.data.total,
            })
        } catch (error) {
            console.error("Failed to load records:", error)
            message.error("加载通知记录失败，请稍后重试")
        } finally {
            setLoading(false)
        }
    }

    // Handle page change
    const handlePageChange = (page) => {
        const newPagination = {
            ...pagination,
            pageIndex: page.current,
            pageSize: page.pageSize,
        }
        setPagination(newPagination)
        fetchRecords(page.current, page.pageSize)
    }

    // Format pagination display
    const handleShowTotal = (total, range) => `第 ${range[0]} - ${range[1]} 条 共 ${total} 条`

    // Show drawer with record details
    const showDrawer = (record) => {
        setSelectedRecord(record)
        setDrawerOpen(true)
    }

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    // Handle refresh
    const handleRefresh = () => {
        fetchRecords(pagination.pageIndex, pagination.pageSize)
    }

    return (
        <div style={{ minHeight: "80vh" }}>
            {/* Filters */}
            <div
                style={{
                    marginTop: '-10px',
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "20px",
                }}
            >
                
                <Select
                    placeholder="告警等级"
                    allowClear
                    style={{ width: 140 }}
                    value={filters.severity}
                    onChange={(value) => handleFilterChange("severity", value)}
                    options={[
                        { value: "P0", label: "P0级告警" },
                        { value: "P1", label: "P1级告警" },
                        { value: "P2", label: "P2级告警" },
                    ]}
                    suffixIcon={<AlertTriangle size={14} />}
                />

                <Select
                    placeholder="发送状态"
                    allowClear
                    style={{ width: 140 }}
                    value={filters.status}
                    onChange={(value) => handleFilterChange("status", value)}
                    options={[
                        { value: "0", label: "发送成功" },
                        { value: "1", label: "发送失败" },
                    ]}
                />

                <Search
                    allowClear
                    placeholder="输入搜索关键字"
                    value={filters.query}
                    onChange={(e) => handleFilterChange("query", e.target.value)}
                    onSearch={() => fetchRecords(1, pagination.pageSize)}
                    style={{ width: 300 }}
                    prefix={<SearchIcon size={14} />}
                />

                <Button type="default" icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                    刷新
                </Button>
            </div>

            {/* Records Table */}
            <Table
                columns={columns}
                dataSource={list}
                loading={loading}
                scroll={{
                    y: height - 280,
                    x: "max-content",
                }}
                pagination={{
                    current: pagination.pageIndex,
                    pageSize: pagination.pageSize,
                    total: pagination.pageTotal,
                    showTotal: HandleShowTotal,
                    showSizeChanger: true,
                    pageSizeOptions: ["10"],
                    style: { marginTop: "16px" },
                }}
                onChange={handlePageChange}
                style={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    overflow: "hidden",
                }}
                rowKey={(record) => record.id}
                locale={{
                    emptyText: <Empty description="暂无通知记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                }}
            />

            {/* Detail Drawer */}
            <Drawer
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>通知详情</span>
                    </div>
                }
                size="large"
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
                styles={{
                    header: { borderBottom: "1px solid #f0f0f0", padding: "16px 24px" },
                    body: { padding: "24px" },
                }}
                extra={
                    selectedRecord && (
                        <Space>
                            <Tag style={SEVERITY_MAP[selectedRecord.severity]?.style || {}}>
                                {SEVERITY_MAP[selectedRecord.severity]?.text || selectedRecord.severity}
                            </Tag>
                            <Tag style={STATUS_MAP[selectedRecord.status].style}>
                                {STATUS_MAP[selectedRecord.status].text}
                            </Tag>
                        </Space>
                    )
                }
            >
                {selectedRecord ? (
                    <Descriptions
                            bordered
                            column={1}
                            style={{ marginBottom: '24px' }}
                            labelStyle={{ width: '120px' }}
                            items={[
                                {
                                    label: '规则名称',
                                    children: selectedRecord.ruleName,
                                },
                                {
                                    label: '告警等级',
                                    children: (
                                        <Tag style={SEVERITY_MAP[selectedRecord.severity]?.style || {}}>
                                            {SEVERITY_MAP[selectedRecord.severity]?.text || selectedRecord.severity}
                                        </Tag>
                                    ),
                                },
                                {
                                    label: '通知对象',
                                    children: selectedRecord.nObj,
                                },
                                {
                                    label: 'Request',
                                    children: (
                                       <TextArea
                                            value={selectedRecord.alarmMsg}
                                            style={{
                                                height: 250,
                                                resize: "none",
                                            }}
                                            readOnly
                                        />
                                    ),
                                },
                                {
                                    label: 'Response',
                                    children: (
                                       <TextArea
                                            value={selectedRecord.errMsg || "Success"}
                                            style={{
                                                height: 250,
                                                resize: "none",
                                            }}
                                            readOnly
                                        />
                                    ),
                                },
                            ]}
                        />
                ) : (
                    <Skeleton active paragraph={{ rows: 10 }} />
                )}
            </Drawer>
        </div>
    )
}

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Row,
  Col,
  Statistic,
  Select,
  Input,
  Button,
  Tag,
  Space,
  message,
  Tooltip
} from "antd"
import {
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SyncOutlined
} from "@ant-design/icons"
import { getExporterStatus, getExporterConfig, updateAutoRefresh, triggerInspection } from "../../api/exporterMonitor"
import { getDatasourceList } from "../../api/datasource"
import { useNavigate } from "react-router-dom"
import { copyToClipboard } from "../../utils/copyToClipboard"
import { HandleShowTotal } from "../../utils/lib"
import { TableWithPagination } from "../../utils/TableWithPagination"
import './index.css'

const { Option } = Select

export const ExporterMonitor = () => {
  const navigate = useNavigate()
  const [tableLoading, setTableLoading] = useState(false)
  const [summary, setSummary] = useState({
    totalCount: 0,
    upCount: 0,
    downCount: 0,
    unknownCount: 0,
    availabilityRate: 0,
    lastUpdateTime: ""
  })
  const [exporters, setExporters] = useState([])
  const [datasources, setDatasources] = useState([])
  const [filters, setFilters] = useState({
    datasourceId: undefined,
    status: undefined,
    job: undefined,
    keyword: ""
  })
  // 自动刷新状态(默认关闭,改为按需手动刷新)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const timerRef = useRef(null)
  // 窗口高度，用于计算表格滚动高度
  const [height, setHeight] = useState(window.innerHeight)

  // 获取数据源列表
  const fetchDatasources = async () => {
    try {
      const res = await getDatasourceList({ type: "Prometheus" })
      if (res?.data) {
        setDatasources(res.data)
      }
    } catch (error) {
      console.error("获取数据源列表失败:", error)
    }
  }

  // 获取配置中的自动刷新状态
  const fetchAutoRefreshStatus = async () => {
    try {
      const res = await getExporterConfig()
      if (res?.data?.monitorConfig) {
        const autoRefreshValue = res.data.monitorConfig.autoRefresh || false
        setAutoRefresh(autoRefreshValue)
      }
    } catch (error) {
      console.error("获取自动刷新状态失败:", error)
    }
  }

  // 获取Exporter状态数据
  const fetchExporterStatus = useCallback(async () => {
    try {
      setTableLoading(true)
      const res = await getExporterStatus(filters)
      if (res?.data) {
        setSummary(res.data.summary || {})
        setExporters(res.data.exporters || [])
      }
    } catch (error) {
      console.error("获取Exporter状态失败:", error)
      message.error("获取Exporter状态失败")
    } finally {
      setTableLoading(false)
    }
  }, [filters])

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setHeight(window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 初始化加载
  useEffect(() => {
    fetchDatasources()
    fetchAutoRefreshStatus()
    fetchExporterStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 当筛选条件变化时重新获取数据并重置分页
  useEffect(() => {
    setPagination(prev => ({ ...prev, index: 1 }))
    fetchExporterStatus()
  }, [filters.datasourceId, filters.status, filters.job, fetchExporterStatus])

  // 自动刷新
  useEffect(() => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (autoRefresh) {
      // 创建新的定时器
      timerRef.current = setInterval(() => {
        fetchExporterStatus()
      }, 30000) // 30秒刷新一次
    }

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [autoRefresh, fetchExporterStatus])

  // 切换自动刷新状态
  const toggleAutoRefresh = async () => {
    const newState = !autoRefresh
    try {
      await updateAutoRefresh(newState)
      setAutoRefresh(newState)
      message.success(newState ? "已开启自动刷新" : "已停止自动刷新")
    } catch (error) {
      message.error("更新自动刷新状态失败")
    }
  }

  // 手动触发巡检
  const [inspecting, setInspecting] = useState(false)
  const handleTriggerInspection = async () => {
    try {
      setInspecting(true)
      // 调用巡检 API (不指定数据源ID,巡检所有数据源)
      await triggerInspection()
      // 等待 2 秒后自动刷新数据
      setTimeout(() => {
        fetchExporterStatus()
      }, 2000)
    } catch (error) {
      message.error("触发巡检失败")
    } finally {
      setInspecting(false)
    }
  }

  // 获取唯一的Job列表
  const getUniqueJobs = () => {
    const jobs = [...new Set(exporters.map(exp => exp.job))]
    return jobs.filter(Boolean)
  }

  // 获取状态标签
  const getStatusTag = (status) => {
    switch (status) {
      case "up":
        return (
          <Tag 
            icon={<CheckCircleOutlined />} 
            className="exporter-status-tag exporter-status-tag-up"
          >
            UP
          </Tag>
        )
      case "down":
        return (
          <Tag 
            icon={<CloseCircleOutlined />} 
            className="exporter-status-tag exporter-status-tag-down"
          >
            DOWN
          </Tag>
        )
      case "unknown":
        return (
          <Tag 
            icon={<QuestionCircleOutlined />} 
            className="exporter-status-tag exporter-status-tag-unknown"
          >
            UNKNOWN
          </Tag>
        )
      default:
        return <Tag className="exporter-status-tag">{status}</Tag>
    }
  }

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return "-"
    return new Date(timeStr).toLocaleString("zh-CN")
  }

  // 格式化Labels
  const formatLabels = (labels) => {
    if (!labels || typeof labels !== "object") return "-"
    return Object.entries(labels)
      .filter(([key]) => !key.startsWith("__"))
      .map(([key, value]) => `${key}=${value}`)
      .join(", ")
  }


  // 导出CSV
  const exportToCSV = () => {
    const headers = ["数据源", "Job", "实例名称", "IP:端口", "状态", "最后采集时间", "错误信息"]
    const rows = exporters.map(exp => [
      exp.datasourceName || exp.datasourceId,
      exp.job,
      exp.instance,
      exp.instance,
      exp.status,
      formatTime(exp.lastScrapeTime),
      exp.lastError || "-"
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `exporter_status_${Date.now()}.csv`
    link.click()
    message.success("导出成功")
  }

  // 表格列定义
  const columns = [
    {
      title: "数据源",
      dataIndex: "datasourceName",
      key: "datasourceName",
      width: 150,
      ellipsis: true,
      render: (text, record) => text || record.datasourceId
    },
    {
      title: "Job",
      dataIndex: "job",
      key: "job",
      width: 150,
      ellipsis: true
    },
    {
      title: "实例名称",
      dataIndex: "instance",
      key: "instance",
      width: 200,
      ellipsis: true,
      render: (text) => (
        <Tooltip title="点击复制">
          <span
            style={{ cursor: "pointer", color: "#1890ff" }}
            onClick={() => copyToClipboard(text)}
          >
            {text}
          </span>
        </Tooltip>
      )
    },
    {
      title: "Labels",
      dataIndex: "labels",
      key: "labels",
      width: 250,
      ellipsis: true,
      render: formatLabels
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      align: "center",
      render: getStatusTag
    },
    {
      title: "最后采集时间",
      dataIndex: "lastScrapeTime",
      key: "lastScrapeTime",
      width: 180,
      render: formatTime
    },
    {
      title: "错误信息",
      dataIndex: "lastError",
      key: "lastError",
      width: 250,
      ellipsis: true,
      render: (text) => (
        text ? (
          <Tooltip title={text}>
            <span style={{ color: "#ff4d4f" }}>{text}</span>
          </Tooltip>
        ) : "-"
      )
    }
  ]

  // 分页状态
  const [pagination, setPagination] = useState({
    index: 1,
    size: 10,
    total: 0,
  })

  // 更新分页总数，当数据变化时重置到第一页（仅在筛选条件变化时）
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: exporters.length
    }))
  }, [exporters.length])

  // 处理分页变化
  const handlePageChange = (page, pageSize) => {
    setPagination({ ...pagination, index: page, size: pageSize })
  }

  // 处理每页条数变化
  const handlePageSizeChange = (current, size) => {
    setPagination({ ...pagination, index: current, size })
  }

  // 获取当前页数据
  const getCurrentPageData = () => {
    const { index, size } = pagination
    const start = (index - 1) * size
    const end = start + size
    return exporters.slice(start, end)
  }

  return (
    <>
      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
        <Col xs={24} sm={12} md={6}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e8e8e8",
              borderRadius: "12px",
              padding: "24px",
              height: "100%",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <span style={{ color: "#8c8c8c", fontSize: "14px" }}>总数</span>
            </div>
            <Statistic
              value={summary.totalCount}
              valueStyle={{ fontSize: "32px", fontWeight: "600", color: "#000000" }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e8e8e8",
              borderRadius: "12px",
              padding: "24px",
              height: "100%",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <span style={{ color: "#8c8c8c", fontSize: "14px" }}>UP</span>
            </div>
            <Statistic
              value={summary.upCount}
              valueStyle={{ fontSize: "32px", fontWeight: "600", color: "#52c41a" }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e8e8e8",
              borderRadius: "12px",
              padding: "24px",
              height: "100%",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <span style={{ color: "#8c8c8c", fontSize: "14px" }}>DOWN</span>
            </div>
            <Statistic
              value={summary.downCount}
              valueStyle={{ fontSize: "32px", fontWeight: "600", color: "#ff4d4f" }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e8e8e8",
              borderRadius: "12px",
              padding: "24px",
              height: "100%",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <span style={{ color: "#8c8c8c", fontSize: "14px" }}>可用率</span>
            </div>
            <Statistic
              value={summary.availabilityRate}
              suffix="%"
              precision={2}
              valueStyle={{ fontSize: "32px", fontWeight: "600", color: summary.availabilityRate >= 95 ? "#52c41a" : "#faad14" }}
            />
          </div>
        </Col>
      </Row>

      {/* 筛选与操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          <Select
            style={{ width: "180px" }}
            placeholder="选择数据源"
            allowClear
            value={filters.datasourceId}
            onChange={(value) => setFilters({ ...filters, datasourceId: value })}
          >
            {datasources.map((ds) => (
              <Option key={ds.id} value={ds.id}>
                {ds.name}
              </Option>
            ))}
          </Select>
          <Select
            style={{ width: "120px" }}
            placeholder="选择状态"
            allowClear
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          >
            <Option value="up">UP</Option>
            <Option value="down">DOWN</Option>
            <Option value="unknown">UNKNOWN</Option>
          </Select>
          <Select
            style={{ width: "150px" }}
            placeholder="选择Job"
            allowClear
            value={filters.job}
            onChange={(value) => setFilters({ ...filters, job: value })}
          >
            {getUniqueJobs().map((job) => (
              <Option key={job} value={job}>
                {job}
              </Option>
            ))}
          </Select>
          <Input
            placeholder="搜索 IP/实例名称/标签..."
            prefix={<SearchOutlined />}
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            onPressEnter={fetchExporterStatus}
            style={{ width: "250px" }}
          />
        </div>
        <div>
          <Space>
            <Tooltip title="手动触发巡检,实时采集最新状态">
              <Button
                icon={<SyncOutlined spin={inspecting} />}
                onClick={handleTriggerInspection}
                loading={inspecting}
              >
                立即巡检
              </Button>
            </Tooltip>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={fetchExporterStatus}
              loading={tableLoading}
            >
              刷新
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportToCSV}
              disabled={exporters.length === 0}
            >
              导出
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => navigate("/exporterMonitor/config")}
            >
              配置
            </Button>
            <Button
              type={autoRefresh ? "primary" : "default"}
              onClick={toggleAutoRefresh}
            >
              {autoRefresh ? "停止自动刷新" : "开启自动刷新"}
            </Button>
          </Space>
        </div>
      </div>

      {/* Exporter列表表格 */}
      <TableWithPagination
        columns={columns}
        dataSource={getCurrentPageData()}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        scrollY={height - 480}
        rowKey={(record) => `${record.datasourceId}_${record.instance}`}
        showTotal={HandleShowTotal}
        loading={tableLoading}
      />
    </>
  )
}

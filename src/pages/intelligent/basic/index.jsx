"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Input, Descriptions, Tabs, Button, Row, Col, Typography, Select, Space } from "antd"
import { EditOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons"
import { FaultCenterReset, FaultCenterSearch, FaultCenterSlo, FaultCenterList } from "../../../api/faultCenter"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { AlertCurrentEvent } from "../../event/currentEvent"
import { AlertHistoryEvent } from "../../event/historyEvent"
import { Silences } from "../../silence"
import { FaultCenterNotify } from "../../faultCenter/notify"
import { AlarmUpgrade } from "../../faultCenter/upgrade"
import "../../faultCenter/index.css"
import moment from "moment"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

const { Option } = Select

/**
 * 基本信息页面 - 故障中心详情
 */
export const IntelligentBasic = () => {
  // Try to get id from URL params first, if not available, use selector
  const { id: urlId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedFaultCenterId, setSelectedFaultCenterId] = useState(urlId || "")
  const [faultCenterList, setFaultCenterList] = useState([])
  const [detail, setDetail] = useState({})
  const [editingField, setEditingField] = useState(null)
  const [tempValue, setTempValue] = useState("")

  // Parse tab from URL, default to '1'
  const getInitialTabKey = () => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get("tab") || "1"
  }

  const [activeTabKey, setActiveTabKey] = useState(getInitialTabKey)
  const [sloChartData, setSloChartData] = useState([]) // [{date, mttr, mtta, mtbf}, ...]

  // Calculate average from list
  const computeAverageFromList = (key) => {
    if (!Array.isArray(sloChartData) || sloChartData.length === 0) return null
    const vals = sloChartData
      .map((d) => {
        const v = Number(d[key])
        return isNaN(v) ? null : Math.round(v)
      })
      .filter((v) => v !== null)
    if (vals.length === 0) return null
    const sum = vals.reduce((a, b) => a + b, 0)
    return Math.round(sum / vals.length)
  }

  // Fetch fault center list
  const fetchFaultCenterList = useCallback(async () => {
    try {
      const res = await FaultCenterList()
      if (res && res.data) {
        const newData = Array.isArray(res.data) ? res.data : []
        setFaultCenterList(newData)
        // If URL has id, use it; otherwise use first item
        if (urlId && !selectedFaultCenterId) {
          setSelectedFaultCenterId(urlId)
        } else if (!selectedFaultCenterId && newData.length > 0) {
          setSelectedFaultCenterId(newData[0].id)
        }
      }
    } catch (error) {
      console.error("获取故障中心列表失败:", error)
    }
  }, [urlId, selectedFaultCenterId])

  const handleList = useCallback(async () => {
    if (!selectedFaultCenterId) return
    try {
      const params = { id: selectedFaultCenterId }
      const res = await FaultCenterSearch(params)
      setDetail(res.data)
    } catch (error) {
      console.error(error)
    }
  }, [selectedFaultCenterId])

  const handleGetSlo = useCallback(async () => {
    if (!selectedFaultCenterId) return
    try {
      const params = {
        tenantId: localStorage.getItem("TenantID"),
        id: selectedFaultCenterId,
      }
      const res = await FaultCenterSlo(params)

      if (res.code === 200 && res.data) {
        const mttaArr = Array.isArray(res.data.mtta) ? res.data.mtta : []
        const mttrArr = Array.isArray(res.data.mttr) ? res.data.mttr : []
        const mtbfArr = Array.isArray(res.data.mtbf) ? res.data.mtbf : []

        // Construct last 7 days dates
        const days = []
        for (let i = 0; i < 7; i++) {
          days.push(
            moment()
              .subtract(6 - i, "days")
              .format("MM-DD"),
          )
        }

        const data = days.map((d, idx) => ({
          date: d,
          mtta: Math.round(Number(mttaArr[idx] ?? 0)),
          mttr: Math.round(Number(mttrArr[idx] ?? 0)),
          mtbf: Math.round(Number(mtbfArr[idx] ?? 0)),
        }))

        setSloChartData(data)
      }
    } catch (error) {
      console.error("获取 SLO 数据失败:", error)
    }
  }, [selectedFaultCenterId])

  useEffect(() => {
    fetchFaultCenterList()
  }, [fetchFaultCenterList])

  // When URL id changes, update selected fault center
  useEffect(() => {
    if (urlId) {
      setSelectedFaultCenterId(urlId)
    }
  }, [urlId])

  // Load detail and SLO when selected fault center changes
  useEffect(() => {
    if (selectedFaultCenterId) {
      handleList()
      handleGetSlo()
    }
  }, [selectedFaultCenterId, handleList, handleGetSlo])

  // Update activeTabKey when URL search params change
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const tabFromUrl = searchParams.get("tab")
    if (tabFromUrl) {
      setActiveTabKey(tabFromUrl)
    }
  }, [location.search])

  const handleEdit = (field) => {
    setEditingField(field)
    setTempValue(detail[field] || "")
  }

  const handleSave = async (field) => {
    if (!selectedFaultCenterId) return
    try {
      setDetail({ ...detail, [field]: tempValue })
      setEditingField(null)

      const params = {
        id: selectedFaultCenterId,
        [field]: tempValue,
      }
      await FaultCenterReset(params)
    } catch (error) {
      console.error("保存失败:", error)
    }
  }

  const handleCancel = () => {
    setEditingField(null)
  }

  // Format duration (seconds to readable format)
  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return "-"
    const s = Number(seconds)
    if (isNaN(s)) return "-"
    const total = Math.abs(Math.floor(s))
    const days = Math.floor(total / 86400)
    const hours = Math.floor((total % 86400) / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const secs = total % 60
    const parts = []
    if (days) parts.push(`${days}天`)
    if (hours) parts.push(`${hours}小时`)
    if (minutes) parts.push(`${minutes}分`)
    if (secs || parts.length === 0) parts.push(`${secs}秒`)
    return parts.join(" ")
  }

  // Tab change callback
  const onTabChange = (key) => {
    setActiveTabKey(key)
    const searchParams = new URLSearchParams(location.search)
    searchParams.set("tab", key)
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true })
  }

  // Tab items
  const tagItems = [
    {
      key: "1",
      label: "活跃告警",
      children: selectedFaultCenterId ? <AlertCurrentEvent id={selectedFaultCenterId} /> : null,
    },
    {
      key: "2",
      label: "历史告警",
      children: selectedFaultCenterId ? <AlertHistoryEvent id={selectedFaultCenterId} /> : null,
    },
    {
      key: "3",
      label: "降噪配置",
      children: selectedFaultCenterId ? <Silences faultCenterId={selectedFaultCenterId} aggregationType={detail.aggregationType} /> : null,
    },
    {
      key: "4",
      label: "通知配置",
      children: selectedFaultCenterId ? <FaultCenterNotify id={selectedFaultCenterId} /> : null,
    },
    {
      key: "5",
      label: "告警升级",
      children: <AlarmUpgrade />,
    },
  ]

  // Description items
  const describeItems = [
    {
      key: "1",
      label: "ID",
      children: detail.id || selectedFaultCenterId || "-",
    },
    {
      key: "2",
      label: "名称",
      children: (
        <div style={{ display: "flex", alignItems: "center", marginTop: "-5px" }}>
          {editingField === "name" ? (
            <>
              <Input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                style={{ width: "200px", marginRight: "8px" }}
              />
              <Button type="text" icon={<CheckOutlined />} onClick={() => handleSave("name")} />
              <Button type="text" icon={<CloseOutlined />} onClick={handleCancel} />
            </>
          ) : (
            <>
              {detail.name || "-"}
              {selectedFaultCenterId && (
                <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit("name")} />
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: "3",
      label: "描述",
      children: (
        <div style={{ display: "flex", alignItems: "center", marginTop: "-5px" }}>
          {editingField === "description" ? (
            <>
              <Input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                style={{ width: "200px", marginRight: "8px" }}
            />
              <Button type="text" icon={<CheckOutlined />} onClick={() => handleSave("description")} />
              <Button type="text" icon={<CloseOutlined />} onClick={handleCancel} />
            </>
          ) : (
            <>
              {detail.description || "-"}
              {selectedFaultCenterId && (
                <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit("description")} />
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div style={{ textAlign: "left" }}>
      {/* Fault Center Selector */}
      {!urlId && (
        <Space style={{ marginBottom: 16, width: "100%" }}>
          <span>选择故障中心：</span>
          <Select
            style={{ width: 300 }}
            placeholder="请选择故障中心"
            value={selectedFaultCenterId}
            onChange={(value) => setSelectedFaultCenterId(value)}
          >
            {faultCenterList.map((center) => (
              <Option key={center.id} value={center.id}>
                {center.name || center.id}
              </Option>
            ))}
          </Select>
        </Space>
      )}

      {/* Show content only when fault center is selected */}
      {selectedFaultCenterId ? (
        <>
          <Descriptions items={describeItems} />

            {/* SLO Charts */}
            <Row gutter={16} style={{ marginTop: 8, marginBottom: 20 }}>
              <Col span={12}>
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid #ddddddff",
                    height: 250,
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}
                  >
                    <div>
                      <Typography.Text style={{ fontSize: 13, color: "#000000ff", fontWeight: 600, display: "block" }}>
                        平均修复时间 (MTTR)
                      </Typography.Text>
                      <Typography.Text style={{ fontSize: 11, color: "#6b7280", display: "block", marginTop: 2 }}>
                        Mean Time To Repair
                      </Typography.Text>
                    </div>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: 18, color: "#fff" }}>⚡</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Typography.Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4, display: "block" }}>
                      7日平均: {formatDuration(computeAverageFromList("mttr"))}
                    </Typography.Text>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={sloChartData}>
                      <defs>
                        <linearGradient id="mttrGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#cacacaff" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#cacacaff" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cacacaff" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={{ stroke: "#cacacaff" }}
                        tickLine={{ stroke: "#cacacaff" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={{ stroke: "#cacacaff" }}
                        tickLine={{ stroke: "#cacacaff" }}
                        tickFormatter={(value) => `${value}s`}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #cacacaff",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#000000ff", fontWeight: 600 }}
                        formatter={(value) => formatDuration(value)}
                      />
                      <Area
                        type="monotone"
                        dataKey="mttr"
                        stroke="#000000ff"
                        strokeWidth={1.5}
                        fill="url(#mttrGradient)"
                        dot={{ fill: "#000000ff", strokeWidth: 1, r: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Col>

              <Col span={12}>
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid #ddddddff",
                    height: 250,
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}
                  >
                    <div>
                      <Typography.Text style={{ fontSize: 13, color: "#000000ff", fontWeight: 600, display: "block" }}>
                        平均响应时间 (MTTA)
                      </Typography.Text>
                      <Typography.Text style={{ fontSize: 11, color: "#6b7280", display: "block", marginTop: 2 }}>
                        Mean Time To Acknowledge
                      </Typography.Text>
                    </div>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: 18, color: "#fff" }}>⏱️</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Typography.Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4, display: "block" }}>
                      7日平均: {formatDuration(computeAverageFromList("mtta"))}
                    </Typography.Text>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={sloChartData}>
                      <defs>
                        <linearGradient id="mttaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#cacacaff" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#cacacaff" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cacacaff" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={{ stroke: "#cacacaff" }}
                        tickLine={{ stroke: "#cacacaff" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={{ stroke: "#cacacaff" }}
                        tickLine={{ stroke: "#cacacaff" }}
                        tickFormatter={(value) => `${value}s`}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #cacacaff",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#000000ff", fontWeight: 600 }}
                        formatter={(value) => formatDuration(value)}
                      />
                      <Area
                        type="monotone"
                        dataKey="mtta"
                        stroke="#000000ff"
                        strokeWidth={1.5}
                        fill="url(#mttaGradient)"
                        dot={{ fill: "#000000ff", strokeWidth: 1, r: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Col>
            </Row>

          <Tabs activeKey={activeTabKey} defaultActiveKey="1" items={tagItems} onChange={onTabChange} />
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Typography.Text type="secondary">请选择故障中心以查看详情</Typography.Text>
        </div>
      )}
    </div>
  )
}

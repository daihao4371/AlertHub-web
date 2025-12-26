"use client"

import { useState, useEffect } from "react"
import ReactECharts from "echarts-for-react"
import { List, Row, Col, Select, message, Typography, Badge, Spin, Empty, Tag } from "antd"
import { getDashboardInfo, getDashboardStatistics } from "../api/other"
import { FaultCenterList } from "../api/faultCenter"
import { noticeRecordMetric } from "../api/notice"
import { BarChart2, Bell, Activity } from "lucide-react"
import { NoticeMetricChart } from "./chart/noticeMetricChart"
import { MiniLineChart } from "../components/MiniLineChart"
import { safeGet, safeLength, safeIsEmpty } from "../utils/safeAccess"

const { Option } = Select
const { Title, Text } = Typography

export const Home = () => {
  const contentMaxHeight = "calc(100vh)"
  const [dashboardInfo, setDashboardInfo] = useState({})
  const [faultCenters, setFaultCenters] = useState([])
  const [selectedFaultCenter, setSelectedFaultCenter] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [metricData, setMetricData] = useState({})
  const [statisticsData, setStatisticsData] = useState({})

  // 获取故障中心列表
  const fetchFaultCenters = async () => {
    try {
      setLoading(true)
      const res = await FaultCenterList()
      // 安全处理返回数据，避免权限错误导致页面崩溃
      const faultCenterData = safeGet(res, 'data', [])
      setFaultCenters(Array.isArray(faultCenterData) ? faultCenterData : [])
      if (safeLength(faultCenterData) > 0) {
        setSelectedFaultCenter(faultCenterData[0]?.id)
      }
    } catch (error) {
      console.error(error)
      // 如果是权限错误，显示友好提示
      if (error?.response?.status === 403 || error?.code === 403) {
        message.warning("您没有权限访问故障中心列表")
      } else {
        message.error("获取故障中心列表失败")
      }
      setFaultCenters([])
    } finally {
      setLoading(false)
    }
  }

  // 获取仪表盘信息
  const fetchDashboardInfo = async (faultCenterId) => {
    if (!faultCenterId) return
    try {
      setLoading(true)
      const params = { faultCenterId }
      const res = await getDashboardInfo(params)
      // 安全处理返回数据，避免权限错误导致页面崩溃
      const dashboardData = safeGet(res, 'data', {})
      setDashboardInfo(typeof dashboardData === 'object' && dashboardData !== null ? dashboardData : {})
    } catch (error) {
      console.error(error)
      // 如果是权限错误，显示友好提示
      if (error?.response?.status === 403 || error?.code === 403) {
        message.warning("您没有权限访问仪表盘数据")
      } else {
        message.error("获取仪表盘数据失败")
      }
      setDashboardInfo({})
    } finally {
      setLoading(false)
    }
  }

  // 获取图表数据
  const fetchMetricData = async () => {
    try {
      const res = await noticeRecordMetric()
      // 安全处理返回数据，避免权限错误导致页面崩溃
      const metricDataResult = safeGet(res, 'data', {})
      setMetricData(typeof metricDataResult === 'object' && metricDataResult !== null ? metricDataResult : {})
    } catch (error) {
      console.error("Failed to load metric data:", error)
      // 如果是权限错误，显示友好提示
      if (error?.response?.status === 403 || error?.code === 403) {
        message.warning("您没有权限访问图表数据")
      } else {
        message.error("加载图表数据失败")
      }
      setMetricData({})
    }
  }

  // 获取首页统计数据
  const fetchDashboardStatistics = async (faultCenterId) => {
    try {
      const params = faultCenterId ? { faultCenterId } : {}
      const res = await getDashboardStatistics(params)
      // 安全处理返回数据
      const statisticsResult = safeGet(res, 'data', {})
      setStatisticsData(typeof statisticsResult === 'object' && statisticsResult !== null ? statisticsResult : {})
    } catch (error) {
      console.error("Failed to load statistics data:", error)
      // 如果是权限错误，显示友好提示
      if (error?.response?.status === 403 || error?.code === 403) {
        message.warning("您没有权限访问统计数据")
      } else {
        message.error("加载统计数据失败")
      }
      setStatisticsData({})
    }
  }

  // 初始化加载
  useEffect(() => {
    fetchFaultCenters()
  }, [])

  useEffect(() => {
    fetchDashboardInfo(selectedFaultCenter)
    fetchDashboardStatistics(selectedFaultCenter)
  }, [selectedFaultCenter])

  useEffect(() => {
    fetchMetricData()
    // 移除重复的fetchDashboardStatistics调用，避免全局查询覆盖故障中心数据
    // fetchDashboardStatistics() - 这行导致显示全局统计而非故障中心统计
  }, [])

  // 告警等级颜色
  const SEVERITY_COLORS = {
    P0: "#ff4d4f",
    P1: "#faad14",
    P2: "#b0e1fb",
  }

  // 渲染告警级别 badge
  const getSeverityBadge = (severity, ruleName, faultCenterId) => {
    return <>
        <Tag color={SEVERITY_COLORS[severity]}>{severity}</Tag>
        <a 
          href={`/faultCenter/detail/${faultCenterId}?query=${ruleName}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
              color: '#000', 
              textDecoration: 'none',
              cursor: 'pointer'
          }}
        >
          {ruleName}
        </a>
      </>
  }

  const alarmDistributionOption = {
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b}: {c} ({d}%)",
      backgroundColor: "#000000",
      borderColor: "#333",
      textStyle: {
        color: "#ffffff",
        fontSize: 12,
      },
    },
    legend: {
      orient: "vertical",
      right: 10,
      top: "center",
      data: ["P0", "P1", "P2"],
      textStyle: {
        color: "#000",
      },
    },
    series: [
      {
        name: "告警级别",
        type: "pie",
        radius: ["50%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: "{b}: {c} ({d}%)",
          fontSize: 14,
          fontWeight: "500",
          color: "#000",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: "18",
            fontWeight: "bold",
            color: "#000",
          },
        },
        labelLine: {
          show: true,
          lineStyle: {
            color: "#999",
          },
        },
        data: [
          {
            value: dashboardInfo?.alarmDistribution?.P0 ?? 0,
            name: "P0",
            itemStyle: { color: SEVERITY_COLORS.P0 },
          },
          {
            value: dashboardInfo?.alarmDistribution?.P1 ?? 0,
            name: "P1",
            itemStyle: { color: SEVERITY_COLORS.P1 },
          },
          {
            value: dashboardInfo?.alarmDistribution?.P2 ?? 0,
            name: "P2",
            itemStyle: { color: SEVERITY_COLORS.P2 },
          },
        ],
      },
    ],
  }

  return (
    <div
      style={{
        alignItems: "flex-start",
        textAlign: "start",
        maxHeight: contentMaxHeight,
        overflowY: "auto",
        padding: "24px",
        backgroundColor: "#fafafa",
      }}
    >
      {/* 顶部5等份卡片 */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e8e8e8",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0,
          }}
        >
          {[
            {
              title: "今日告警",
              isCombined: true,
              mainValue: safeGet(statisticsData, 'todayMainAlerts', 0),
              mainLabel: "今日主告警",
              allValue: safeGet(statisticsData, 'todayNewAlerts', 0),
              allLabel: "今日所有告警",
              compareRatio: safeGet(statisticsData, 'todayNewAlertsCompareRatio', 0), // 使用今日所有告警的环比
              color: '#ff4d4f',
            },
              {
                title: "过去7天所有事件",
                value: safeGet(statisticsData, 'past7DaysAllEvents', 0),
                compareRatio: safeGet(statisticsData, 'past7DaysAllEventsCompareRatio', 0),
                color: '#1890ff',
                suffix: '',
              },
              {
                title: "过去7天主告警",
                value: safeGet(statisticsData, 'past7DaysMainAlerts', 0),
                compareRatio: safeGet(statisticsData, 'past7DaysMainAlertsCompareRatio', 0),
                color: '#722ed1',
                suffix: '',
              },
              {
                title: "过去7天MTTA",
                value: Math.round(safeGet(statisticsData, 'past7DaysMTTA', 0) * 10) / 10, // 保留1位小数
                compareRatio: safeGet(statisticsData, 'past7DaysMTTACompareRatio', 0),
                color: '#13c2c2',
                suffix: 'min',
              },
              {
                title: "过去7天MTTR",
                value: Math.round(safeGet(statisticsData, 'past7DaysMTTR', 0) * 10) / 10, // 保留1位小数
                compareRatio: safeGet(statisticsData, 'past7DaysMTTRCompareRatio', 0),
                color: '#52c41a',
                suffix: 'min',
              },
            ].map((partition, index) => {
            const compareRatio = partition.compareRatio || 0
            
            // 如果是合并展示的分区（今日告警）
            if (partition.isCombined) {
              const mainValue = partition.mainValue || 0
              const allValue = partition.allValue || 0
              // 使用主告警的值生成趋势图
              const trendData = Array.from({ length: 7 }, (_, i) => {
                const baseValue = typeof mainValue === 'number' ? mainValue : 0
                if (baseValue === 0) {
                  return 0
                }
                const previousValue = compareRatio === 0 
                  ? baseValue 
                  : baseValue / (1 + compareRatio / 100)
                const step = (baseValue - previousValue) / 6
                return Math.max(0, previousValue + step * i)
              })
              
              return (
                <div
                  key={index}
                  style={{
                    flex: "1 1 0",
                    minWidth: "120px",
                    padding: "16px",
                    borderRight: index < 4 ? "1px solid #f0f0f0" : "none",
                    textAlign: "center",
                  }}
                >
                  <Text style={{ color: "#8c8c8c", fontSize: "14px", display: "block", marginBottom: "12px" }}>
                    {partition.title}
                  </Text>
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "8px", marginBottom: "4px" }}>
                      <Text style={{ color: "#8c8c8c", fontSize: "12px" }}>{partition.mainLabel}:</Text>
                      <Text
                        style={{
                          fontSize: "24px",
                          fontWeight: "600",
                          color: "#000000",
                        }}
                      >
                        {mainValue}
                      </Text>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "8px" }}>
                      <Text style={{ color: "#8c8c8c", fontSize: "12px" }}>{partition.allLabel}:</Text>
                      <Text
                        style={{
                          fontSize: "24px",
                          fontWeight: "600",
                          color: "#000000",
                        }}
                      >
                        {allValue}
                      </Text>
                    </div>
                  </div>
                  <div style={{ marginBottom: "12px", height: "40px" }}>
                    <MiniLineChart data={trendData} color={partition.color} height={40} />
                  </div>
                </div>
              )
            }
            
            // 普通分区展示
            const value = partition.value
            const trendData = Array.from({ length: 7 }, (_, i) => {
              const baseValue = typeof value === 'number' ? value : 0
              if (baseValue === 0) {
                return 0
              }
              const previousValue = compareRatio === 0 
                ? baseValue 
                : baseValue / (1 + compareRatio / 100)
              const step = (baseValue - previousValue) / 6
              return Math.max(0, previousValue + step * i)
            })
            
            return (
              <div
                key={index}
                style={{
                  flex: "1 1 0",
                  minWidth: "120px",
                  padding: "16px",
                  borderRight: index < 4 ? "1px solid #f0f0f0" : "none",
                  textAlign: "center",
                }}
              >
                <Text style={{ color: "#8c8c8c", fontSize: "14px", display: "block", marginBottom: "12px" }}>
                  {partition.title}
                </Text>
                <Text
                  style={{
                    fontSize: "32px",
                    fontWeight: "600",
                    color: "#000000",
                    display: "block",
                    marginBottom: "12px",
                  }}
                >
                  {typeof value === 'number' 
                    ? (partition.suffix === 's' 
                        ? Math.round(value).toString() 
                        : value.toString())
                    : value}
                  {partition.suffix}
                </Text>
                <div style={{ marginBottom: "12px", height: "40px" }}>
                  <MiniLineChart data={trendData} color={partition.color} height={40} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", flexWrap: "wrap" }}>
                  <Text style={{ color: "#8c8c8c", fontSize: "12px" }}>环比</Text>
                  <Text style={{ color: "#8c8c8c", fontSize: "12px" }}>
                    {compareRatio >= 0 ? '+' : ''}{compareRatio.toFixed(2)} %
                  </Text>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e8e8e8",
          borderRadius: "12px",
          marginBottom: "24px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
          }}
        >
            <div style={{ display: "flex", alignItems: "center" }}>
                <Activity size={18} style={{ marginRight: "8px", color: "#000" }} strokeWidth={2} />
                <span style={{ fontSize: "16px", fontWeight: "500", color: "#000" }}>告警通知趋势</span>
            </div>
        </div>
        <div style={{ padding: "24px", marginTop: "-16px" }}>
          <Spin spinning={loading}>
            {!safeIsEmpty(safeGet(metricData, 'date')) ? (
              <NoticeMetricChart data={metricData} />
            ) : (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <Empty description="暂无告警趋势数据" />
              </div>
            )}
          </Spin>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e8e8e8",
              borderRadius: "12px",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <Bell size={18} style={{ marginRight: "8px", color: "#000" }} strokeWidth={2} />
                <span style={{ fontSize: "16px", fontWeight: "500", color: "#000" }}>最近告警列表</span>
              </div>
              <Select
                style={{ width: 200 }}
                placeholder="选择故障中心"
                value={selectedFaultCenter}
                onChange={setSelectedFaultCenter}
                showSearch
                optionFilterProp="children"
                loading={loading}
                popupMatchSelectWidth={false}
                listHeight={400}
              >
                {safeIsEmpty(faultCenters) && <Option disabled>暂无可用故障中心</Option>}
                {faultCenters.map((center) => (
                  <Option key={center?.id} value={center?.id}>
                    {center?.name || '-'}
                  </Option>
                ))}
              </Select>
            </div>
            <Spin spinning={loading}>
              {!safeIsEmpty(safeGet(dashboardInfo, 'curAlertList')) ? (
                <List
                  dataSource={safeGet(dashboardInfo, 'curAlertList', [])}
                  style={{
                    height: "350px",
                    overflow: "auto",
                  }}
                  renderItem={(item) => (
                    <List.Item
                      style={{
                        padding: "12px 24px",
                        borderBottom: "1px solid #f0f0f0",
                        transition: "background-color 0.2s",
                      }}
                    >
                      <div
                        style={{
                          overflowX: "auto",
                          whiteSpace: "nowrap",
                          width: "100%",
                        }}
                      >
                        {getSeverityBadge(item?.severity, item?.ruleName, item?.faultCenterId)}
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无告警数据" style={{ padding: "80px 0" }} />
              )}
            </Spin>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e8e8e8",
              borderRadius: "12px",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <BarChart2 size={18} style={{ marginRight: "8px", color: "#000" }} strokeWidth={2} />
                <span style={{ fontSize: "16px", fontWeight: "500", color: "#000" }}>告警分布</span>
              </div>
              <Select
                style={{ width: 200 }}
                placeholder="选择故障中心"
                value={selectedFaultCenter}
                onChange={setSelectedFaultCenter}
                showSearch
                optionFilterProp="children"
                loading={loading}
                popupMatchSelectWidth={false}
                listHeight={400}
              >
                {safeIsEmpty(faultCenters) && <Option disabled>暂无可用故障中心</Option>}
                {faultCenters.map((center) => (
                  <Option key={center?.id} value={center?.id}>
                    {center?.name || '-'}
                  </Option>
                ))}
              </Select>
            </div>
            <div style={{ padding: "24px" }}>
              <Spin spinning={loading}>
                <ReactECharts
                  option={alarmDistributionOption}
                  style={{ width: "100%", height: "350px" }}
                  opts={{ renderer: "canvas" }}
                />
              </Spin>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}

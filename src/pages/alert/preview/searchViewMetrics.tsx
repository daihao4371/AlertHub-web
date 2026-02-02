// @ts-ignore
import React, { useEffect, useState, useMemo, useCallback } from "react"
import { Spin, Empty, Typography, Space, Divider, Row, Col, Alert, Tabs, Select } from "antd"
import {
    BarChartOutlined,
    LineChartOutlined,
    TableOutlined,
} from "@ant-design/icons"
import { queryPromMetrics, queryRangePromMetrics, getPromLabelValues } from '../../../api/other'
import { TableWithPagination } from '../../../utils/TableWithPagination'
import ReactECharts from "echarts-for-react"

const { Title, Text } = Typography

// ============ 类型定义 ============
interface MetricItem {
    metric: Record<string, string>
    value: [number, string]
}

interface TimeSeriesData {
    metric: Record<string, string>
    values: [number, string][]
}

interface SearchViewMetricsProps {
    datasourceType: string
    datasourceId: string[]
    promQL: string
    variables?: Record<string, string>
}

// ============ 静态常量 ============
const COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']

const formatTimestamp = (timestamp: number) => new Date(timestamp * 1000).toLocaleString("zh-CN")

// 表格列定义 - 与 ExporterMonitor 保持一致，所有列都设置固定宽度
const TABLE_COLUMNS = [
    {
        title: 'Time',
        dataIndex: 'time',
        key: 'time',
        width: 180,
        ellipsis: true,
        sorter: (a: any, b: any) => a.timestamp - b.timestamp,
        defaultSortOrder: 'descend' as const,
    },
    {
        title: 'instance',
        dataIndex: 'instance',
        key: 'instance',
        width: 250,
        ellipsis: true,
    },
    {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        width: 120,
        align: 'right' as const,
        sorter: (a: any, b: any) => a.value - b.value,
        render: (value: number) => (
            <Text strong style={{ color: value === 0 ? '#52c41a' : '#1890ff', fontSize: 14 }}>
                {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </Text>
        ),
    },
]

// ============ 主组件 ============
export const SearchViewMetrics = ({ datasourceType, datasourceId, promQL, variables }: SearchViewMetricsProps) => {
    const [metrics, setMetrics] = useState<MetricItem[]>([])
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 变量选择器状态
    const [instanceOptions, setInstanceOptions] = useState<string[]>([])
    const [ifNameOptions, setIfNameOptions] = useState<string[]>([])
    const [selectedInstance, setSelectedInstance] = useState<string | undefined>(variables?.instance)
    const [selectedIfName, setSelectedIfName] = useState<string | undefined>(variables?.ifName)
    const [loadingOptions, setLoadingOptions] = useState(false)

    // 分页状态 - 与 ExporterMonitor 保持一致的管理方式
    const [pagination, setPagination] = useState({ index: 1, size: 20, total: 0 })

    const hasInstanceVar = promQL.includes('$instance')
    const hasIfNameVar = promQL.includes('$ifName')

    const extractMetricName = useCallback((query: string): string => {
        const patterns = [/(ifHCIn\w+|ifIn\w+|ifOut\w+|ifHCOut\w+)/, /(\w+)\{/]
        for (const pattern of patterns) {
            const match = query.match(pattern)
            if (match?.[1]) return match[1]
        }
        return ''
    }, [])

    // 获取 label 值
    useEffect(() => {
        if ((!hasInstanceVar && !hasIfNameVar) || datasourceId.length === 0 || !promQL) return

        const fetchLabelValues = async () => {
            const metricName = extractMetricName(promQL)
            const firstDatasourceId = datasourceId[0]

            setLoadingOptions(true)
            try {
                const promises: Promise<void>[] = []

                if (hasInstanceVar) {
                    promises.push(
                        getPromLabelValues({ datasourceId: firstDatasourceId, labelName: 'instance', metricName: metricName || undefined })
                            .then(res => {
                                if (res.code === 200 && Array.isArray(res.data)) {
                                    setInstanceOptions(res.data)
                                    if (!selectedInstance && res.data.length > 0) setSelectedInstance(res.data[0])
                                }
                            })
                            .catch(err => console.error('获取 instance 值失败:', err))
                    )
                }

                if (hasIfNameVar) {
                    promises.push(
                        getPromLabelValues({ datasourceId: firstDatasourceId, labelName: 'ifName', metricName: metricName || undefined })
                            .then(res => {
                                if (res.code === 200 && Array.isArray(res.data)) {
                                    setIfNameOptions(res.data)
                                    if (!selectedIfName && res.data.length > 0) setSelectedIfName(res.data[0])
                                }
                            })
                            .catch(err => console.error('获取 ifName 值失败:', err))
                    )
                }

                await Promise.all(promises)
            } finally {
                setLoadingOptions(false)
            }
        }

        fetchLabelValues()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datasourceId, promQL, hasInstanceVar, hasIfNameVar])

    // 获取指标数据
    useEffect(() => {
        const shouldFetch = datasourceId.length > 0 && promQL?.trim()
        const hasRequiredVariables = (!hasInstanceVar || selectedInstance) && (!hasIfNameVar || selectedIfName)

        if (!shouldFetch || !hasRequiredVariables) {
            setMetrics([])
            setTimeSeriesData([])
            setLoading(false)
            return
        }

        const fetchMetrics = async () => {
            try {
                setLoading(true)
                setError(null)

                const now = Math.floor(Date.now() / 1000)
                const oneHourAgo = now - 3600

                const queryParams: Record<string, any> = {
                    datasourceIds: datasourceId.join(","),
                    query: promQL,
                }

                const mergedVariables: Record<string, string> = { ...variables }
                if (selectedInstance) mergedVariables.instance = selectedInstance
                if (selectedIfName) mergedVariables.ifName = selectedIfName

                if (Object.keys(mergedVariables).length > 0) {
                    Object.entries(mergedVariables).forEach(([key, value]) => {
                        queryParams[`variables[${key}]`] = value
                    })
                    if (mergedVariables.instance) queryParams.instance = mergedVariables.instance
                    if (mergedVariables.ifName) queryParams.ifName = mergedVariables.ifName
                }

                const [instantRes, rangeRes] = await Promise.all([
                    queryPromMetrics(queryParams),
                    queryRangePromMetrics({ ...queryParams, start: oneHourAgo, end: now, step: 60 })
                ])

                if (instantRes.code === 200) {
                    const allResults = instantRes.data
                        .filter((item: any) => item.status === "success" && item.data?.result?.length > 0)
                        .flatMap((item: any) => item.data.result)
                    setMetrics(allResults)
                }

                if (rangeRes.code === 200) {
                    const timeSeriesResults = rangeRes.data
                        .filter((item: any) => item.status === "success" && item.data?.result?.length > 0)
                        .flatMap((item: any) => item.data.result)
                    setTimeSeriesData(timeSeriesResults)
                } else {
                    throw new Error(rangeRes.msg || "请求失败")
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "网络错误")
            } finally {
                setLoading(false)
            }
        }

        fetchMetrics()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datasourceId, promQL, datasourceType, selectedInstance, selectedIfName, hasInstanceVar, hasIfNameVar, variables])

    // ============ 表格数据 (useMemo 缓存) ============
    const tableData = useMemo(() => {
        return metrics.map((item, index) => ({
            key: `${item.metric.instance || ''}_${index}`,
            time: formatTimestamp(item.value[0]),
            timestamp: item.value[0],
            instance: item.metric.instance || item.metric.job || item.metric.__name__ || `Metric #${index + 1}`,
            value: Number.parseFloat(item.value[1]),
        }))
    }, [metrics])

    // 数据变化时更新分页总数
    useEffect(() => {
        setPagination(prev => ({ ...prev, total: tableData.length }))
    }, [tableData.length])

    // 分页事件 - 与 ExporterMonitor 保持一致
    const handlePageChange = useCallback((page: number, pageSize: number) => {
        setPagination(prev => ({ ...prev, index: page, size: pageSize }))
    }, [])

    const handlePageSizeChange = useCallback((current: number, size: number) => {
        setPagination(prev => ({ ...prev, index: current, size }))
    }, [])

    // 前端数据切片 - 与 ExporterMonitor 的 getCurrentPageData() 完全一致
    const getCurrentPageData = useCallback(() => {
        const { index, size } = pagination
        const start = (index - 1) * size
        return tableData.slice(start, start + size)
    }, [pagination, tableData])

    // ============ 图表配置 (useMemo 缓存) ============
    const chartOption = useMemo(() => {
        if (!timeSeriesData?.length) return {}

        const series = timeSeriesData.map((item, index) => {
            const preferredKeys = ['instance', 'job', 'node', 'pod', 'container', 'service']
            let seriesName = item.metric.__name__ || `Metric #${index + 1}`
            for (const key of preferredKeys) {
                if (item.metric[key]) {
                    seriesName = item.metric[key]
                    break
                }
            }
            return {
                name: seriesName,
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: item.values.map(([ts, val]) => [ts * 1000, Number.parseFloat(val)]),
                lineStyle: { width: 2 },
                emphasis: { focus: 'series' },
            }
        })

        return {
            color: COLORS,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'line', lineStyle: { type: 'dashed' } },
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#ddd',
                borderWidth: 1,
                textStyle: { color: '#333' },
            },
            legend: {
                type: 'scroll',
                bottom: 0,
                data: series.map(s => s.name),
                textStyle: { fontSize: 12 },
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: timeSeriesData.length > 5 ? '12%' : '8%',
                top: '5%',
                containLabel: true,
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLabel: {
                    fontSize: 11,
                    formatter: (value: number) => {
                        const d = new Date(value)
                        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                    },
                },
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#f0f0f0' } },
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    fontSize: 11,
                    formatter: (v: number) => {
                        if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
                        if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
                        if (v < 1 && v > 0) return v.toFixed(2)
                        return v.toFixed(0)
                    },
                },
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#f0f0f0' } },
            },
            series,
        }
    }, [timeSeriesData])

    const seriesCount = timeSeriesData.length
    const dataPointCount = timeSeriesData.length > 0 ? timeSeriesData[0].values.length : 0

    // ============ 渲染：图表视图 ============
    const renderChartView = () => (
        <div style={{ marginTop: 10 }}>
            <div style={{ height: 400, width: '100%', background: '#fff', borderRadius: 8, padding: 12 }}>
                <ReactECharts
                    option={chartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                    notMerge={true}
                    lazyUpdate={true}
                />
            </div>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={16}>
                {[
                    { label: '时间序列数', value: seriesCount, bg: '#f0f5ff', color: '#1890ff' },
                    { label: '数据点', value: dataPointCount, bg: '#f6ffed', color: '#52c41a' },
                    { label: '时间范围', value: '过去1小时', bg: '#fff7e6', color: '#fa8c16' },
                    { label: '采样间隔', value: '1分钟', bg: '#fff1f0', color: '#ff4d4f' },
                ].map(({ label, value, bg, color }) => (
                    <Col span={6} key={label}>
                        <div style={{ textAlign: 'center', background: bg, borderRadius: 8, padding: '12px 8px' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: typeof value === 'number' ? 20 : 14, fontWeight: 'bold', color }}>{value}</div>
                        </div>
                    </Col>
                ))}
            </Row>
        </div>
    )

    // ============ 渲染：列表视图 - 直接使用 TableWithPagination ============
    const renderListView = () => (
        <TableWithPagination
            columns={TABLE_COLUMNS}
            dataSource={getCurrentPageData()}
            pagination={pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            scrollY={400}
            rowKey="key"
            showTotal={(total: number) => `共 ${total} 条数据`}
            loading={loading}
        />
    )

    // ============ 渲染 ============
    return (
        <div style={{ minHeight: 560, position: 'relative' }}>
            {/* 叠加层状态 */}
            {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)', zIndex: 10, borderRadius: 8 }}>
                    <Spin size="large" />
                    <Text type="secondary" style={{ marginTop: 16, fontSize: 14 }}>正在获取最新的 Metric 数据</Text>
                </div>
            )}
            {!loading && error && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.95)', zIndex: 10, borderRadius: 8 }}>
                    <Alert message="查询失败" description={error} type="error" showIcon style={{ maxWidth: '80%' }} />
                </div>
            )}
            {!loading && !error && metrics.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.95)', zIndex: 10, borderRadius: 8 }}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary" style={{ fontSize: 14 }}>当前查询条件下没有找到相关的 Metric 数据</Text>} />
                </div>
            )}

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', background: 'linear-gradient(135deg, #000 0%, #bfbfbf 100%)', borderRadius: '8px 8px 0 0' }}>
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space align="center">
                        <BarChartOutlined style={{ fontSize: 20, color: 'white' }} />
                        <Title level={4} style={{ margin: 0, color: 'white' }}>{datasourceType}</Title>
                    </Space>

                    {(hasInstanceVar || hasIfNameVar) && (
                        <Space>
                            {hasInstanceVar && (
                                <Select
                                    style={{ minWidth: 200 }}
                                    placeholder="选择 instance"
                                    value={selectedInstance}
                                    onChange={setSelectedInstance}
                                    loading={loadingOptions}
                                    options={instanceOptions.map(opt => ({ label: opt, value: opt }))}
                                    allowClear
                                />
                            )}
                            {hasIfNameVar && (
                                <Select
                                    style={{ minWidth: 200 }}
                                    placeholder="选择 ifName"
                                    value={selectedIfName}
                                    onChange={setSelectedIfName}
                                    loading={loadingOptions}
                                    options={ifNameOptions.map(opt => ({ label: opt, value: opt }))}
                                    allowClear
                                />
                            )}
                        </Space>
                    )}
                </Space>
            </div>

            {/* Tabs */}
            <Tabs
                defaultActiveKey="chart"
                style={{ marginTop: 10 }}
                destroyInactiveTabPane={false}
                items={[
                    {
                        key: 'chart',
                        label: <span><LineChartOutlined /> 图表视图</span>,
                        children: renderChartView(),
                    },
                    {
                        key: 'list',
                        label: <span><TableOutlined /> 列表视图</span>,
                        children: renderListView(),
                    },
                ]}
            />
        </div>
    )
}
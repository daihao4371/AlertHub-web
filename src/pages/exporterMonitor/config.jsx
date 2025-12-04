"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Form,
  Switch,
  Select,
  InputNumber,
  Button,
  Card,
  message,
  Space,
  Radio,
  TimePicker,
  List,
  Tag
} from "antd"
import { PlusOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons"
import { getExporterConfig, updateExporterConfig } from "../../api/exporterMonitor"
import { getDatasourceList } from "../../api/datasource"
import { getNoticeList } from "../../api/notice"

const { Option } = Select

export const ExporterMonitorConfig = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [datasources, setDatasources] = useState([])
  const [noticeGroups, setNoticeGroups] = useState([])
  const [cronList, setCronList] = useState([])
  const [currentTime, setCurrentTime] = useState(null)
  const [monitorEnabled, setMonitorEnabled] = useState(true)
  const [reportEnabled, setReportEnabled] = useState(false)

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

  // 获取通知组列表
  const fetchNoticeGroups = async () => {
    try {
      const res = await getNoticeList()
      if (res?.data) {
        setNoticeGroups(res.data)
      }
    } catch (error) {
      console.error("获取通知组列表失败:", error)
    }
  }

  // 获取配置
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getExporterConfig()
      if (res?.data) {
        const { monitorConfig, reportSchedule } = res.data

        // 设置监控启用状态（处理布尔值）
        const isEnabled = monitorConfig?.enabled !== undefined && monitorConfig?.enabled !== null
          ? Boolean(monitorConfig.enabled)
          : true
        setMonitorEnabled(isEnabled)

        // 设置推送启用状态（处理布尔值）
        const isReportEnabled = reportSchedule?.enabled !== undefined && reportSchedule?.enabled !== null
          ? Boolean(reportSchedule.enabled)
          : false
        setReportEnabled(isReportEnabled)

        // 设置表单值
        form.setFieldsValue({
          // 监控配置
          enabled: isEnabled,
          dataSourceIds: monitorConfig?.dataSourceIds || [],
          refreshInterval: monitorConfig?.refreshInterval || 30,
          snapshotInterval: monitorConfig?.snapshotInterval || 5,
          historyRetention: monitorConfig?.historyRetention || 30,

          // 推送配置
          reportEnabled: isReportEnabled,
          noticeGroups: reportSchedule?.noticeGroups || [],
          reportFormat: reportSchedule?.reportFormat || "simple"
        })

        // 设置Cron列表
        if (reportSchedule?.cronExpression) {
          setCronList(reportSchedule.cronExpression)
        }
      }
    } catch (error) {
      console.error("获取配置失败:", error)
      message.error("获取配置失败")
    } finally {
      setLoading(false)
    }
  }, [form])

  // 初始化加载
  useEffect(() => {
    fetchDatasources()
    fetchNoticeGroups()
    fetchConfig()
  }, [fetchConfig])

  // 调试：监控状态变化
  useEffect(() => {
    console.log("monitorEnabled 状态变化:", monitorEnabled)
  }, [monitorEnabled])

  // 调试：推送状态变化
  useEffect(() => {
    console.log("reportEnabled 状态变化:", reportEnabled)
  }, [reportEnabled])

  // 添加推送时间
  const addCronTime = () => {
    if (!currentTime) {
      message.warning("请选择推送时间")
      return
    }

    const hour = currentTime.hour()
    const minute = currentTime.minute()
    const cronExpr = `${minute} ${hour} * * *`

    if (cronList.includes(cronExpr)) {
      message.warning("该推送时间已存在")
      return
    }

    setCronList([...cronList, cronExpr])
    setCurrentTime(null)
  }

  // 删除推送时间
  const removeCronTime = (cron) => {
    setCronList(cronList.filter(c => c !== cron))
  }

  // 解析Cron表达式为时间显示
  const parseCronToTime = (cron) => {
    const parts = cron.split(" ")
    if (parts.length >= 2) {
      const minute = parts[0]
      const hour = parts[1]
      return `每天 ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
    }
    return cron
  }

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const config = {
        monitorConfig: {
          enabled: Boolean(values.enabled),
          dataSourceIds: values.dataSourceIds || [],
          refreshInterval: Number(values.refreshInterval) || 30,
          snapshotInterval: Number(values.snapshotInterval) || 5,
          historyRetention: Number(values.historyRetention) || 30
        },
        reportSchedule: {
          enabled: Boolean(values.reportEnabled),
          cronExpression: cronList || [],
          noticeGroups: values.noticeGroups || [],
          reportFormat: values.reportFormat || "simple"
        }
      }

      console.log("保存配置:", config)
      await updateExporterConfig(config)
      message.success("配置保存成功")
      // 保存成功后重新获取配置以同步状态
      await fetchConfig()
    } catch (error) {
      console.error("保存配置失败:", error)
      message.error("保存配置失败: " + (error?.message || "未知错误"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      <Card
        title="Exporter 健康巡检配置"
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
          >
            保存配置
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            enabled: true,
            refreshInterval: 30,
            snapshotInterval: 5,
            historyRetention: 30,
            reportEnabled: false,
            reportFormat: "simple"
          }}
          onValuesChange={(changedValues, allValues) => {
            // 监听表单值变化
            if (changedValues.hasOwnProperty('enabled')) {
              setMonitorEnabled(changedValues.enabled)
              // 如果关闭监控,同时关闭定时推送
              if (!changedValues.enabled) {
                form.setFieldValue('reportEnabled', false)
                setReportEnabled(false)
              }
            }
            // 监听推送启用状态变化
            if (changedValues.hasOwnProperty('reportEnabled')) {
              setReportEnabled(changedValues.reportEnabled)
            }
          }}
        >
          {/* 监控配置部分 */}
          <Card type="inner" title="监控配置" style={{ marginBottom: "24px" }}>
            <Form.Item
              label="启用 Exporter 健康巡检"
              name="enabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="监控数据源"
              name="dataSourceIds"
              rules={[{ required: true, message: "请选择至少一个数据源" }]}
              extra="选择需要监控的 Prometheus 数据源"
            >
              <Select
                mode="multiple"
                placeholder="请选择数据源"
                style={{ width: "100%" }}
              >
                {datasources.map((ds) => (
                  <Option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.http?.url || ds.endpoint})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="刷新间隔 (秒)"
              name="refreshInterval"
              rules={[{ required: true, message: "请输入刷新间隔" }]}
              extra="页面自动刷新的时间间隔,建议 30 秒"
            >
              <InputNumber min={10} max={300} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label="快照间隔 (分钟)"
              name="snapshotInterval"
              rules={[{ required: true, message: "请输入快照间隔" }]}
              extra="历史记录采样的时间间隔,建议 5 分钟"
            >
              <InputNumber min={1} max={60} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label="数据保留 (天)"
              name="historyRetention"
              rules={[{ required: true, message: "请输入数据保留天数" }]}
              extra="历史数据自动清理的保留天数,建议 30 天"
            >
              <InputNumber min={7} max={90} style={{ width: "100%" }} />
            </Form.Item>
          </Card>

          {/* 定时巡检报告推送配置 */}
          <Card type="inner" title="定时巡检报告推送">
            <Form.Item
              label="启用定时推送"
              name="reportEnabled"
              valuePropName="checked"
              extra={!monitorEnabled ? "请先启用 Exporter 健康巡检" : ""}
            >
              <Switch 
                disabled={!monitorEnabled}
                onChange={(checked) => {
                  console.log("启用定时推送开关变化:", checked, "monitorEnabled:", monitorEnabled)
                  form.setFieldValue('reportEnabled', checked)
                  setReportEnabled(checked)
                }}
              />
            </Form.Item>

            <Form.Item 
              label="推送时间配置" 
              extra="可添加多个推送时间,支持每天定时推送"
              style={{ 
                opacity: (!reportEnabled || !monitorEnabled) ? 0.5 : 1,
                pointerEvents: (!reportEnabled || !monitorEnabled) ? 'none' : 'auto'
              }}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <Space>
                  <TimePicker
                    format="HH:mm"
                    value={currentTime}
                    onChange={setCurrentTime}
                    placeholder="选择推送时间"
                    disabled={!reportEnabled || !monitorEnabled}
                  />
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addCronTime}
                    disabled={!reportEnabled || !monitorEnabled}
                  >
                    添加推送时间
                  </Button>
                </Space>

                {cronList.length > 0 && (
                  <List
                    size="small"
                    bordered
                    dataSource={cronList}
                    renderItem={(cron) => (
                      <List.Item
                        actions={[
                          <Button
                            key="delete"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeCronTime(cron)}
                            disabled={!reportEnabled || !monitorEnabled}
                          />
                        ]}
                      >
                        <Tag color="blue">⏰ {parseCronToTime(cron)}</Tag>
                      </List.Item>
                    )}
                  />
                )}
              </Space>
            </Form.Item>

            <Form.Item
              label="通知组"
              name="noticeGroups"
              extra="选择接收巡检报告的通知组"
            >
              <Select
                mode="multiple"
                placeholder="请选择通知组"
                style={{ width: "100%" }}
                disabled={!reportEnabled || !monitorEnabled}
              >
                {noticeGroups.map((group) => (
                  <Option key={group.uuid} value={group.uuid}>
                    {group.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="报告格式"
              name="reportFormat"
              extra="简洁版仅包含统计数据和 DOWN 列表,详细版包含所有 Exporter 状态"
            >
              <Radio.Group disabled={!reportEnabled || !monitorEnabled}>
                <Radio value="simple">简洁版 (推荐)</Radio>
                <Radio value="detailed">详细版</Radio>
              </Radio.Group>
            </Form.Item>
          </Card>
        </Form>
      </Card>
    </div>
  )
}
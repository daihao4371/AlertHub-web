"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Form,
  Switch,
  Select,
  InputNumber,
  Button,
  message,
  Space,
  Radio,
  TimePicker,
  List,
  Tag,
  Popconfirm,
  Divider
} from "antd"
import { PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined } from "@ant-design/icons"
import { getExporterConfig, updateExporterConfig, sendExporterReport } from "../../api/exporterMonitor"
import { getDatasourceList } from "../../api/datasource"
import { getNoticeList } from "../../api/notice"

const { Option } = Select

export const ExporterMonitorConfig = () => {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [datasources, setDatasources] = useState([])
  const [noticeGroups, setNoticeGroups] = useState([])
  const [cronList, setCronList] = useState([])
  const [currentTime, setCurrentTime] = useState(null)
  const [inspectionTimes, setInspectionTimes] = useState(["09:00", "21:00"])
  const [currentInspectionTime, setCurrentInspectionTime] = useState(null)
  const [monitorEnabled, setMonitorEnabled] = useState(true)
  const [reportEnabled, setReportEnabled] = useState(false)
  const reportFormatValue = Form.useWatch('reportFormat', form)

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
          datasourceIds: monitorConfig?.datasourceIds || [],
          historyRetention: monitorConfig?.historyRetention || 90,

          // 推送配置
          reportEnabled: isReportEnabled,
          noticeGroups: reportSchedule?.noticeGroups || [],
          reportFormat: reportSchedule?.reportFormat || "simple"
        })

        // 设置巡检时间列表
        if (monitorConfig?.inspectionTimes) {
          setInspectionTimes(monitorConfig.inspectionTimes)
        }

        // 设置Cron列表
        if (reportSchedule?.cronExpression) {
          setCronList(reportSchedule.cronExpression)
        }
      }
    } catch (error) {
      console.error("获取配置失败:", error)
      message.error("获取配置失败")
    }
  }, [form])

  // 初始化加载
  useEffect(() => {
    fetchDatasources()
    fetchNoticeGroups()
    fetchConfig()
  }, [fetchConfig])

  // 添加巡检时间
  const addInspectionTime = () => {
    if (!currentInspectionTime) {
      message.warning("请选择巡检时间")
      return
    }

    const hour = currentInspectionTime.hour()
    const minute = currentInspectionTime.minute()
    const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`

    if (inspectionTimes.includes(timeStr)) {
      message.warning("该巡检时间已存在")
      return
    }

    setInspectionTimes([...inspectionTimes, timeStr])
    setCurrentInspectionTime(null)
  }

  // 删除巡检时间
  const removeInspectionTime = (time) => {
    setInspectionTimes(inspectionTimes.filter(t => t !== time))
  }

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
      setSaving(true)

      const config = {
        monitorConfig: {
          enabled: Boolean(values.enabled),
          datasourceIds: values.datasourceIds || [],
          inspectionTimes: inspectionTimes || ["09:00", "21:00"],
          historyRetention: Number(values.historyRetention) || 90
        },
        reportSchedule: {
          enabled: Boolean(values.reportEnabled),
          cronExpression: cronList || [],
          noticeGroups: values.noticeGroups || [],
          reportFormat: values.reportFormat || "simple"
        }
      }

      await updateExporterConfig(config)
      message.success("配置保存成功")
      // 保存成功后重新获取配置以同步状态
      await fetchConfig()
    } catch (error) {
      console.error("保存配置失败:", error)
      message.error("保存配置失败: " + (error?.message || "未知错误"))
    } finally {
      setSaving(false)
    }
  }

  // 手动触发推送
  const handleManualSend = async () => {
    try {
      const values = form.getFieldsValue()

      // 验证必填项
      if (!values.noticeGroups || values.noticeGroups.length === 0) {
        message.warning("请先选择通知组")
        return
      }

      setSending(true)
      await sendExporterReport({
        noticeGroups: values.noticeGroups,
        reportFormat: values.reportFormat || "simple"
      })
      message.success("报告推送成功")
    } catch (error) {
      console.error("推送报告失败:", error)
      message.error("推送报告失败: " + (error?.message || "未知错误"))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          style={{
            backgroundColor: '#000000'
          }}
        >
          保存配置
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          enabled: true,
          historyRetention: 90,
          reportEnabled: false,
          reportFormat: "simple"
        }}
        onValuesChange={(changedValues, allValues) => {
          // 监听表单值变化
          if (changedValues.hasOwnProperty('enabled')) {
            setMonitorEnabled(changedValues.enabled)
            // 如果关闭监控,同时关闭定时推送
            if (!changedValues.enabled) {
              form.setFieldsValue({ reportEnabled: false })
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
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 500 }}>监控配置</h3>
            <Form.Item
              label="启用 Exporter 健康巡检"
              name="enabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="监控数据源"
              name="datasourceIds"
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
              label="巡检时间配置"
              extra="可添加多个巡检时间点,系统将在指定时间自动执行巡检"
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <Space>
                  <TimePicker
                    format="HH:mm"
                    value={currentInspectionTime}
                    onChange={setCurrentInspectionTime}
                    placeholder="选择巡检时间"
                    style={{ width: "100%" }}
                  />
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addInspectionTime}
                    style={{ flexShrink: 0 }}
                  >
                    添加巡检时间
                  </Button>
                </Space>

                <div style={{ minHeight: inspectionTimes.length > 0 ? "auto" : "0px" }}>
                  {inspectionTimes.length > 0 && (
                    <List
                      size="small"
                      bordered
                      dataSource={inspectionTimes}
                      renderItem={(time) => (
                        <List.Item
                          actions={[
                            <Button
                              key="delete"
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeInspectionTime(time)}
                            />
                          ]}
                        >
                          <Tag color="blue">⏰ 每天 {time}</Tag>
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              </Space>
            </Form.Item>

            <Form.Item
              label="数据保留 (天)"
              name="historyRetention"
              rules={[{ required: true, message: "请输入数据保留天数" }]}
              extra="历史数据自动清理的保留天数,建议 90 天"
            >
              <InputNumber min={7} max={365} style={{ width: "100%" }} />
            </Form.Item>
        </div>

        <Divider />

        {/* 定时巡检报告推送配置 */}
        <div>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 500 }}>定时巡检报告推送</h3>
            <Form.Item
              label="启用定时推送"
              name="reportEnabled"
              valuePropName="checked"
              extra={<span style={{ minHeight: "22px", display: "block" }}>{!monitorEnabled ? "请先启用 Exporter 健康巡检" : ""}</span>}
            >
              <Switch disabled={!monitorEnabled} />
            </Form.Item>

            <Form.Item 
              label="推送时间配置" 
              extra="可添加多个推送时间,支持每天定时推送"
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <Space>
                  <TimePicker
                    format="HH:mm"
                    value={currentTime}
                    onChange={setCurrentTime}
                    placeholder="选择推送时间"
                    disabled={!reportEnabled || !monitorEnabled}
                    style={{ width: "100%" }}
                  />
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addCronTime}
                    disabled={!reportEnabled || !monitorEnabled}
                    style={{ flexShrink: 0 }}
                  >
                    添加推送时间
                  </Button>
                </Space>

                <div style={{ minHeight: cronList.length > 0 ? "auto" : "0px" }}>
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
                </div>
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
              <Radio.Group
                value={reportFormatValue}
                onChange={(e) => form.setFieldsValue({ reportFormat: e.target.value })}
                disabled={!reportEnabled || !monitorEnabled}
              >
                <Radio value="simple">简洁版 (推荐)</Radio>
                <Radio value="detailed">详细版</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="测试推送" extra="立即发送一次巡检报告到选择的通知组">
              <Popconfirm
                title="确认推送报告?"
                description="将立即生成并推送巡检报告到选择的通知组"
                onConfirm={handleManualSend}
                okText="确认"
                cancelText="取消"
              >
              <Button
                icon={<SendOutlined />}
                disabled={!monitorEnabled}
                loading={sending}
                style={{ width: 120, minWidth: 120 }}
              >
                立即推送报告
              </Button>
              </Popconfirm>
            </Form.Item>
        </div>
      </Form>
    </>
  )
}
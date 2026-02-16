import React from 'react';
import {
    Input, Select, Space, Button, Drawer, Tag, Descriptions,
    Progress
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { FormatDuration } from '../../utils/lib';

const { Option } = Select;

// 告警等级映射 - 支持 P0/P1/P2 和 critical/high/warning/info/low 两种格式
const SEVERITY_MAP = {
    P0: { text: 'P0', className: 'severity-tag severity-tag-p0' },
    P1: { text: 'P1', className: 'severity-tag severity-tag-p1' },
    P2: { text: 'P2', className: 'severity-tag severity-tag-p2' },
    critical: { text: 'Critical', className: 'severity-tag severity-tag-p0' },
    high: { text: 'High', className: 'severity-tag severity-tag-p1' },
    warning: { text: 'Warning', className: 'severity-tag severity-tag-p2' },
    info: { text: 'Info', className: 'severity-tag severity-tag-default' },
    low: { text: 'Low', className: 'severity-tag severity-tag-default' },
    default: { text: 'Unknown', className: 'severity-tag severity-tag-default' },
};

const renderSeverityTag = (severity) => {
    const info = SEVERITY_MAP[severity] || SEVERITY_MAP.default;
    return <Tag className={info.className}>{info.text}</Tag>;
};

// ==================== 表格列配置 ====================

/**
 * 创建告警表格列
 */
export const createAlertColumns = () => {
    return [
        {
            title: '告警名称',
            dataIndex: 'rule_name',
            key: 'rule_name',
            width: 200,
            render: (text) => <span className="text-sm font-medium">{text}</span>,
        },
        {
            title: '严重程度',
            dataIndex: 'severity',
            key: 'severity',
            width: 100,
            render: renderSeverityTag,
        },
        {
            title: '来源',
            dataIndex: 'datasource_type',
            key: 'datasource_type',
            width: 120,
            render: (text) => <span className="text-xs text-gray-500">{text}</span>,
        },
        {
            title: '持续时间',
            dataIndex: 'first_trigger_time',
            key: 'first_trigger_time',
            width: 120,
            render: (firstTriggerTime) => {
                if (!firstTriggerTime) return <span className="text-xs">-</span>;
                return <span className="text-xs">{FormatDuration(firstTriggerTime)}</span>;
            },
        },
        {
            title: '故障中心',
            dataIndex: 'faultCenterName',
            key: 'faultCenterName',
            width: 150,
            render: (text) => <span className="text-xs">{text || '-'}</span>,
        },
    ];
};

/**
 * 创建聚类结果表格列
 */
export const createIncidentColumns = (onViewDetail) => {
    return [
        {
            title: '事件名称',
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (text) => <span className="font-medium">{text}</span>,
        },
        {
            title: '严重程度',
            dataIndex: 'severity',
            key: 'severity',
            width: 100,
            render: renderSeverityTag,
        },
        {
            title: '置信度',
            dataIndex: 'confidenceScore',
            key: 'confidenceScore',
            width: 120,
            render: (score) => (
                <div className="flex items-center gap-2">
                    <Progress
                        type="circle"
                        percent={Math.round(score * 100)}
                        width={40}
                        strokeColor={score > 0.8 ? '#10b981' : '#f59e0b'}
                    />
                </div>
            ),
        },
        {
            title: '推荐操作',
            dataIndex: 'recommendedActions',
            key: 'recommendedActions',
            width: 100,
            render: (actions) => (
                <Tag color="blue">
                    {actions?.length || 0} 个操作
                </Tag>
            ),
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Button
                    type="link"
                    size="small"
                    onClick={() => onViewDetail(record)}
                >
                    查看详情
                </Button>
            ),
        },
    ];
};

// ==================== 搜索栏组件 ====================

/**
 * 搜索和筛选栏
 */
export const SearchBar = ({
    searchQuery,
    setSearchQuery,
    selectedFaultCenter,
    setSelectedFaultCenter,
    faultCenterList,
    onSearch,
    onReset,
    onRefresh,
}) => {
    return (
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
            <Input
                placeholder="输入告警名称或规则名搜索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPressEnter={onSearch}
                style={{ width: 250 }}
                allowClear
            />
            <Select
                placeholder="选择故障中心"
                value={selectedFaultCenter || undefined}
                onChange={(value) => setSelectedFaultCenter(value || '')}
                style={{ width: 200 }}
                allowClear
            >
                {faultCenterList.map(center => (
                    <Option key={center.id} value={center.id}>
                        {center.name || center.id}
                    </Option>
                ))}
            </Select>
            <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={onSearch}
            >
                搜索
            </Button>
            <Button onClick={onReset}>
                重置
            </Button>
            <Button
                icon={<ReloadOutlined />}
                onClick={onRefresh}
            >
                刷新
            </Button>
        </Space>
    );
};

// ==================== 详情抽屉组件 ====================

/**
 * 聚类结果详情抽屉
 */
export const IncidentDetailDrawer = ({
    visible,
    incident,
    onClose,
}) => {
    if (!incident) return null;

    return (
        <Drawer
            title="事件详情"
            placement="right"
            onClose={onClose}
            open={visible}
            width={600}
        >
            <Descriptions
                column={1}
                bordered
                size="small"
                items={[
                    {
                        label: '事件名称',
                        children: incident.name,
                    },
                    {
                        label: '严重程度',
                        children: renderSeverityTag(incident.severity),
                    },
                    {
                        label: '置信度',
                        children: (
                            <div className="flex items-center gap-3">
                                <Progress
                                    percent={Math.round(incident.confidenceScore * 100)}
                                    strokeColor={
                                        incident.confidenceScore > 0.8 ? '#10b981' : '#f59e0b'
                                    }
                                />
                                <span>{(incident.confidenceScore * 100).toFixed(0)}%</span>
                            </div>
                        ),
                    },
                    {
                        label: '置信度说明',
                        children: incident.confidenceExplanation || '-',
                    },
                    {
                        label: '分析推理',
                        children: incident.reasoning || '-',
                    },
                    {
                        label: '根因分析',
                        children: incident.rootCauseSummary || '-',
                    },
                    {
                        label: '受影响服务',
                        children: incident.affectedServices?.length > 0 ? (
                            <Space wrap>
                                {incident.affectedServices.map((service, i) => (
                                    <Tag key={i}>{service}</Tag>
                                ))}
                            </Space>
                        ) : (
                            '-'
                        ),
                    },
                    {
                        label: '推荐操作',
                        children: incident.recommendedActions?.length > 0 ? (
                            <ol className="pl-4 space-y-2">
                                {incident.recommendedActions.map((action, i) => (
                                    <li key={i} className="text-sm">
                                        {action}
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            '-'
                        ),
                    },
                ]}
            />
        </Drawer>
    );
};
import React, { useState, useEffect } from 'react';
import {Table, Button, Tag, Input, Popconfirm, Radio, message, Progress, Tooltip, Space, Switch} from 'antd';
import {ProbingChangeState, ProbingDelete, ProbingList} from "../../api/probing";
import {Link, useNavigate} from "react-router-dom";
import moment from 'moment';
import {CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined} from "@ant-design/icons";
import {DetailProbingHistory} from "./detail";
import {HandleApiError, HandleShowTotal} from "../../utils/lib";
import {useAppContext} from "../../context/RuleContext";

// 统一的 Tag 样式常量
const TAG_STYLE = {
    borderRadius: "12px",
    padding: "0 10px",
    fontSize: "12px",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
};

export const Probing = () => {
    const { setCloneProbeRule } = useAppContext()
    const navigate = useNavigate()
    const { Search } = Input;
    const params = new URLSearchParams(window.location.search);
    const [httpMonList, setHttpMonList] = useState([]);
    const [icmpMonList, setIcmpMonList] = useState([]);
    const [tcpMonList, setTcpMonList] = useState([]);
    const [sslMonList, setSslMonList] = useState([]);
    const [probingType, setprobingType] = useState(params.get('view')||'HTTP');
    const [searchQuery,setSearchQuery] = useState('')
    const [openDetailHistoryModal, setOpenDetailHistoryModal] = useState(false)
    const [selectedRow, setSelectedRow] = useState(null)
    const [loading,setLoading]=useState(true)
    const [height, setHeight] = useState(window.innerHeight);

    // 公共列定义：任务名称
    const getTaskNameColumn = () => ({
            title: '任务名称',
            dataIndex: 'name',
            key: 'name',
            width: 'auto',
        render: (_, record) => <>{record.ruleName || '-'}</>
    });

    // 公共列定义：端点
    const getEndpointColumn = () => ({
            title: '端点',
            key: 'probingEndpointConfig.endpoint',
            width: 'auto',
            render: (record) => (
                <div style={{display: 'flex', alignItems: 'center'}}>
                    <Button
                        type={"text"}
                        style={{
                            color: "rgba(22,119,255,0.83)",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                        onClick={() => handleModalOpen(record)}
                    >
                        {record.probingEndpointConfig?.endpoint || '-'}
                    </Button>
                </div>
            ),
    });

    // 公共列定义：更新时间
    const getUpdateTimeColumn = () => ({
            title: "更新时间",
            dataIndex: "updateAt",
            key: "updateAt",
            width: "auto",
            render: (text) => {
                const date = new Date(text * 1000)
                    return (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{date.toLocaleString()}</span>
                        </div>
                    )
            },
    });

    // 公共列定义：更新人
    const getUpdateByColumn = () => ({
            title: "更新人",
            dataIndex: "updateBy",
            key: "updateBy",
            width: "auto",
        render: (text, record) => {
            const displayName = record?.updateByRealName || text || "未知用户";
            return <Tag style={TAG_STYLE}>{displayName}</Tag>
        },
    });

    // 公共列定义：状态
    const getStatusColumn = () => ({
            title: '状态',
            dataIndex: 'enabled',
            key: 'enabled',
            width: "100px",
            render: (enabled, record) => {
                const handleStatusChange = async (checked) => {
                    try {
                        const params={
                            tenantId: record.tenantId,
                            ruleId: record.ruleId,
                            enabled: checked,
                        }
                        await ProbingChangeState(params)
                        message.success(`状态已更新为: ${checked ? "启用" : "禁用"}`);
                        handleList(probingType)
                    } catch (error) {
                        HandleApiError(error)
                    }
                };

                return (
                    <Switch
                        checked={enabled}
                        onChange={handleStatusChange}
                        checkedChildren="启用"
                        unCheckedChildren="禁用"
                        loading={false}
                    />
                );
            },
    });

    // 公共列定义：操作
    const getOperationColumn = (listLength) => ({
            title: '操作',
            dataIndex: 'operation',
            fixed: 'right',
            width: 120,
            render: (_, record) =>
            listLength >= 1 ? (
                    <Space size="middle">
                        <Link to={`/probing/${record.ruleId}/edit?type=${record.ruleType}`}>
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                style={{ color: "#1677ff" }}
                            />
                        </Link>
                        <Tooltip title="克隆">
                            <Button
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() => handleClone(record)}
                                style={{ color: "#615454" }}
                            />
                        </Tooltip>
                        <Tooltip title="删除">
                            <Popconfirm
                                title="确定要删除此任务吗?"
                                onConfirm={() => handleDelete(record)}
                                okText="确定"
                                cancelText="取消"
                                placement="left"
                            >
                                <Button type="text" icon={<DeleteOutlined />} style={{ color: "#ff4d4f" }} />
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                ) : null,
    });
    const HTTPColumns = [
        getTaskNameColumn(),
        getEndpointColumn(),
        {
            title: '状态码',
            key: 'statusCode',
            width: "100px",
            render: (record) => {
                const statusCode = record.probingEndpointValues?.pHttp?.statusCode;
                const isSuccess = statusCode >= 200 && statusCode < 300;

                return (
                    <span style={{
                        color: isSuccess ? 'green' : 'red',
                        fontWeight: 'bold',
                    }}>
                {statusCode || '-'}
            </span>
                );
            },
        },
        {
            title: '响应延迟',
            key: 'latency',
            width: "100px",
            render: (record) => (
                <>
                    {(record.probingEndpointValues?.pHttp?.latency && record.probingEndpointValues?.pHttp?.latency+"ms") || '-'}
                </>
            ),
        },
        getUpdateTimeColumn(),
        getUpdateByColumn(),
        getStatusColumn(),
        getOperationColumn(httpMonList.length),
    ]
    const ICMPColumns = [
        getTaskNameColumn(),
        getEndpointColumn(),
        {
            title: '丢包率',
            key: 'packetLoss',
            width: 'auto',
            render: (record) => {
                const packetLoss = record.probingEndpointValues?.pIcmp?.packetLoss;

                // 根据丢包率设置Tag样式和文本
                if (packetLoss === undefined || packetLoss === null || packetLoss === "") {
                    return <Tag color="gray">未知</Tag>;
                }

                return (
                    <Tag color={packetLoss < 80 ? 'green' : 'red'}>
                        {`${packetLoss}%`}
                    </Tag>
                );
            },
        },
        {
            title: '最短 RT',
            key: 'minRtt',
            width: 'auto',
            render: (record) => (
                <>
                    {(record.probingEndpointValues?.pIcmp?.minRtt && record.probingEndpointValues?.pIcmp?.minRtt+"ms") || '-'}
                </>
            ),
        },
        {
            title: '最长 RTT',
            key: 'maxRtt',
            width: 'auto',
            render: (record) => (
                <>
                    {(record.probingEndpointValues?.pIcmp?.maxRtt && record.probingEndpointValues?.pIcmp?.maxRtt+"ms") || '-'}
                </>
            ),
        },
        {
            title: '平均 RTT',
            key: 'avgRtt',
            width: 'auto',
            render: (record) => (
                <>
                    {(record.probingEndpointValues?.pIcmp?.avgRtt && record.probingEndpointValues?.pIcmp?.avgRtt+"ms") || '-'}
                </>
            ),
        },
        getUpdateTimeColumn(),
        getUpdateByColumn(),
        getStatusColumn(),
        getOperationColumn(icmpMonList.length),
    ]
    const TCPColumns = [
        getTaskNameColumn(),
        getEndpointColumn(),
        {
            title: '探测状态',
            key: 'isSuccessful',
            width: 'auto',
            render: (record) => {
                const status = record.probingEndpointValues?.pTcp?.isSuccessful;
                // 根据状态值设置标签样式和文本
                const statusTag = status === "1"
                    ? <Tag color="green">成功</Tag>
                    : status === "0"
                        ? <Tag color="red">失败</Tag>
                        : <Tag color="gray">未知</Tag>;

                return statusTag;
            },
        },
        {
            title: '错误信息',
            key: 'errorMessage',
            width: 'auto',
            render: (record) => (
                <>
                    {record.probingEndpointValues?.pTcp?.errorMessage || '-'}
                </>
            ),
        },
        getUpdateTimeColumn(),
        getUpdateByColumn(),
        getStatusColumn(),
        getOperationColumn(tcpMonList.length),
    ]
    const SSLColumns = [
        getTaskNameColumn(),
        {
            title: '端点',
            key: 'probingEndpointConfig.endpoint',
            width: 'auto',
            render: (record) => (
                <div>
                    {record.probingEndpointConfig?.endpoint || '-'}
                </div>
            ),
        },
        {
            title: '签发时间',
            key: 'startTime',
            width: 'auto',
            render: (record) => (
                <>
                    {record.probingEndpointValues?.pSsl?.startTime || '-'}
                </>
            ),
        },
        {
            title: '结束时间',
            key: 'expireTime',
            width: 'auto',
            render: (record) => (
                <>
                    {record.probingEndpointValues?.pSsl?.expireTime || '-'}
                </>
            ),
        },
        {
            title: '有效时间',
            key: 'timeProgress',
            width: 'auto',
            render: (record) => {
                const startTime = record.probingEndpointValues?.pSsl?.startTime;
                const endTime = record.probingEndpointValues?.pSsl?.expireTime;

                if (!startTime || !endTime) {
                    return '-';
                }

                // 以天为单位，使用 startOf/endOf 并向上取整
                const msPerDay = 24 * 60 * 60 * 1000;
                const startMs = moment(startTime).startOf('day').valueOf();
                const endMs = moment(endTime).endOf('day').valueOf();
                const nowMs = moment().startOf('day').valueOf();

                const totalDays = Math.max(1, Math.ceil((endMs - startMs) / msPerDay));
                const remainingDaysRaw = Math.ceil((endMs - nowMs) / msPerDay);
                const remainingDays = Math.max(0, remainingDaysRaw);

                const progress = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));

                return (
                    <div>
                        <Progress
                            percent={Number(progress.toFixed(2))}
                            status={progress > 20 ? 'active' : 'exception'}
                            strokeColor={progress > 20 ? '#52c41a' : '#ff4d4f'}
                            showInfo={false}
                        />
                        <div style={{ textAlign: 'center', fontSize: 12 }}>
                            剩余 {remainingDays} 天 / 总共 {totalDays} 天
                        </div>
                    </div>
                );
            }
        },
        {
            title: '响应延迟',
            key: 'avgRtt',
            width: 'auto',
            render: (record) => (
                <>
                    {record.probingEndpointValues?.pSsl?.responseTime + "ms" || '-'}
                </>
            ),
        },
        getUpdateTimeColumn(),
        getUpdateByColumn(),
        getStatusColumn(),
        getOperationColumn(sslMonList.length),
    ]
    const optionsWithDisabled = [
        {
            label: 'HTTP',
            value: 'HTTP',
        },
        {
            label: 'ICMP',
            value: 'ICMP',
        },
        {
            label: 'TCP',
            value: 'TCP',
        },
        {
            label: 'SSL',
            value: 'SSL',
        },
    ];

    useEffect(() => {
        // 定义一个处理窗口大小变化的函数
        const handleResize = () => {
            setHeight(window.innerHeight);
        };

        // 监听窗口的resize事件
        window.addEventListener('resize', handleResize);

        // 在组件卸载时移除监听器
        return () => {
            window.removeEventListener('resize', handleResize);
        };

    }, []);

    useEffect(() => {
        handleList(probingType)
    }, [probingType, searchQuery]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const view = urlParams.get('view');
        setprobingType(view ? view : "HTTP");

        // 从 URL 中获取 query 参数，并更新 searchQuery 的状态
        const url = new URL(window.location);
        const queryParam = url.searchParams.get('query');
        if (queryParam) {
            setSearchQuery(queryParam);
        }
    }, []);

    const handleModalOpen = (record) => {
        setOpenDetailHistoryModal(true)
        setSelectedRow(record)
    }

    const handleModalClose = () => {
        setOpenDetailHistoryModal(false)
    }

    const handleList = async (ruleType) => {
        try {
            const params = {
                ruleType: ruleType
            }
            setLoading(true)
            const res = await ProbingList(params)
            setLoading(false)
            switch (ruleType){
                case "HTTP":
                    setHttpMonList(res.data)
                    break
                case "ICMP":
                    setIcmpMonList(res.data)
                    break
                case "TCP":
                    setTcpMonList(res.data)
                    break
                case "SSL":
                    setSslMonList(res.data)
                    break
                default:
                    break
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (record) => {
        try {
            const params = {
                ruleId: record.ruleId
            }
            await ProbingDelete(params)
            handleList(probingType);
        } catch (error) {
            message.error(error);
        }
    };

    const onSearch = async (value) => {
        try {
            const params = {
                ruleType: probingType,
                query: value,
            }
            const res = await ProbingList(params)
            switch (probingType){
                case "HTTP":
                    setHttpMonList(res.data)
                    break
                case "ICMP":
                    setIcmpMonList(res.data)
                    break
                case "TCP":
                    setTcpMonList(res.data)
                    break
                case "SSL":
                    setSslMonList(res.data)
                    break
                default:
                    break
            }
        } catch (error) {
            console.error(error)
        }
    }

    const changeViewType = ({ target: { value } }) => {
        setprobingType(value);

        const url = new URL(window.location);
        url.searchParams.set('view', value); // Update or add the view parameter
        window.history.pushState({}, '', url); // Update the browser's address bar
    };

    const handleClone = (record) => {
        // 将规则数据存储到 localStorage，以便在创建页面中获取
        const cloneData = {
            ...record,
            ruleId: "", // 清空 ruleId
            probingEndpointConfig: {
                ...record.probingEndpointConfig,
                endpoint: "", // 清空 endpoint
                http: {
                    method: "", // 清空 http 字段
                    header: [], // 注意：header 是数组，应初始化为空数组
                    body: "",
                },
            },
        };

        setCloneProbeRule(cloneData)

        // 跳转到创建页面
        navigate(`/probing/create?isClone=1`)
    }

    // 公共 Table 配置
    const getTableProps = (columns, dataSource) => ({
        columns,
        dataSource,
        loading,
        scroll: {
            y: height - 280,
            x: 'max-content',
        },
        style: {
            backgroundColor: "#fff",
            borderRadius: "8px",
            overflow: "hidden",
        },
        pagination: {
            showTotal: HandleShowTotal,
            pageSizeOptions: ['10'],
        },
        rowKey: (record) => record.id,
    });

    return (
        <>
            <DetailProbingHistory visible={openDetailHistoryModal} onClose={handleModalClose} row={selectedRow}/>

            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <div style={{display: 'flex', gap: '10px'}}>
                    <Radio.Group
                        options={optionsWithDisabled}
                        onChange={changeViewType}
                        value={probingType}
                        optionType="button"
                        buttonStyle="solid"
                    />
                    <Search
                        allowClear
                        placeholder="输入搜索关键字"
                        onSearch={onSearch}
                        value={searchQuery} // 将 searchQuery 作为输入框的值
                        onChange={(e) => setSearchQuery(e.target.value)} // 更新 searchQuery 状态
                        style={{width: 300}}
                    />
                </div>

                <div style={{display: 'flex', gap: '10px'}}>
                    <Button
                        type="primary"
                        size="default"
                        style={{ marginLeft: 'auto', backgroundColor: '#000000' }}
                        onClick={() => {
                            handleList(probingType)
                        }}
                        icon={<ReloadOutlined />}
                    >刷新</Button>

                    <Link to={`/probing/create?type=${probingType}`}>
                        <Button
                            type="primary"
                            style={{
                                backgroundColor: '#000000'
                            }}
                            icon={<PlusOutlined />}
                        > 创建 </Button>
                    </Link>
                </div>
            </div>

            <div style={{overflowX: 'auto', marginTop: 10, height: '76vh'}}>
                {probingType === "HTTP" && <Table {...getTableProps(HTTPColumns, httpMonList)} />}
                {probingType === "ICMP" && <Table {...getTableProps(ICMPColumns, icmpMonList)} />}
                {probingType === "TCP" && <Table {...getTableProps(TCPColumns, tcpMonList)} />}
                {probingType === "SSL" && <Table {...getTableProps(SSLColumns, sslMonList)} />}
            </div>
        </>
    );
};
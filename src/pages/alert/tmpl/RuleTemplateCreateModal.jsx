import {
    Modal,
    Form,
    Input,
    Button,
    Radio,
    Select,
    InputNumber,
    Divider,
    Card,
    Tabs,
    message
} from 'antd'
import React, { useState, useEffect } from 'react'
import {createRuleTmpl, updateRuleTmpl} from '../../../api/ruleTmpl'
import {useParams} from "react-router-dom";
import {getDatasourceList} from "../../../api/datasource";
import {PrometheusPromQL} from "../../promethues";
import PrometheusImg from "../rule/img/Prometheus.svg";
import LokiImg from "../rule/img/L.svg";
import AlicloudImg from "../rule/img/alicloud.svg";
import JaegerImg from "../rule/img/jaeger.svg";
import VMImg from "../rule/img/victoriametrics.svg";
import K8sImg from "../rule/img/Kubernetes.svg";
import ESImg from "../rule/img/ElasticSearch.svg";
import VLogImg from "../rule/img/victorialogs.svg"
import {getKubernetesReasonList, getKubernetesResourceList} from "../../../api/kubernetes";
import VSCodeEditor from "../../../utils/VSCodeEditor";
import {PlusOutlined, EyeOutlined} from "@ant-design/icons";
import {SearchViewMetrics} from "../preview/searchViewMetrics.tsx";

const MyFormItemContext = React.createContext([])
const { Option } = Select;

function toArr(str) {
    return Array.isArray(str) ? str : [str]
}

// 表单组
const MyFormItemGroup = ({ prefix, children }) => {
    const prefixPath = React.useContext(MyFormItemContext)
    const concatPath = React.useMemo(() => [...prefixPath, ...toArr(prefix)], [prefixPath, prefix])
    return <MyFormItemContext.Provider value={concatPath}>{children}</MyFormItemContext.Provider>
}

// 表单
const MyFormItem = ({ name, ...props }) => {
    const prefixPath = React.useContext(MyFormItemContext)
    const concatName = name !== undefined ? [...prefixPath, ...toArr(name)] : undefined
    return <Form.Item name={concatName} {...props} />
}

const RuleTemplateCreateModal = ({ visible, onClose, selectedRow, type, handleList, ruleGroupName }) => {
    const [form] = Form.useForm()
    const { tmplType} = useParams()
    const cards = [
        {
            imgSrc: PrometheusImg,
            text: 'Prometheus',
        },
        {
            imgSrc: LokiImg,
            text: 'Loki',
        },
        {
            imgSrc: AlicloudImg,
            text: 'AliCloudSLS',
        },
        {
            imgSrc: JaegerImg,
            text: 'Jaeger',
        },
        {
            imgSrc: VMImg,
            text: 'VictoriaMetrics',
        },
        {
            imgSrc: K8sImg,
            text: 'KubernetesEvent',
        },
        {
            imgSrc: ESImg,
            text: 'ElasticSearch',
        },
        {
            imgSrc: VLogImg,
            text: 'VictoriaLogs',
        }
    ];
    const [selectedCard, setSelectedCard] = useState(0);
    const [selectedType, setSelectedType] = useState(0) // 数据源类型
    const [exprRule, setExprRule] = useState([{}])
    const [promQL,setPromQL] = useState()
    const [kubeResourceTypeOptions,setKubeResourceTypeOptions]=useState([])
    const [selectedKubeResource,setSelectedKubeResource]=useState('')
    const [kubeReasonListOptions,setKubeReasonListOptions]=useState({})
    const [filterTags,setFilterTags] = useState([])
    const [errors, setErrors] = useState([]);
    const [esfilter, setEsfilter] = useState([{}])
    const [spaceValue, setSpaceValue] = useState('')
    const [esFilterType,setEsFilterType] = useState('RawJson')
    const [esRawJson, setEsRawJson] = useState('')
    const [filterCondition,setFilterCondition] = useState('') // 匹配关系
    const [queryWildcard,setQueryWildcard] = useState(0) // 匹配模式
    const [previewVisible, setPreviewVisible] = useState(false) // 数据预览弹窗
    const [viewMetricsModalKey, setViewMetricsModalKey] = useState(0) // 用于强制重新渲染
    const [datasourceOptions, setDatasourceOptions] = useState([])  // 数据源列表
    const [selectedDatasourceIds, setSelectedDatasourceIds] = useState([])  // 选择的数据源ID
    const datasourceTypeMap = {
        Prometheus: 0,
        Loki: 1,
        AliCloudSLS: 2,
        Jaeger: 3,
        VictoriaMetrics: 4,
        KubernetesEvent: 5,
        ElasticSearch: 6,
        VictoriaLogs: 7
    };

    const datasourceCardMap = {
        0: "Prometheus",
        1: "Loki",
        2: "AliCloudSLS",
        3: "Jaeger",
        4: "VictoriaMetrics",
        5: "KubernetesEvent",
        6: "ElasticSearch",
        7: "VictoriaLogs",
    };

    const handleInputChange = (e) => {
        // 移除输入值中的空格
        const newValue = e.target.value.replace(/\s/g, '')
        setSpaceValue(newValue)
    }

    const handleKeyPress = (e) => {
        // 阻止空格键的默认行为
        if (e.key === ' ') {
            e.preventDefault()
        }
    }

    useEffect(() => {
        if (selectedRow) {
            form.setFieldsValue({
                annotations: selectedRow.annotations,
                datasourceId: selectedRow.datasourceId,
                datasourceType: selectedRow.datasourceType,
                description: selectedRow.description,
                enabled: selectedRow.enabled,
                evalInterval: selectedRow.evalInterval,
                forDuration: selectedRow.forDuration,
                noticeRoutes: selectedRow.noticeRoutes,
                noticeId: selectedRow.noticeId,
                repeatNoticeInterval: selectedRow.repeatNoticeInterval,
                ruleId: selectedRow.ruleId,
                ruleName: selectedRow.ruleName,
                alicloudSLSConfig: selectedRow.alicloudSLSConfig,
                lokiConfig: selectedRow.lokiConfig,
                prometheusConfig: selectedRow.prometheusConfig,
                severity: selectedRow.severity,
                jaegerConfig: {
                    service: selectedRow.jaegerConfig.service,
                    tags: selectedRow.jaegerConfig.tags,
                    scope: selectedRow.jaegerConfig.scope,
                },
                cloudwatchConfig: selectedRow.cloudwatchConfig,
                kubernetesConfig: selectedRow.kubernetesConfig,
                elasticSearchConfig: selectedRow.elasticSearchConfig,
                victoriaLogsConfig: selectedRow.victoriaLogsConfig,
                recoverNotify:selectedRow.recoverNotify,
            })

            const t = datasourceTypeMap[selectedRow.datasourceType] || 0;
            setSelectedType(t)
            setSelectedCard(t)
            setExprRule(selectedRow.prometheusConfig.rules)
            setSelectedKubeResource(selectedRow.kubernetesConfig.resource)
            setFilterTags(selectedRow.kubernetesConfig.filter)
            setEsfilter(selectedRow.elasticSearchConfig.filter)
            setEsFilterType(selectedRow.elasticSearchConfig.queryType)
            setEsRawJson(selectedRow.elasticSearchConfig.rawJson)
            setFilterCondition(selectedRow.elasticSearchConfig.filterCondition)
            setQueryWildcard(selectedRow.elasticSearchConfig.queryWildcard)

            // 关键修复：重置 promQL 状态，确保使用当前规则的 PromQL
            setPromQL(selectedRow.prometheusConfig?.promQL || '')

            // 关键修复：同步数据源ID选择状态
            if (selectedRow.datasourceId && Array.isArray(selectedRow.datasourceId)) {
                setSelectedDatasourceIds(selectedRow.datasourceId)
            } else if (selectedRow.datasourceId) {
                setSelectedDatasourceIds([selectedRow.datasourceId])
            } else {
                setSelectedDatasourceIds([])
            }

            // 关键修复：强制重新渲染数据预览组件
            setViewMetricsModalKey(prev => prev + 1)
        }
    }, [selectedRow, form])

    useEffect(() => {
        handleGetKubernetesEventTypes()
        // 获取当前数据源类型的数据源列表
        if (selectedType !== null) {
            fetchDatasourceList(getSelectedTypeName(selectedType))
            // 清空之前选择的数据源
            setSelectedDatasourceIds([])
        }
    }, [selectedType])

    // 创建
    const handleFormSubmit = async (values) => {
        let t = getSelectedTypeName(selectedType);
        const newEsConfig = {
            index: values?.elasticSearchConfig?.index,
            scope: values?.elasticSearchConfig?.scope,
            queryType: esFilterType,
            rawJson: esRawJson,
            filter: esfilter,
            queryWildcard: queryWildcard,
            filterCondition: filterCondition,
        }

        const params = {
            ...values,
            datasourceType: t,
            type: tmplType,
            ruleGroupName: ruleGroupName,
            elasticSearchConfig: newEsConfig,
        }
        if (type === 'create') {
            try {
                await createRuleTmpl(params)
                handleList(1, 10)
            } catch (error) {
                console.error(error)
            }
        }
        if (type === 'update') {
            try {
                await updateRuleTmpl(params)
                handleList(1, 10)
            } catch (error) {
                console.error(error)
            }
        }

        // 关闭弹窗
        onClose()
    }

    useEffect(() => {
        handleGetKubeReasonList(selectedKubeResource)
    }, [selectedKubeResource]);

    const handleGetKubeReasonList = async (resource)=> {
        const params = {
            resource: resource
        }
        const res = await getKubernetesReasonList(params)
        const options = res.data?.map((item) => ({
            label: item.typeCN,
            value: item.type
        }))
        setKubeReasonListOptions(options)
    }

    const handleGetKubernetesEventTypes = async() =>{
        try{
            const res = await getKubernetesResourceList()
            const ops = res.data?.map((item) =>{
                return {
                    label: item,
                    value: item,
                }
            })
            setKubeResourceTypeOptions(ops)
        } catch (error){
            console.error(error)
        }
    }

    const getSelectedTypeName = (selectedType) =>{
        return datasourceCardMap[selectedType] || "Prometheus";
    }

    const handleCardClick = (index) => {
        setSelectedType(index)
        setSelectedCard(index);
    };

    const addExprRule = () => {
        if(exprRule.length < 3){
            setExprRule([...exprRule, { severity: '', expr: '' }]);
        }
    }

    const updateExprRule = (index, field, value) => {
        const updatedExprRule = [...exprRule]
        updatedExprRule[index][field] = value
        setExprRule(updatedExprRule)
    }

    const removeExprRule = (index) => {
        const updatedExprRule = [...exprRule]
        updatedExprRule.splice(index, 1)
        setExprRule(updatedExprRule)
    }

    const disableSeverity = (s) => {
        return exprRule.some((rule) => {
            if (rule.severity) {
                return rule.severity === s;
            }
        });
    }

    const handleExprChange = (index, value) => {
        const trimmedValue = value.trim(); // 去除输入值两端的空格
        const newErrors = [...errors];

        if (trimmedValue !== value) {
            // 输入值中含有空格时，提示错误信息
            newErrors[index] = '输入的值不允许包含空格';
        } else if (validateExpr(trimmedValue) || trimmedValue === '') {
            updateExprRule(index, 'expr', trimmedValue);
            newErrors[index] = '';
        } else {
            newErrors[index] = '请输入有效的告警条件，例如：>80';
        }

        setErrors(newErrors);
    };

    const validateExpr = (expr) => {
        const regex = /^(\s*(==|>=|<=|!=|>|<)\s*-?\d+(\.\d+)?\s*)$/;
        return regex.test(expr);
    };

    const handleChangeFilterTags = (value) => {
        setFilterTags(value);
    };

    const addEsFilter = () => {
        setEsfilter([...esfilter, { field: '', value: '' }]);
    }

    const updateEsFilter = (index, field, value) => {
        const updatedEsFilter = [...esfilter]
        updatedEsFilter[index][field] = value
        setEsfilter(updatedEsFilter)
    }

    const removeEsFilter = (index) => {
        const updatedEsFilter = [...esfilter]
        updatedEsFilter.splice(index, 1)
        setEsfilter(updatedEsFilter)
    }

    // 获取当前 PromQL,优先从表单获取最新值
    const handleGetPromQL = () =>{
        // 优先从表单获取最新的 PromQL 值,确保切换规则后获取正确的数据
        const formPromQL = form.getFieldValue(['prometheusConfig', 'promQL'])
        if (formPromQL) {
            return formPromQL
        }
        // 如果表单中没有值,才使用状态中的 promQL
        return promQL || ''
    }

    useEffect(() => {
        form.setFieldsValue({ prometheusConfig: { promQL: promQL } });
    }, [promQL])

    const handleQueryWildcardChange = async (e) => {
        setQueryWildcard(e.target.value)
    };

    // 获取数据源列表
    const fetchDatasourceList = async (datasourceType) => {
        try {
            const res = await getDatasourceList({ datasourceType })
            if (res && res.data) {
                const options = res.data.map(item => ({
                    label: item.name,
                    value: item.id
                }))
                setDatasourceOptions(options)
            }
        } catch (error) {
            console.error('获取数据源列表失败:', error)
        }
    }

    // 打开数据预览Modal
    const handleOpenPreview = () => {
        const currentPromQL = handleGetPromQL()

        if (!currentPromQL) {
            message.warning('请先输入 PromQL 查询语句')
            return
        }

        if (!selectedDatasourceIds || selectedDatasourceIds.length === 0) {
            message.warning('请先选择数据源')
            return
        }

        setPreviewVisible(true)
    }

    // 关闭数据预览Modal
    const handleClosePreview = () => {
        setPreviewVisible(false)
        setViewMetricsModalKey(prev => prev + 1) // 强制重新渲染
    }

    return (
        <Modal
            visible={visible}
            onCancel={onClose}
            footer={null}
            bodyStyle={{ overflowY: 'auto', maxHeight: '600px' }} // 设置最大高度并支持滚动
            width={1080} // 设置Modal窗口宽度
        >
            <Form form={form} name="form_item_path" layout="vertical" onFinish={handleFormSubmit}>
                <div>
                    <strong style={{fontSize: '20px'}}>基础配置</strong>
                    <div style={{display: 'flex'}}>
                        <MyFormItem
                            name="ruleName"
                            label="规则名称"
                            style={{
                                marginRight: '10px',
                                width: '50%',
                            }}
                            rules={[{required: true}]}
                        >
                            <Input
                                value={spaceValue}
                                onChange={handleInputChange}
                                onKeyPress={handleKeyPress}
                                disabled={type === 'update'}/>
                        </MyFormItem>

                        <MyFormItem
                            name="description"
                            label="描述"
                            style={{width: '50%'}}
                        >
                            <Input/>
                        </MyFormItem>
                    </div>
                </div>

                <Divider/>

                <div>
                    <strong style={{fontSize: '20px'}}>规则配置</strong>

                    <div style={{display: 'flex'}}>
                        <div>
                            <p>数据源类型</p>
                            <div style={{
                                display: 'flex',
                                gap: '10px',
                                flexWrap: 'wrap',  // 添加这行使卡片自动换行
                                maxWidth: '100%',  // 可选：限制容器最大宽度
                            }}>
                                {cards?.map((card, index) => (
                                    <Card
                                        key={index}
                                        style={{
                                            height: 100,
                                            width: 120,
                                            position: 'relative',
                                            cursor: type === 'update' ? 'not-allowed' : 'pointer',
                                            border: selectedCard === index ? '2px solid #1890ff' : '1px solid #d9d9d9',
                                            pointerEvents: type === 'update' ? 'none' : 'auto',
                                            flexShrink: 0,  // 防止卡片被压缩
                                        }}
                                        onClick={() => handleCardClick(index)}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            marginTop: '-10px'
                                        }}>
                                            <img src={card.imgSrc}
                                                 style={{height: '50px', width: '100px', objectFit: 'contain'}}
                                                 alt={card.text}/>
                                            <p style={{
                                                fontSize: '12px',
                                                textAlign: 'center',
                                                marginTop: '5px'
                                            }}>{card.text}</p>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>

                    <br/>

                    {(selectedType === 0 || selectedType === 4) &&
                        <>
                            <div className="rule-config-container">
                                <MyFormItemGroup prefix={['prometheusConfig']}>
                                    <div style={{marginBottom: '24px'}}>
                                        <div style={{marginBottom: '8px', fontSize: '14px', color: 'rgba(0, 0, 0, 0.85)'}}>
                                            <span style={{color: '#ff4d4f', marginRight: '4px'}}>*</span>
                                            PromQL
                                        </div>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <MyFormItem
                                                name="promQL"
                                                label=""
                                                rules={[{required: true}]}
                                                style={{width: '100%', height: '100%', marginBottom: 0, flex: 1}}
                                                className="promql-form-item"
                                            >
                                                <PrometheusPromQL
                                                    datasourceId={selectedDatasourceIds && selectedDatasourceIds.length > 0 ? selectedDatasourceIds[0] : null}
                                                    value={handleGetPromQL()}
                                                    setPromQL={setPromQL}
                                                />
                                            </MyFormItem>
                                        </div>
                                    </div>

                                    {/* 数据源选择和预览按钮 */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ marginBottom: '8px', fontSize: '14px', color: 'rgba(0, 0, 0, 0.85)' }}>
                                            选择数据源 (用于数据预览)
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <Select
                                                mode="multiple"
                                                style={{ width: '100%', flex: 1 }}
                                                placeholder="请选择数据源"
                                                value={selectedDatasourceIds}
                                                onChange={setSelectedDatasourceIds}
                                                options={datasourceOptions}
                                            />
                                            <Button
                                                type="primary"
                                                icon={<EyeOutlined />}
                                                onClick={handleOpenPreview}
                                                style={{ backgroundColor: '#000', borderColor: '#000', color: '#fff', height: '32px', flexShrink: 0 }}
                                            >
                                                数据预览
                                            </Button>
                                        </div>
                                    </div>

                                    <MyFormItem name="" label="* 告警条件" rules={[{required: !exprRule}]}>
                                        {exprRule?.map((label, index) => (
                                            <div className="rule-item" key={index} style={{gap: '10px'}}>
                                                <MyFormItem
                                                    name={['rules', index, 'severity']}
                                                    rules={[{required: true, message: '请选择告警等级'}]}
                                                    style={{width: '20%', gap: '10px'}}
                                                >
                                                    <Select
                                                        showSearch
                                                        value={label.severity}
                                                        onChange={(e) => updateExprRule(index, 'severity', e)}
                                                        placeholder="普通"
                                                    >
                                                        <Option value="P0"
                                                                disabled={disableSeverity('P0')}>紧急</Option>
                                                        <Option value="P1"
                                                                disabled={disableSeverity('P1')}>告警</Option>
                                                        <Option value="P2"
                                                                disabled={disableSeverity('P2')}>普通</Option>
                                                    </Select>
                                                </MyFormItem>

                                                <MyFormItem
                                                    name={['rules', index, 'expr']}
                                                    rules={[{required: true, message: '请输入告警条件'}]}
                                                    validateStatus={errors[index] ? 'error' : ''}
                                                    help={errors[index]}
                                                    style={{width: '100%'}}
                                                >
                                                    <Input
                                                        placeholder='请输入有效的告警条件，例如：>80'
                                                        value={label.expr}
                                                        onChange={(e) => handleExprChange(index, e.target.value)}
                                                        style={{width: '100%'}}
                                                    />
                                                </MyFormItem>

                                                <MyFormItem
                                                    name={['rules', index, 'forDuration']}
                                                    rules={[{required: true}]}
                                                >
                                                    <InputNumber
                                                        addonBefore="持续"
                                                        addonAfter="秒"
                                                        placeholder="60"
                                                        min={0}
                                                    />
                                                </MyFormItem>

                                                <Button onClick={() => removeExprRule(index)}
                                                    // style={{marginLeft: '10px'}}
                                                        disabled={index === 0}>
                                                    -
                                                </Button>
                                            </div>
                                        ))}
                                    </MyFormItem>

                                    <div className="action-buttons" style={{marginTop: '-35px'}}>
                                        <Button icon={<PlusOutlined/>} type="dashed" block onClick={addExprRule}
                                                disabled={exprRule?.length === 3}>
                                            添加规则条件
                                        </Button>
                                    </div>

                                    <div style={{ marginTop: '30px' }}>
                                        <MyFormItem
                                            name="annotations"
                                            label="告警详情"
                                            tooltip="获取 Label 变量, 示例: ${labels.job}, ${labels.instance}。凡是 Target 中的变量均可通过`${labels.xxx}`获取。"
                                            rules={[
                                                {
                                                    required: true,
                                                },
                                            ]}>
                                            <Input/>
                                        </MyFormItem>
                                    </div>
                                </MyFormItemGroup>
                            </div>
                        </>
                    }

                    {selectedType === 2 &&
                        <MyFormItemGroup prefix={['alicloudSLSConfig']}>
                            <span>规则配置</span>
                            <div className="log-rule-config-container">
                                <div style={{display: 'flex'}}>
                                    <MyFormItem
                                        name="project"
                                        label="Project"
                                        rules={[{required: true}]}
                                        style={{
                                            marginRight: '10px',
                                            width: '500px',
                                        }}>
                                        <Input/>
                                    </MyFormItem>
                                    <MyFormItem
                                        name="logstore"
                                        label="Logstore"
                                        rules={[{required: true}]}
                                        style={{
                                            width: '500px',
                                        }}>
                                        <Input/>
                                    </MyFormItem>
                                </div>

                                <MyFormItem
                                    name="logQL"
                                    label="LogQL"
                                    rules={[{required: true}]}
                                >
                                    <Input/>
                                </MyFormItem>

                                <MyFormItem
                                    name="logScope"
                                    label="查询区间"
                                    rules={[{required: true,}]}
                                >
                                    <InputNumber
                                        style={{
                                            width: '100%',
                                        }}
                                        addonAfter={'分钟'}
                                        placeholder="10"
                                        min={1}
                                    />
                                </MyFormItem>
                            </div>
                        </MyFormItemGroup>
                    }

                    {selectedType === 1 &&
                        <MyFormItemGroup prefix={['lokiConfig']}>
                            <span>规则配置</span>
                            <div className="log-rule-config-container">
                                <MyFormItem
                                    name="logQL"
                                    label="LogQL"
                                    rules={[{required: true}]}
                                >
                                    <Input/>
                                </MyFormItem>
                                <MyFormItem
                                    name="logScope"
                                    label="查询区间"
                                    rules={[{required: true}]}
                                >
                                    <InputNumber
                                        style={{width: '100%'}}
                                        addonAfter={'分钟'}
                                        placeholder="10"
                                        min={1}
                                    />
                                </MyFormItem>
                            </div>
                        </MyFormItemGroup>
                    }

                    {selectedType === 3 &&
                        <MyFormItemGroup prefix={['jaegerConfig']}>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <MyFormItem
                                    name='tags'
                                    label="告警条件"
                                    style={{
                                        width: '100%',
                                    }}
                                    rules={[{required: true}]}
                                >
                                    <Select showSearch style={{width: '100%'}} placeholder="StatusCode =~ 5xx">
                                        <Option
                                            value='%7B"http.status_code"%3A"5.%2A%3F"%7D'>{'StatusCode =~ 5xx'}</Option>
                                    </Select>
                                </MyFormItem>
                            </div>

                            <MyFormItem
                                name="scope"
                                label="查询区间"
                                rules={[{ required: true }]}
                            >
                                <InputNumber
                                    style={{width: '100%'}}
                                    addonAfter={'分钟'}
                                    placeholder="10"
                                    min={1}
                                />
                            </MyFormItem>

                        </MyFormItemGroup>
                    }

                    {selectedType === 5 &&
                        <MyFormItemGroup prefix={['kubernetesConfig']}>
                            <span>规则配置</span>
                            <div className="log-rule-config-container">
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <MyFormItem
                                        name="resource"
                                        label="资源类型"
                                        rules={[{required: true}]}
                                        style={{
                                            width: '50%',
                                        }}>
                                        <Select
                                            showSearch
                                            placeholder="请选择资源类型"
                                            options={kubeResourceTypeOptions}
                                            onChange={(e) => setSelectedKubeResource(e)}
                                        />
                                    </MyFormItem>

                                    <MyFormItem
                                        name="reason"
                                        label="事件类型"
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}
                                        style={{
                                            width: '50%',
                                        }}>
                                        <Select
                                            showSearch
                                            placeholder="请选择事件类型"
                                            options={kubeReasonListOptions}
                                        />
                                    </MyFormItem>

                                    <MyFormItem
                                        name="value"
                                        label="告警条件"
                                        style={{
                                            width: '45%',
                                        }}
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}>
                                        <InputNumber placeholder="输入阈值" addonBefore={
                                            "当事件条数 >="
                                        } addonAfter={"条时告警"}/>
                                    </MyFormItem>
                                </div>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <MyFormItem
                                        name="filter"
                                        label="过滤"
                                        tooltip={"过滤掉事件中某些 Reason, 例如：事件中存在 'nginx' 的 Pod 需要过滤, 那么输入 'nginx' 即可, 可以输入 Pod 全名称, 'nginx-xxx-xxx'"}
                                        style={{
                                            width: '100%',
                                        }}>
                                        <Select
                                            mode="tags"
                                            style={{width: '100%'}}
                                            placeholder="按 'Enter' 添加标签"
                                            value={filterTags}
                                            onChange={handleChangeFilterTags}
                                        >
                                            {filterTags?.map((tag) => (
                                                <Option key={tag} value={tag}>
                                                    {tag}
                                                </Option>
                                            ))}
                                        </Select>
                                    </MyFormItem>
                                </div>
                                <MyFormItem
                                    name="scope"
                                    label="查询区间"
                                    rules={[{required: true}]}
                                >
                                    <InputNumber
                                        style={{width: '100%'}}
                                        addonAfter={<span>分钟</span>}
                                        placeholder="10"
                                        min={1}
                                    />
                                </MyFormItem>
                            </div>
                        </MyFormItemGroup>
                    }

                    {selectedType === 6 &&
                        <MyFormItemGroup prefix={['elasticSearchConfig']}>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <MyFormItem
                                    name="index"
                                    label="索引名称"
                                    tooltip="🔔：支持固定索引名称；支持按时间自动轮转，例如：索引名称为 test.YYYY-MM-dd，今日日期2025.02.23，那么索引名字会轮转为test.2025-02-23"
                                    rules={[{required: true,}]}
                                    style={{
                                        width: '50%',
                                    }}>
                                    <Input/>
                                </MyFormItem>

                                <MyFormItem
                                    name="scope"
                                    label="查询区间"
                                    rules={[{required: true}]}
                                    style={{
                                        width: '50%',
                                    }}
                                >
                                    <InputNumber
                                        style={{width: '100%'}}
                                        addonAfter={<span>分钟</span>}
                                        placeholder="10"
                                        min={1}
                                    />
                                </MyFormItem>
                            </div>

                            <span>规则配置</span>
                            <div className="log-rule-config-container">
                                <Tabs
                                    activeKey={esFilterType}
                                    onChange={setEsFilterType}
                                    items={[
                                        {
                                            label: '查询语句',
                                            key: 'RawJson',
                                        },
                                        {
                                            label: '字段匹配',
                                            key: 'Field',
                                        }
                                    ]}
                                />

                                {esFilterType === "Field" &&
                                    <>
                                        <MyFormItem
                                            name="filterCondition"
                                            label="匹配关系"
                                            rules={[{
                                                required: true,
                                            }]}>
                                            <Select
                                                placeholder="请选择匹配关系"
                                                style={{
                                                    flex: 1,
                                                }}
                                                value={filterCondition}
                                                onChange={setFilterCondition}
                                                options={[
                                                    {
                                                        label: 'And（表示"与"，所有子查询都必须匹配）',
                                                        value: 'And',
                                                    },
                                                    {
                                                        label: 'Or（表示"或"，至少有一个子查询需要匹配）',
                                                        value: 'Or'
                                                    },
                                                    {
                                                        label: 'Not（表示"非"，所有子查询都不能匹配）',
                                                        value: 'Not'
                                                    }
                                                ]}
                                            />
                                        </MyFormItem>

                                        <MyFormItem
                                            name="queryWildcard"
                                            label="匹配模式"
                                            rules={[{
                                                required: true,
                                            }]}>
                                            <Radio.Group
                                                block
                                                options={[
                                                    {
                                                        label: '模糊匹配',
                                                        value: 1,
                                                    },
                                                    {
                                                        label: '精准匹配',
                                                        value: 0,
                                                    },
                                                ]}
                                                defaultValue={false}
                                                value={1}
                                                onChange={handleQueryWildcardChange}
                                            />
                                        </MyFormItem>

                                        <MyFormItem name="" label="" rules={[{required: !esfilter}]}>
                                            {esfilter?.map((label, index) => (
                                                <div className="rule-item" key={index} style={{gap: '10px'}}>
                                                    <MyFormItem
                                                        name={['filter', index, 'field']}
                                                        label="字段名"
                                                        rules={[{required: true, message: '请输入字段名'}]}
                                                        style={{width: '50%', gap: '10px'}}
                                                    >
                                                        <Input
                                                            onChange={(e) => updateEsFilter(index, 'field', e.target.value)}/>
                                                    </MyFormItem>

                                                    <MyFormItem
                                                        name={['filter', index, 'value']}
                                                        label="字段值"
                                                        rules={[{required: true, message: '请输入字段值'}]}
                                                        validateStatus={errors[index] ? 'error' : ''}
                                                        help={errors[index]}
                                                        style={{width: '50%'}}
                                                    >
                                                        <Input
                                                            value={label.expr}
                                                            style={{width: '100%'}}
                                                            onChange={(e) => updateEsFilter(index, 'value', e.target.value)}
                                                        />
                                                    </MyFormItem>

                                                    <Button onClick={() => removeEsFilter(index)}
                                                            style={{marginTop: '35px'}}
                                                            disabled={index === 0}>
                                                        -
                                                    </Button>
                                                </div>
                                            ))}
                                        </MyFormItem>
                                        <Button type="link" onClick={addEsFilter} style={{
                                            display: 'block',
                                            textAlign: 'center',
                                            width: '100%',
                                            marginTop: '-30px'
                                        }}>
                                            添加一个新的筛选规则
                                        </Button>
                                    </>
                                }
                                {esFilterType === "RawJson" && (
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <MyFormItem
                                            rules={[{required: true}]}
                                            style={{width: '100%', height: '100%'}}
                                        >
                                            <VSCodeEditor onChange={setEsRawJson} value={esRawJson}/>
                                        </MyFormItem>
                                    </div>
                                )}
                            </div>
                        </MyFormItemGroup>
                    }

                    {selectedType === 7 &&
                        <MyFormItemGroup prefix={['victoriaLogsConfig']}>
                            <span>规则配置</span>
                            <div className="log-rule-config-container">
                                <MyFormItem
                                    name="logQL"
                                    label="LogQL"
                                    rules={[{required: true}]}
                                >
                                    <Input/>
                                </MyFormItem>
                                <MyFormItem
                                    name="logScope"
                                    label="查询区间"
                                    rules={[{required: true}]}
                                >
                                    <InputNumber
                                        style={{width: '100%'}}
                                        addonAfter={'分钟'}
                                        placeholder="10"
                                        min={1}
                                    />
                                </MyFormItem>
                            </div>
                        </MyFormItemGroup>
                    }

                    <div style={{display: 'flex', marginTop: '20px'}}>
                        <MyFormItem
                            name="evalInterval"
                            label="执行频率"
                            style={{width: '100%'}}
                            rules={[{required: true}]}
                        >
                            <InputNumber
                                style={{width: '100%'}}
                                addonAfter={<span>秒</span>}
                                placeholder="10"
                                min={1}
                            />
                        </MyFormItem>
                    </div>
                </div>

                {type !== 'view' &&
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                        >
                            提交
                        </Button>
                    </div>
                }
            </Form>

            {/* 数据预览 Modal */}
            <Modal
                centered
                key={viewMetricsModalKey}
                open={previewVisible}
                onCancel={handleClosePreview}
                width={1000}
                footer={null}
                styles={{
                    body: {
                        height: '80vh',
                        overflow: 'auto',
                        padding: '20px'
                    }
                }}
            >
                <SearchViewMetrics
                    key={`search-view-${viewMetricsModalKey}`}
                    datasourceType={getSelectedTypeName(selectedType)}
                    datasourceId={selectedDatasourceIds}
                    promQL={handleGetPromQL()}
                />
            </Modal>
        </Modal>
    )
}

export default RuleTemplateCreateModal
import React, {useEffect, useState} from 'react';
import {
    UserOutlined,
    BellOutlined,
    PieChartOutlined,
    NotificationOutlined,
    CalendarOutlined,
    DashboardOutlined,
    DeploymentUnitOutlined,
    AreaChartOutlined,
    FileDoneOutlined,
    SettingOutlined,
    ExceptionOutlined,
    ApiOutlined,
    TeamOutlined,
    DownOutlined,
    LogoutOutlined
} from '@ant-design/icons';
import {Link, useNavigate} from 'react-router-dom';
import {Menu, Layout, Typography, Dropdown, message, Spin, theme, Popover, Avatar} from 'antd';
import logoIcon from "../../img/logo.png";
import {getUserInfo} from "../../api/user";
import {getTenantList} from "../../api/tenant";
import "../index.css";

const { Sider } = Layout;

// 管理员菜单 - 按使用频率和业务逻辑排序
const adminMenuItems = [
    // 1. 概览 - 首页入口
    { key: '1', path: '/', icon: <AreaChartOutlined />, label: '概览' },
    
    // 2. 仪表盘 - 可视化分析（高频使用）
    { key: '2', path: '/folders', icon: <DashboardOutlined />, label: '仪表盘' },
    
    // 3. 告警管理 - 核心业务功能
    {
        key: '3',
        icon: <BellOutlined />,
        label: '告警管理',
        children: [
            { key: '3-1', path: '/ruleGroup', label: '告警规则' },
            { key: '3-2', path: '/tmplType/Metrics/group', label: '规则模板' },
            { key: '3-3', path: '/subscribes', label: '告警订阅' }
        ]
    },
    
    // 4. 故障中心 - 告警处理
    { key: '4', path: '/faultCenter', icon: <ExceptionOutlined />, label: '故障中心' },
    
    // 5. 通知配置 - 通知相关设置
    {
        key: '5',
        icon: <NotificationOutlined />,
        label: '通知配置',
        children: [
            { key: '5-1', path: '/noticeObjects', label: '通知对象' },
            { key: '5-2', path: '/noticeTemplate', label: '通知模板' },
            { key: '5-3', path: '/noticeRecords', label: '通知记录' }
        ]
    },
    
    // 6. 数据源管理 - 数据源配置
    {
        key: '6',
        icon: <PieChartOutlined />,
        label: '数据源管理',
        children: [
            { key: '6-1', path: '/datasource', label: '数据源' },
            { key: '6-2', path: '/exporterMonitor', label: 'Exporter监控' },
            { key: '6-3', path: '/metricsExplorer', label: '指标查询' }
        ]
    },
    
    // 7. 网络监控 - 拨测相关
    {
        key: '7',
        icon: <ApiOutlined />,
        label: '网络监控',
        children: [
            { key: '7-1', path: '/probing', label: '拨测任务' },
            { key: '7-2', path: '/onceProbing', label: '即时拨测' }
        ]
    },
    
    // 8. 值班管理 - 运营管理
    { key: '8', path: '/dutyManage', icon: <CalendarOutlined />, label: '值班管理' },
    
    // 9. 系统管理 - 系统配置（管理员专用）
    {
        key: '9',
        icon: <UserOutlined />,
        label: '用户与权限',
        children: [
            { key: '9-1', path: '/user', label: '用户管理' },
            { key: '9-2', path: '/userRole', label: '角色管理' },
            { key: '9-3', path: '/api', label: 'API 管理' }
        ]
    },
    { key: '10', path: '/tenants', icon: <DeploymentUnitOutlined />, label: '租户管理' },
    { key: '11', path: '/auditLog', icon: <FileDoneOutlined />, label: '审计日志' },
    {
        key: '12',
        path: '/settings',
        icon: <SettingOutlined />,
        label: '系统设置',
        children: [
            { key: '12-1', path: '/settings/email', label: '邮箱配置' },
            { key: '12-2', path: '/settings/ai', label: 'AI能力' },
            { key: '12-3', path: '/settings/auth', label: '认证配置' },
            { key: '12-4', path: '/settings/quick-action', label: '快捷操作' },
            { key: '12-5', path: '/settings/version', label: '系统版本' }
        ]
    }
];

// 普通用户菜单 - 按使用频率和业务逻辑排序（不包含系统管理功能）
const userMenuItems = [
    // 1. 概览 - 首页入口
    { key: '1', path: '/', icon: <AreaChartOutlined />, label: '概览' },
    
    // 2. 仪表盘 - 可视化分析（高频使用）
    { key: '2', path: '/folders', icon: <DashboardOutlined />, label: '仪表盘' },
    
    // 3. 告警管理 - 核心业务功能
    {
        key: '3',
        icon: <BellOutlined />,
        label: '告警管理',
        children: [
            { key: '3-1', path: '/ruleGroup', label: '告警规则' },
            { key: '3-2', path: '/tmplType/Metrics/group', label: '规则模板' },
            { key: '3-3', path: '/subscribes', label: '告警订阅' }
        ]
    },
    
    // 4. 故障中心 - 告警处理
    { key: '4', path: '/faultCenter', icon: <ExceptionOutlined />, label: '故障中心' },
    
    // 5. 通知配置 - 通知相关设置
    {
        key: '5',
        icon: <NotificationOutlined />,
        label: '通知配置',
        children: [
            { key: '5-1', path: '/noticeObjects', label: '通知对象' },
            { key: '5-2', path: '/noticeTemplate', label: '通知模板' },
            { key: '5-3', path: '/noticeRecords', label: '通知记录' }
        ]
    },
    
    // 6. 数据源管理 - 数据源配置
    {
        key: '6',
        icon: <PieChartOutlined />,
        label: '数据源管理',
        children: [
            { key: '6-1', path: '/datasource', label: '数据源' },
            { key: '6-2', path: '/exporterMonitor', label: 'Exporter监控' },
            { key: '6-3', path: '/metricsExplorer', label: '指标查询' }
        ]
    },
    
    // 7. 网络监控 - 拨测相关
    {
        key: '7',
        icon: <ApiOutlined />,
        label: '网络监控',
        children: [
            { key: '7-1', path: '/probing', label: '拨测任务' },
            { key: '7-2', path: '/onceProbing', label: '即时拨测' }
        ]
    },
    
    // 8. 值班管理 - 运营管理
    { key: '8', path: '/dutyManage', icon: <CalendarOutlined />, label: '值班管理' }
];

export const ComponentSider = () => {
    const navigate = useNavigate();
    const [selectedMenuKey, setSelectedMenuKey] = useState('');
    const [userInfo, setUserInfo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [tenantList, setTenantList] = useState([])
    const [getTenantStatus, setTenantStatus] = useState(null)

    const {
        token: { colorBgContainer },
    } = theme.useToken()

    const handleMenuClick = (info) => {
        const menuItem = findMenuItem(userInfo?.role === 'admin' ? adminMenuItems : userMenuItems, info.key);
        if (menuItem?.path) {
            setSelectedMenuKey(info.key);
            navigate(menuItem.path);
        }
    };

    const findMenuItem = (items, key) => {
        for (const item of items) {
            if (item.key === key) return item;
            if (item.children) {
                const found = item.children.find(child => child.key === key);
                if (found) return found;
            }
        }
        return null;
    };

    const convertMenuItems = (items) => {
        return items.map(item => {
            if (item.children) {
                return {
                    key: item.key,
                    icon: item.icon,
                    label: item.label,
                    children: item.children.map(child => ({
                        key: child.key,
                        label: child.label,
                    })),
                };
            }
            return {
                key: item.key,
                icon: item.icon,
                label: item.label,
            };
        });
    };

    const handleLogout = () => {
        localStorage.clear()
        navigate("/login")
    }

    const userPopoverMenuItems = [
        {
            key: "profile",
            icon: <UserOutlined />,
            label: <Link to="/profile">个人信息</Link>,
        },
        {
            type: 'divider',
        },
        {
            key: "logout",
            icon: <LogoutOutlined />,
            label: "退出登录",
            danger: true,
            onClick: handleLogout,
        },
    ]

    useEffect(() => {
        fetchUserInfo()
    }, [])

    const fetchUserInfo = async () => {
        try {
            const res = await getUserInfo()
            setUserInfo(res.data)

            if (res.data.userid) {
                await fetchTenantList(res.data.userid)
            }

            setLoading(false)
        } catch (error) {
            console.error("Failed to fetch user info:", error)
            window.localStorage.removeItem("Authorization")
            navigate("/login")
        }
    }

    const fetchTenantList = async (userid) => {
        try {
            const params = {
                userId: userid,
            }
            const res = await getTenantList(params)

            if (res.data === null || res.data.length === 0) {
                message.error("该用户没有可用租户")
                return
            }

            const opts = res.data.map((key, index) => ({
                label: key.name,
                value: key.id,
                index: index,
            }))

            setTenantList(opts)

            if (getTenantName() === null && opts.length > 0) {
                localStorage.setItem("TenantName", opts[0].label)
                localStorage.setItem("TenantID", opts[0].value)
                localStorage.setItem("TenantIndex", opts[0].index)
            }

            setTenantStatus(true)
        } catch (error) {
            console.error("Failed to fetch tenant list:", error)
            localStorage.clear()
            message.error("获取租户错误, 退出登录")
        }
    }

    const getTenantName = () => {
        return localStorage.getItem("TenantName")
    }

    if (loading || !getTenantStatus) {
        return (
            <div
                style={{
                    height: "100vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: colorBgContainer,
                }}
            >
                <Spin size="large">
                    <div style={{ padding: '50px' }} />
                </Spin>
            </div>
        )
    }

    return (
        <Sider
            className="custom-sider"
            style={{
                overflow: 'hidden',
                height: '100%',
                background: '#fff',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: 'none',
                boxShadow: 'none',
            }}
            theme="light"
        >
            {/* 顶部Logo和租户选择区域 - 显示在标记位置 */}
            <div className="logo-container">
                <img
                    src={logoIcon || "/placeholder.svg"}
                    alt="WatchAlert Logo"
                />
                {/* 租户选择器 - 移动到logo容器内，显示在标记2的位置（logo下方） */}
                <div style={{
                    position: 'absolute',
                    top: '65px',
                    left: '18px',
                    right: '18px',
                    zIndex: 1,
                }}>
                    <Dropdown menu={{ items: tenantList.map((item) => ({
                        key: item.index,
                        label: item.label,
                        onClick: () => {
                            localStorage.setItem("TenantIndex", item.index)
                            localStorage.setItem("TenantName", item.label)
                            localStorage.setItem("TenantID", item.value)
                            setSelectedMenuKey('1')
                            navigate('/')
                            window.location.reload();
                        }
                    })) }} trigger={["click"]} placement="bottomLeft">
                        <div className="tenant-selector">
                            <TeamOutlined style={{color: '#333', fontSize: '14px', marginRight: '8px'}}/>
                            <Typography.Text
                                style={{color: '#333', fontSize: '14px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                {getTenantName()}
                            </Typography.Text>
                            <DownOutlined style={{color: '#333', fontSize: '12px'}}/>
                        </div>
                    </Dropdown>
                </div>

                {/* 菜单栏 - 移动到logo容器内，显示在标记2的位置（租户选择器下方） */}
                <div style={{
                    position: 'absolute',
                    top: '110px',
                    left: '0',
                    right: '0',
                    bottom: '80px',
                    zIndex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                }}>
                    <Menu
                        theme="light"
                        mode="inline"
                        selectedKeys={[selectedMenuKey]}
                        style={{ background: 'transparent', border: 'none'}}
                        items={convertMenuItems(userInfo?.role === 'admin' ? adminMenuItems : userMenuItems)}
                        onClick={handleMenuClick}
                    />
                </div>
            </div>

            {/* 绝对定位底部用户信息 */}
            <div style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: '100%',
                padding: '10px',
                borderTop: '1px solid #f0f0f0',
                background: '#fff',
            }}>
                <Popover content={<Menu items={userPopoverMenuItems} mode="vertical" />} trigger="click" placement="topRight">
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        padding: '8px',
                        borderRadius: '4px',
                        width: '100%',
                    }}>
                        <Avatar
                            style={{
                                backgroundColor: "#1890ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            size="default"
                            icon={<UserOutlined />}
                        />
                        <div style={{marginLeft: "12px", overflow: 'hidden'}}>
                            <Typography.Text style={{color: "#333", display: 'block'}}>
                                {userInfo?.username || ""}
                            </Typography.Text>
                        </div>
                    </div>
                </Popover>
            </div>
        </Sider>
    );
};
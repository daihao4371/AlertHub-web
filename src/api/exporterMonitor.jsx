import http from '../utils/http';
import { message } from 'antd';
import { HandleApiError } from "../utils/lib";

// 获取实时 Exporter 状态
async function getExporterStatus(params) {
    try {
        const res = await http('get', '/api/w8t/exporter/monitor/status', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

// 获取历史趋势数据
async function getExporterHistory(params) {
    try {
        const res = await http('get', '/api/w8t/exporter/monitor/history', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

// 获取配置（同时获取监控配置和推送配置）
async function getExporterConfig() {
    try {
        const [monitorConfigRes, scheduleRes] = await Promise.all([
            http('get', '/api/w8t/exporter/monitor/config'),
            http('get', '/api/w8t/exporter/monitor/schedule')
        ]);
        
        return {
            ...monitorConfigRes,
            data: {
                monitorConfig: monitorConfigRes?.data || {},
                reportSchedule: scheduleRes?.data || {}
            }
        };
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

// 更新配置（同时保存监控配置和推送配置）
async function updateExporterConfig(params) {
    try {
        const { monitorConfig, reportSchedule } = params;
        
        if (!monitorConfig || !reportSchedule) {
            throw new Error('配置数据不完整');
        }
        
        // 同时保存监控配置和推送配置
        const [configRes, scheduleRes] = await Promise.all([
            http('post', '/api/w8t/exporter/monitor/config', monitorConfig),
            http('post', '/api/w8t/exporter/monitor/schedule', reportSchedule)
        ]);
        
        // 不在这里显示成功消息，让组件自己处理
        return {
            ...configRes,
            data: {
                monitorConfig: configRes?.data || {},
                reportSchedule: scheduleRes?.data || {}
            }
        };
    } catch (error) {
        HandleApiError(error);
        throw error; // 重新抛出错误，让组件处理
    }
}

// 手动触发巡检报告推送
async function sendExporterReport(params) {
    try {
        const res = await http('post', '/api/w8t/exporter/monitor/report/send', params);
        message.success('报告推送成功');
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

// 更新自动刷新状态
async function updateAutoRefresh(autoRefresh) {
    try {
        const res = await http('post', '/api/w8t/exporter/monitor/autoRefresh', {
            autoRefresh: Boolean(autoRefresh)
        });
        return res;
    } catch (error) {
        HandleApiError(error);
        throw error;
    }
}

export {
    getExporterStatus,
    getExporterHistory,
    getExporterConfig,
    updateExporterConfig,
    sendExporterReport,
    updateAutoRefresh
};
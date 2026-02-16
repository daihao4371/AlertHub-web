import http from '../utils/http';
import { message } from 'antd';
import { HandleApiError } from "../utils/lib";

/**
 * 执行告警聚类分析
 * @param {Object} params - { alertIds: string[], topologyData?: string }
 */
async function RCACluster(params) {
    try {
        const res = await http('post', '/api/w8t/rca/cluster', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 查询 RCA 事件列表
 * @param {Object} params - { status?, severity?, startTime?, endTime?, page?, pageSize? }
 */
async function RCAGetIncidents(params) {
    try {
        const res = await http('get', '/api/w8t/rca/incidents', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 提交用户反馈
 * @param {string} suggestionId - 建议ID
 * @param {Object} params - { status: 'accepted'|'rejected', score: 1-5, comment?: string }
 */
async function RCACommitFeedback(suggestionId, params) {
    try {
        const res = await http('post', `/api/w8t/rca/cluster/${suggestionId}/commit`, params);
        message.open({
            type: 'success',
            content: '反馈已提交',
        });
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 获取 RCA 统计报告
 * @param {Object} params - { startTime: number, endTime: number }
 */
async function RCAGetReport(params) {
    try {
        const res = await http('get', '/api/w8t/rca/report', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

export {
    RCACluster,
    RCAGetIncidents,
    RCACommitFeedback,
    RCAGetReport
}
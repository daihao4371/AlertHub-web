/**
 * 第三方告警API
 * 用于查询和管理通过Webhook接收的第三方告警记录
 *
 * 主要功能：
 * - 查询第三方告警记录列表
 * - 查询单个告警详情
 * - 按Webhook、处理状态、告警状态等条件过滤
 *
 * 注意：
 * - 告警接收接口（POST /api/webhook/:webhookId）是公开接口，无需认证
 * - 本文件中的查询接口需要认证和租户隔离
 *
 * @author AlertHub Team
 * @date 2026-01-11
 */

import http from '../utils/http';
import {HandleApiError} from "../utils/lib";

/**
 * 获取第三方告警记录列表（分页）
 * @param {Object} params - 查询参数
 * @param {string} [params.webhookId] - Webhook配置ID过滤（可选）
 * @param {string} [params.processStatus] - 处理状态过滤（可选，success成功 / failed失败）
 * @param {string} [params.status] - 告警状态过滤（可选，firing触发 / resolved已恢复）
 * @param {number} [params.index=1] - 页码（AlertHub使用index，不是page）
 * @param {number} [params.size=20] - 每页数量（AlertHub使用size，不是pageSize）
 * @returns {Promise} 返回告警记录列表和总数
 * @example
 * // 查询所有告警
 * getThirdPartyAlertList({ index: 1, size: 20 });
 *
 * // 查询指定Webhook的告警
 * getThirdPartyAlertList({ webhookId: 'wh_xxxxx', index: 1, size: 20 });
 *
 * // 查询失败的告警
 * getThirdPartyAlertList({ processStatus: 'failed', index: 1, size: 20 });
 *
 * // 查询触发中的告警
 * getThirdPartyAlertList({ status: 'firing', index: 1, size: 20 });
 */
async function getThirdPartyAlertList(params) {
    try {
        const res = await http('get', '/api/w8t/thirdPartyAlert/list', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 获取单个第三方告警详情
 * @param {Object} params - 查询参数
 * @param {string} params.id - 告警记录ID（必填）
 * @returns {Promise} 返回告警详细信息（包含原始数据、处理状态等）
 */
async function getThirdPartyAlert(params) {
    try {
        const res = await http('get', '/api/w8t/thirdPartyAlert/get', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 获取指定Webhook的告警统计信息
 * @param {Object} params - 查询参数
 * @param {string} params.webhookId - Webhook配置ID（必填）
 * @returns {Promise} 返回统计信息（总数、成功数、失败数等）
 */
async function getAlertStatistics(params) {
    try {
        // 并发查询不同状态的告警数量
        const [allRes, successRes, failedRes, firingRes, resolvedRes] = await Promise.all([
            http('get', '/api/w8t/thirdPartyAlert/list', {
                webhookId: params.webhookId,
                index: 1,
                size: 1
            }),
            http('get', '/api/w8t/thirdPartyAlert/list', {
                webhookId: params.webhookId,
                processStatus: 'success',
                index: 1,
                size: 1
            }),
            http('get', '/api/w8t/thirdPartyAlert/list', {
                webhookId: params.webhookId,
                processStatus: 'failed',
                index: 1,
                size: 1
            }),
            http('get', '/api/w8t/thirdPartyAlert/list', {
                webhookId: params.webhookId,
                status: 'firing',
                index: 1,
                size: 1
            }),
            http('get', '/api/w8t/thirdPartyAlert/list', {
                webhookId: params.webhookId,
                status: 'resolved',
                index: 1,
                size: 1
            })
        ]);

        return {
            code: 200,
            data: {
                total: allRes.data?.total || 0,
                successCount: successRes.data?.total || 0,
                failedCount: failedRes.data?.total || 0,
                firingCount: firingRes.data?.total || 0,
                resolvedCount: resolvedRes.data?.total || 0
            }
        };
    } catch (error) {
        HandleApiError(error, '获取告警统计信息失败')
        return error
    }
}

export {
    getThirdPartyAlertList,
    getThirdPartyAlert,
    getAlertStatistics
}

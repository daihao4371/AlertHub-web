/**
 * 第三方Webhook管理API
 * 用于管理第三方告警系统的Webhook配置
 *
 * 主要功能：
 * - 创建、更新、删除Webhook配置
 * - 查询Webhook列表和详情
 * - 启用/禁用Webhook
 *
 * @author AlertHub Team
 * @date 2026-01-11
 */

import http from '../utils/http';
import { message } from 'antd';
import {HandleApiError} from "../utils/lib";

/**
 * 获取Webhook配置列表（分页）
 * @param {Object} params - 查询参数
 * @param {string} [params.source] - 来源系统过滤（如：zabbix、nagios、prometheus）
 * @param {string} [params.status] - 状态过滤（active启用 / disabled禁用）
 * @param {string} [params.query] - 关键词搜索（支持搜索名称、描述）
 * @param {number} [params.index=1] - 页码（AlertHub使用index，不是page）
 * @param {number} [params.size=20] - 每页数量（AlertHub使用size，不是pageSize）
 * @returns {Promise} 返回Webhook配置列表和总数
 */
async function getWebhookList(params) {
    try {
        const res = await http('get', '/api/w8t/thirdPartyWebhook/list', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 获取单个Webhook配置详情
 * @param {Object} params - 查询参数
 * @param {string} params.id - Webhook配置ID（必填）
 * @returns {Promise} 返回Webhook配置详细信息（包含webhookUrl、callCount等）
 */
async function getWebhook(params) {
    try {
        const res = await http('get', '/api/w8t/thirdPartyWebhook/get', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 创建Webhook配置
 * @param {Object} params - Webhook配置参数
 * @param {string} params.name - Webhook名称（必填）
 * @param {string} params.description - 描述说明（必填）
 * @param {string} params.source - 来源系统（必填，如：zabbix、nagios、prometheus等）
 * @param {string} [params.dataMapping] - 数据映射规则（JSON格式字符串，可选）
 * @param {string} [params.transform] - 转换脚本（JavaScript代码，可选）
 * @param {boolean} [params.enableLog=false] - 是否记录详细日志
 * @param {string} params.createBy - 创建人用户ID（必填）
 * @returns {Promise} 返回创建的Webhook配置信息（包含自动生成的webhookUrl）
 */
async function createWebhook(params) {
    try {
        const res = await http('post', '/api/w8t/thirdPartyWebhook/create', params);
        message.open({
            type: 'success',
            content: 'Webhook配置创建成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 更新Webhook配置
 * @param {Object} params - Webhook配置参数
 * @param {string} params.id - Webhook配置ID（必填）
 * @param {string} params.name - Webhook名称
 * @param {string} params.description - 描述说明
 * @param {string} params.source - 来源系统
 * @param {string} [params.dataMapping] - 数据映射规则（JSON格式字符串）
 * @param {string} [params.transform] - 转换脚本（JavaScript代码）
 * @param {string} [params.status] - 状态（active启用 / disabled禁用）
 * @param {boolean} [params.enableLog] - 是否记录详细日志
 * @param {string} params.updateBy - 更新人用户ID（必填）
 * @returns {Promise}
 */
async function updateWebhook(params) {
    try {
        const res = await http('post', '/api/w8t/thirdPartyWebhook/update', params);
        message.open({
            type: 'success',
            content: 'Webhook配置更新成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 删除Webhook配置
 * @param {Object} params - 删除参数
 * @param {string} params.id - Webhook配置ID（必填）
 * @returns {Promise}
 */
async function deleteWebhook(params) {
    try {
        const res = await http('post', '/api/w8t/thirdPartyWebhook/delete', params);
        message.open({
            type: 'success',
            content: 'Webhook配置删除成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 启用Webhook配置（快捷方法）
 * @param {Object} params - 包含id、updateBy等字段
 * @param {string} params.id - Webhook配置ID（必填）
 * @param {string} params.updateBy - 更新人用户ID（必填）
 * @returns {Promise}
 */
async function enableWebhook(params) {
    try {
        // 获取当前Webhook配置信息
        const webhookRes = await getWebhook({ id: params.id });
        if (webhookRes.code !== 200) {
            throw new Error('获取Webhook配置失败');
        }

        const webhook = webhookRes.data;

        // 更新状态为active
        const res = await http('post', '/api/w8t/thirdPartyWebhook/update', {
            id: params.id,
            name: webhook.name,
            description: webhook.description,
            source: webhook.source,
            dataMapping: webhook.dataMapping || '{}',
            transform: webhook.transform || '',
            status: 'active',
            enableLog: webhook.enableLog || false,
            updateBy: params.updateBy
        });

        message.open({
            type: 'success',
            content: 'Webhook配置已启用',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 禁用Webhook配置（快捷方法）
 * @param {Object} params - 包含id、updateBy等字段
 * @param {string} params.id - Webhook配置ID（必填）
 * @param {string} params.updateBy - 更新人用户ID（必填）
 * @returns {Promise}
 */
async function disableWebhook(params) {
    try {
        // 获取当前Webhook配置信息
        const webhookRes = await getWebhook({ id: params.id });
        if (webhookRes.code !== 200) {
            throw new Error('获取Webhook配置失败');
        }

        const webhook = webhookRes.data;

        // 更新状态为disabled
        const res = await http('post', '/api/w8t/thirdPartyWebhook/update', {
            id: params.id,
            name: webhook.name,
            description: webhook.description,
            source: webhook.source,
            dataMapping: webhook.dataMapping || '{}',
            transform: webhook.transform || '',
            status: 'disabled',
            enableLog: webhook.enableLog || false,
            updateBy: params.updateBy
        });

        message.open({
            type: 'success',
            content: 'Webhook配置已禁用',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

export {
    getWebhookList,
    getWebhook,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    enableWebhook,
    disableWebhook
}

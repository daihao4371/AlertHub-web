import http from '../utils/http';
import { message } from 'antd';
import { HandleApiError } from "../utils/lib";

// Consul 目标管理

/**
 * 获取目标机器列表
 * @param {Object} params - 查询参数
 * @param {number} params.index - 页码（从1开始）
 * @param {number} params.size - 每页数量
 * @param {string} params.job - Job 名称（可选）
 * @param {string} params.status - 状态过滤（可选：up/down/offline）
 * @param {string} params.keyword - 关键词搜索（可选）
 * @returns {Promise} 返回目标列表
 */
async function GetConsulTargets(params) {
    try {
        const res = await http('get', '/api/w8t/consul/targets', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 获取目标详情
 * @param {Object} params - 请求参数
 * @param {string|number} params.id - 目标ID
 * @returns {Promise} 返回目标详情
 */
async function GetConsulTargetById(params) {
    try {
        const res = await http('get', `/api/w8t/consul/targets/${params.id}`, params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 注销目标机器
 * @param {Object} params - 请求参数
 * @param {string|number} params.id - 目标ID
 * @param {string} params.reason - 注销原因（可选）
 * @returns {Promise} 返回注销结果
 */
async function DeregisterConsulTarget(params) {
    try {
        const res = await http('post', `/api/w8t/consul/targets/${params.id}/deregister`, params);
        message.open({
            type: 'success',
            content: '目标机器已成功注销',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 重新上线已注销的目标
 * @param {Object} params - 请求参数
 * @param {string|number} params.id - 目标ID
 * @returns {Promise} 返回重新上线结果
 */
async function ReRegisterConsulTarget(params) {
    try {
        const res = await http('post', `/api/w8t/consul/targets/${params.id}/reregister`, params);
        message.open({
            type: 'success',
            content: '目标已重新上线',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 同步 Consul 目标
 * @param {Object} params - 请求参数（通常不需要，租户ID从中间件获取）
 * @returns {Promise} 返回同步结果
 */
async function SyncConsulTargets(params) {
    try {
        const res = await http('post', '/api/w8t/consul/sync', params);
        message.open({
            type: 'success',
            content: 'Consul目标同步成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 手动注册服务到 Consul
 * @param {Object} params - 请求参数
 * @param {string} params.serviceId - 服务ID（必填，唯一标识）
 * @param {string} params.serviceName - 服务名称（必填）
 * @param {string} params.address - 服务地址（必填）
 * @param {number} params.port - 服务端口（必填）
 * @param {string} params.job - Job 名称（可选）
 * @param {Array<string>} params.tags - 标签列表（可选）
 * @param {Object} params.labels - 标签键值对（可选）
 * @returns {Promise} 返回注册结果
 */
async function RegisterConsulTarget(params) {
    try {
        const res = await http('post', '/api/w8t/consul/targets/register', params);
        message.open({
            type: 'success',
            content: '服务注册成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

// Consul 标签相关

/**
 * 按标签获取目标列表
 * @param {Object} params - 查询参数
 * @param {number} params.index - 页码（从1开始）
 * @param {number} params.size - 每页数量
 * @param {string} params.job - 标签名称（必填，注意：这里实际是 tag 参数）
 * @returns {Promise} 返回目标列表
 */
async function GetConsulTargetsByTag(params) {
    try {
        const res = await http('get', '/api/w8t/consul/targets/by-tag', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 按 Job 和标签结合查询目标
 * @param {Object} params - 查询参数
 * @param {number} params.index - 页码（从1开始）
 * @param {number} params.size - 每页数量
 * @param {string} params.job - Job 名称（必填）
 * @param {string} params.keyword - 标签名称（必填）
 * @returns {Promise} 返回目标列表
 */
async function GetConsulTargetsByJobAndTag(params) {
    try {
        const res = await http('get', '/api/w8t/consul/targets/by-job-tag', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 更新单个目标的标签
 * @param {Object} params - 请求参数
 * @param {string|number} params.id - 目标ID
 * @param {Object} params.labels - 标签对象
 * @returns {Promise} 返回更新结果
 */
async function UpdateConsulTargetTags(params) {
    try {
        const res = await http('post', `/api/w8t/consul/targets/${params.id}/tags`, params);
        message.open({
            type: 'success',
            content: '目标标签更新成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

// Consul 注销记录管理

/**
 * 获取注销历史记录列表
 * @param {Object} params - 查询参数
 * @param {number} params.index - 页码（从1开始）
 * @param {number} params.size - 每页数量
 * @returns {Promise} 返回注销历史记录列表
 */
async function GetConsulOfflineLogs(params) {
    try {
        const res = await http('get', '/api/w8t/consul/offline-logs', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

export {
    // 目标管理
    GetConsulTargets,
    GetConsulTargetById,
    RegisterConsulTarget,
    DeregisterConsulTarget,
    ReRegisterConsulTarget,
    SyncConsulTargets,
    // 标签相关
    GetConsulTargetsByTag,
    GetConsulTargetsByJobAndTag,
    UpdateConsulTargetTags,
    // 注销记录管理
    GetConsulOfflineLogs
}

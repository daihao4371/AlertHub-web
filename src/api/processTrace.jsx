import http from '../utils/http';
import { HandleApiError } from "../utils/lib";

/**
 * 获取处理流程追踪记录（单个）
 * @param {Object} params - 请求参数
 * @param {string} params.fingerprint - 告警指纹（必填）
 * @returns {Promise} 返回处理流程追踪记录
 */
export async function getProcessTrace(params) {
    try {
        const queryString = Object.keys(params)
            .map(key => params[key] !== undefined ? `${key}=${params[key]}` : '')
            .filter(Boolean)
            .join('&');
        const response = await http('get', `/api/w8t/process-trace?${queryString}`);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 获取处理流程追踪记录列表
 * @param {Object} params - 请求参数
 * @param {string} params.eventId - 告警事件ID（可选）
 * @param {string} params.faultCenterId - 故障中心ID（可选）
 * @param {number} params.page - 页码（可选，默认1）
 * @param {number} params.pageSize - 每页数量（可选，默认10）
 * @returns {Promise} 返回处理流程追踪记录列表
 */
export async function getProcessTraceList(params) {
    try {
        const queryString = Object.keys(params)
            .map(key => params[key] !== undefined ? `${key}=${params[key]}` : '')
            .filter(Boolean)
            .join('&');
        const url = queryString ? `/api/w8t/process-trace/list?${queryString}` : '/api/w8t/process-trace/list';
        const response = await http('get', url);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 更新处理状态（支持分配处理人）
 * @param {Object} params - 请求参数
 * @param {string} params.eventId - 告警事件ID（必填）
 * @param {string} params.status - 新状态（必填，可选值：detected/analyzing/correlated/processing/validated/completed）
 * @param {string} params.assignedUser - 分配处理人（可选，不填默认为当前操作人）
 * @param {string} params.description - 操作描述（可选，描述本次状态更新的内容）
 * @returns {Promise} 返回更新结果
 */
export async function updateProcessStatus(params) {
    try {
        const response = await http('put', '/api/w8t/process-trace/status', params);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 添加处理步骤（兼容性函数，推荐使用updateProcessStatus）
 * @deprecated 请使用 updateProcessStatus 替代，功能更完整
 * @param {Object} params - 请求参数
 * @param {string} params.eventId - 告警事件ID（必填）
 * @param {string} params.stepName - 步骤名称（必填）
 * @param {string} params.description - 步骤描述（必填）
 * @param {string} params.assignedUser - 分配处理人（可选）
 * @returns {Promise} 返回添加结果
 */
export async function addProcessStep(params) {
    // 兼容性实现：使用updateProcessStatus来实现添加步骤功能
    // 获取当前状态然后使用同样状态更新，只添加步骤
    console.warn('addProcessStep 已废弃，请使用 updateProcessStatus 替代');
    
    try {
        // 先获取当前状态
        const traceResponse = await getProcessTrace({ fingerprint: params.eventId });
        const currentStatus = traceResponse?.data?.currentStatus || 'processing';
        
        // 使用新的updateProcessStatus接口
        const response = await updateProcessStatus({
            eventId: params.eventId,
            status: currentStatus, // 保持当前状态不变
            assignedUser: params.assignedUser,
            description: params.stepName + ": " + params.description // 将步骤名称合并到描述中
        });
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}


/**
 * 更新AI分析结果
 * @param {Object} params - 请求参数
 * @param {string} params.eventId - 告警事件ID（必填）
 * @param {string} params.stepName - 步骤名称（必填）
 * @param {string} params.analysisType - 分析类型（必填）
 * @param {Object} params.analysisResult - 分析结果（必填）
 * @param {number} params.confidence - 置信度（可选）
 * @param {Array<string>} params.suggestions - 处理建议（可选）
 * @returns {Promise} 返回更新结果
 */
export async function updateAIAnalysis(params) {
    try {
        const response = await http('put', '/api/w8t/process-trace/ai-analysis', params);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 获取操作日志列表
 * @param {Object} params - 请求参数
 * @param {string} params.fingerprint - 告警指纹（必填）
 * @param {number} params.page - 页码（可选，默认1）
 * @param {number} params.pageSize - 每页数量（可选，默认10）
 * @returns {Promise} 返回操作日志列表
 */
export async function getOperationLogs(params) {
    try {
        const queryString = Object.keys(params)
            .map(key => params[key] !== undefined ? `${key}=${params[key]}` : '')
            .filter(Boolean)
            .join('&');
        const response = await http('get', `/api/w8t/process-trace/operation-logs?${queryString}`);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 获取流程统计数据
 * @param {Object} params - 请求参数
 * @param {number} params.startTime - 开始时间戳（可选，默认30天前）
 * @param {number} params.endTime - 结束时间戳（可选，默认当前时间）
 * @returns {Promise} 返回流程统计数据
 */
export async function getProcessStatistics(params) {
    try {
        const queryString = Object.keys(params)
            .map(key => params[key] !== undefined ? `${key}=${params[key]}` : '')
            .filter(Boolean)
            .join('&');
        const url = queryString ? `/api/w8t/process-trace/statistics?${queryString}` : '/api/w8t/process-trace/statistics';
        const response = await http('get', url);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}


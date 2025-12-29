import http from '../utils/http';
import {HandleApiError} from "../utils/lib";

/**
 * AI 聊天功能（原有功能，保持不变）
 * @param {Object} params - 请求参数
 * @param {string} params.content - 告警事件详情
 * @param {string} params.ruleName - 规则名称
 * @param {string} params.ruleId - 规则ID
 * @param {string} params.searchQL - 搜索查询
 * @param {string} params.deep - 是否深度分析
 * @returns {Promise} 返回AI分析结果
 */
export async function ReqAiAnalyze(params) {
    try {
        const response = await http('post', `/api/w8t/ai/chat`, params);
        return response;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 智能分析单个告警
 * @param {Object} params - 请求参数
 * @param {string} params.tenantId - 租户ID
 * @param {Array} params.alerts - 告警列表（单个告警）
 * @param {string} params.analysisType - 分析类型（anomaly/correlation/context）
 * @param {Object} params.options - 分析选项
 * @returns {Promise} 返回智能分析结果
 */
export async function analyzeAlert(params) {
    try {
        const response = await http('post', '/api/w8t/ai/intelligent/analyze', params);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 批量智能分析告警
 * @param {Object} params - 请求参数
 * @param {string} params.tenantId - 租户ID
 * @param {Array} params.alerts - 告警列表（多个告警）
 * @param {string} params.analysisType - 分析类型
 * @param {Object} params.options - 分析选项
 * @returns {Promise} 返回批量分析结果数组
 */
export async function batchAnalyzeAlerts(params) {
    try {
        const response = await http('post', '/api/w8t/ai/intelligent/analyze/batch', params);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 关联分析
 * @param {Object} params - 请求参数
 * @param {string} params.tenantId - 租户ID
 * @param {Array} params.alerts - 告警列表
 * @param {string} params.analysisType - 分析类型
 * @param {Object} params.options - 分析选项
 * @returns {Promise} 返回关联分析结果
 */
export async function analyzeCorrelations(params) {
    try {
        const response = await http('post', '/api/w8t/ai/intelligent/correlations', params);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 获取关联分析结果
 * @param {string} correlationId - 关联分析ID
 * @param {string} tenantId - 租户ID
 * @returns {Promise} 返回关联分析结果
 */
export async function getCorrelationResult(correlationId, tenantId) {
    try {
        const params = { tenantId };
        const response = await http('get', `/api/w8t/ai/intelligent/correlations/${correlationId}`, params);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 上下文增强
 * @param {Object} params - 请求参数
 * @param {string} params.tenantId - 租户ID
 * @param {Array} params.alerts - 告警列表（单个告警）
 * @param {string} params.analysisType - 分析类型
 * @param {Object} params.options - 分析选项
 * @returns {Promise} 返回增强后的告警信息
 */
export async function enrichAlertContext(params) {
    try {
        const response = await http('post', '/api/w8t/ai/intelligent/enrich', params);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 收集用户反馈
 * @param {Object} feedback - 反馈数据
 * @param {string} feedback.tenantId - 租户ID
 * @param {string} feedback.userId - 用户ID
 * @param {string} feedback.alertId - 告警ID
 * @param {string} feedback.fingerprint - 告警指纹
 * @param {string} feedback.feedbackType - 反馈类型（confirm/reject/modify）
 * @param {string} feedback.actionTaken - 采取的行动
 * @param {string} feedback.correctSeverity - 正确的严重等级
 * @param {string} feedback.correctCategory - 正确的分类
 * @param {string} feedback.userComment - 用户评论
 * @param {boolean} feedback.recommendationUseful - 推荐是否有用
 * @param {number} feedback.accuracyRating - 准确度评分（1-5）
 * @param {number} feedback.resolutionTime - 解决时间（秒）
 * @returns {Promise} 返回反馈提交结果
 */
export async function collectFeedback(feedback) {
    try {
        const response = await http('post', '/api/w8t/ai/intelligent/feedback', feedback);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 获取反馈统计
 * @param {Object} params - 请求参数
 * @param {string} params.tenantId - 租户ID（必填）
 * @param {number} params.startTime - 开始时间戳（可选，默认最近30天）
 * @param {number} params.endTime - 结束时间戳（可选，默认当前时间）
 * @returns {Promise} 返回反馈统计数据
 */
export async function getFeedbackStats(params) {
    try {
        const response = await http('get', '/api/w8t/ai/intelligent/feedback/stats', params);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 获取分析结果
 * @param {string} tenantId - 租户ID
 * @param {string} fingerprint - 告警指纹
 * @returns {Promise} 返回分析结果
 */
export async function getAnalysisResult(tenantId, fingerprint) {
    try {
        const response = await http('get', `/api/w8t/ai/intelligent/analysis/${tenantId}/${fingerprint}`);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 开始模型训练
 * @param {Object} params - 训练请求参数
 * @param {string} params.tenantId - 租户ID
 * @param {string} params.modelType - 模型类型
 * @param {string} params.algorithmType - 算法类型
 * @param {string} params.trainingType - 训练类型（initial/incremental/retrain）
 * @param {Object} params.trainingParams - 训练参数
 * @param {number} params.datasetSize - 数据集大小
 * @returns {Promise} 返回训练任务信息
 */
export async function startTraining(params) {
    try {
        const response = await http('post', '/api/w8t/ai/intelligent/training', params);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

/**
 * 获取训练状态
 * @param {string} trainingId - 训练任务ID
 * @returns {Promise} 返回训练状态信息
 */
export async function getTrainingStatus(trainingId) {
    try {
        const response = await http('get', `/api/w8t/ai/intelligent/training/${trainingId}`);
        return response;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

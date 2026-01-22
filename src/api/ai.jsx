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

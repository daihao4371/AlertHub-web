import http from '../utils/http';
import { message } from 'antd';
import {HandleApiError} from "../utils/lib";

async function getNoticeTmplList(params) {
    try {
        const res = await http('get', '/api/w8t/noticeTemplate/noticeTemplateList', params);
        // 修复：确保返回的数据格式正确，即使 API 返回错误也要有正确的结构
        if (!res || !res.data) {
            return { data: [], code: res?.code || 400, message: res?.message || '获取通知模版列表失败' };
        }
        return res;
    } catch (error) {
        HandleApiError(error)
        // 修复：返回统一的错误格式，而不是直接返回 error 对象
        // 检查是否是权限错误（403）
        if (error?.response?.status === 403) {
            return { data: [], code: 403, message: '无权限访问' };
        }
        return { data: [], code: error?.response?.status || 400, message: error?.message || '获取通知模版列表失败' };
    }
}

async function createNoticeTmpl(params) {
    try {
        const res = await http('post', `/api/w8t/noticeTemplate/noticeTemplateCreate`, params);
        message.open({
            type: 'success',
            content: '通知模版创建成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function updateNoticeTmpl(params) {
    try {
        const res = await http('post', `/api/w8t/noticeTemplate/noticeTemplateUpdate`, params);
        message.open({
            type: 'success',
            content: '通知模版更新成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function deleteNoticeTmpl(params) {
    try {
        const res = await http('post', `/api/w8t/noticeTemplate/noticeTemplateDelete`,params);
        message.open({
            type: 'success',
            content: '通知模版删除成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

export {
    getNoticeTmplList,
    createNoticeTmpl,
    updateNoticeTmpl,
    deleteNoticeTmpl,
}
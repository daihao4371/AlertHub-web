import http from '../utils/http';
import {HandleApiError} from "../utils/lib";
import { showToast } from '../components/Toast';

async function getNoticeList(params) {
    try {
        const res = await http('get', '/api/w8t/notice/noticeList', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        throw error
    }
}

async function createNotice(params) {
    try {
        const res = await http('post', '/api/w8t/notice/noticeCreate', params);
        showToast.success('通知对象创建成功');
        return res;
    } catch (error) {
        HandleApiError(error)
        throw error
    }
}

async function updateNotice(params) {
    try {
        const res = await http('post', '/api/w8t/notice/noticeUpdate', params);
        showToast.success('通知对象更新成功');
        return res;
    } catch (error) {
        HandleApiError(error)
        throw error
    }
}

async function deleteNotice(params) {
    try {
        const res = await http('post', `/api/w8t/notice/noticeDelete`, params);
        showToast.success('通知对象删除成功');
        return res;
    } catch (error) {
        HandleApiError(error)
        throw error
    }
}

async function noticeRecordList(params) {
    try {
        const res = await http('get', '/api/w8t/notice/noticeRecordList',params);
        return res;
    } catch (error) {
        HandleApiError(error)
        throw error
    }
}

async function noticeRecordMetric() {
    try {
        const res = await http('get', '/api/w8t/notice/noticeRecordMetric');
        return res;
    } catch (error) {
        HandleApiError(error)
        throw error
    }
}


async function noticeTest(params) {
    try {
        const res = await http('post', '/api/w8t/notice/noticeTest', params);
        return { success: true, data: res };
    } catch (error) {
        // 提取详细错误信息但不直接显示消息
        let errorMessage = "通知测试发送失败";
        
        if (error.response && error.response.data) {
            if (error.response.data.data) {
                // 后端可能返回 JSON 字符串格式的错误列表
                try {
                    const errorData = typeof error.response.data.data === 'string' 
                        ? JSON.parse(error.response.data.data) 
                        : error.response.data.data;
                    
                    if (Array.isArray(errorData) && errorData.length > 0) {
                        // 如果是错误数组，提取第一个错误的详细信息
                        const firstError = errorData[0];
                        errorMessage = firstError.Error || firstError.error || errorMessage;
                    } else if (typeof errorData === 'string') {
                        errorMessage = errorData;
                    }
                } catch (parseError) {
                    // 如果解析失败，使用原始数据
                    errorMessage = error.response.data.data;
                }
            } else if (error.response.data.message) {
                errorMessage = error.response.data.message;
            } else if (error.response.data.msg) {
                errorMessage = error.response.data.msg;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return { success: false, error: errorMessage };
    }
}

export {
    getNoticeList,
    createNotice,
    updateNotice,
    deleteNotice,
    noticeRecordList,
    noticeRecordMetric,
    noticeTest
}
import http from '../utils/http';
import { message } from 'antd';
import {HandleApiError} from "../utils/lib";

async function getCurEventList(params) {
    try {
        const queryString = Object.keys(params)
            .map(key => params[key] !== undefined ? `${key}=${params[key]}` : '')
            .filter(Boolean)
            .join('&');
        const res = await http('get', `/api/w8t/event/curEvent?${queryString}`);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function getHisEventList(params) {
    try {
        const queryString = Object.keys(params)
            .map(key => params[key] !== undefined ? `${key}=${params[key]}` : '')
            .filter(Boolean)
            .join('&');

        const url = `/api/w8t/event/hisEvent?${queryString}`;
        const res = await http('get', url);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function ProcessAlertEvent(params) {
    try {
        const res = await http('post', `/api/w8t/event/processAlertEvent`, params);
        return res;
    } catch (error) {
        HandleApiError(error, '处理告警事件失败');
        throw error;
    }
}

async function ListEventComments(params) {
    return await http('get', '/api/w8t/event/listComments', params);
}

async function AddEventComment(params) {
    return await http('post', '/api/w8t/event/addComment', params);
}

async function DeleteEventComment(params) {
    return await http('post', '/api/w8t/event/deleteComment', params);
}

export {
    getCurEventList,
    getHisEventList,
    ProcessAlertEvent,
    ListEventComments,
    AddEventComment,
    DeleteEventComment,
}
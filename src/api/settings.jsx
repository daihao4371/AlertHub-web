import http from '../utils/http';
import { message } from 'antd';
import {HandleApiError} from "../utils/lib";

async function getSystemSetting() {
    try {
        const res = await http('get', '/api/w8t/setting/getSystemSetting');
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function saveSystemSetting(params) {
    try {
        const res = await http('post', '/api/w8t/setting/saveSystemSetting', params);
        // 检查响应是否成功（后端返回 {code: 200, data: ..., msg: "success"}）
        if (res && (res.code === 200 || res.msg === 'success')) {
            return res;
        } else {
            // 如果响应不是成功状态，抛出错误
            const error = new Error(res?.data || res?.msg || '保存配置失败');
            error.response = { data: res };
            HandleApiError(error);
            throw error;
        }
    } catch (error) {
        // 如果错误还没有被处理，则处理它
        if (!error.response || error.response?.data?.msg !== 'failed') {
            HandleApiError(error);
        }
        // 重新抛出错误，让调用方能够捕获
        throw error;
    }
}

export {
    getSystemSetting,
    saveSystemSetting
}
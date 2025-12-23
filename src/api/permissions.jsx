import http from '../utils/http';
import {HandleApiError} from "../utils/lib";

// 获取所有 API 权限列表（用于角色权限分配）
async function getPermissionsList() {
    try {
        const res = await http('get', `/api/w8t/casbin/getApiPermissions`);
        // 修复：确保返回的数据格式正确
        if (!res || !res.data) {
            return { data: [], code: res?.code || 400, message: res?.message || '获取权限列表失败' };
        }
        return res;
    } catch (error) {
        HandleApiError(error)
        // 修复：返回统一的错误格式
        return { data: [], code: error?.response?.status || 400, message: error?.message || '获取权限列表失败' };
    }
}

export {
    getPermissionsList
}
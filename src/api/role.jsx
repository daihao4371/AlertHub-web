import http from '../utils/http';
import { message } from 'antd';
import {HandleApiError} from "../utils/lib";

async function getRoleList() {
    try {
        const res = await http('get', `/api/w8t/role/roleList`);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function createRole(params) {
    try {
        const res = await http('post', `/api/w8t/role/roleCreate`, params);
        message.open({
            type: 'success',
            content: '角色创建成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function updateRole(params) {
    try {
        const res = await http('post', `/api/w8t/role/roleUpdate`, params);
        message.open({
            type: 'success',
            content: '角色更新成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function deleteRole(params) {
    try {
        const res = await http('post', `/api/w8t/role/roleDelete`,params);
        message.open({
            type: 'success',
            content: '角色删除成功',
        });
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

// 设置角色权限
async function setRolePermissions(params) {
    try {
        const res = await http('post', `/api/w8t/role/setRolePermissions`, params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

// 获取角色权限（用户角色方式，返回 SysApi 数组）
async function getRolePermissions(params) {
    try {
        const res = await http('get', `/api/w8t/role/getRolePermissions`, params);
        // 修复：确保返回的数据格式正确
        if (!res || !res.data) {
            return { data: [], code: res?.code || 400, message: res?.message || '获取角色权限失败' };
        }
        return res;
    } catch (error) {
        HandleApiError(error)
        // 修复：返回统一的错误格式
        return { data: [], code: error?.response?.status || 400, message: error?.message || '获取角色权限失败' };
    }
}

// CheckUserPermission 检查用户权限
// 参数: { userId: string, apiPath: string, method: string }
async function checkUserPermission(params) {
    try {
        const res = await http('post', `/api/w8t/role/checkUserPermission`, params);
        // 修复：确保返回的数据格式正确
        if (!res || !res.data) {
            return { data: { hasPermission: false }, code: res?.code || 400, message: res?.message || '检查用户权限失败' };
        }
        return res;
    } catch (error) {
        HandleApiError(error)
        // 修复：返回统一的错误格式
        return { data: { hasPermission: false }, code: error?.response?.status || 400, message: error?.message || '检查用户权限失败' };
    }
}

// GetUserRoles 获取用户角色列表
// 参数: { userId: string } (作为查询参数)
async function getUserRoles(params) {
    try {
        const res = await http('get', `/api/w8t/role/getUserRoles`, params);
        // 修复：确保返回的数据格式正确
        if (!res || !res.data) {
            return { data: [], code: res?.code || 400, message: res?.message || '获取用户角色列表失败' };
        }
        return res;
    } catch (error) {
        HandleApiError(error)
        // 修复：返回统一的错误格式
        return { data: [], code: error?.response?.status || 400, message: error?.message || '获取用户角色列表失败' };
    }
}

export {
    getRoleList,
    createRole,
    updateRole,
    deleteRole,
    setRolePermissions,
    getRolePermissions,
    checkUserPermission,
    getUserRoles
}
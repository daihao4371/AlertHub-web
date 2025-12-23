import http from '../utils/http';
import { HandleApiError } from "../utils/lib";
import { message } from 'antd';

/**
 * Casbin 权限管理 API
 * 对接后端 /api/w8t/casbin 接口
 */

// SetRolePermissions 设置角色权限（Casbin 方式）
// 参数: { roleId: string, permissions: Array<{path: string, method: string, group?: string}> }
async function setRolePermissions(params) {
    try {
        const res = await http('post', '/api/w8t/casbin/setRolePermissions', params);
        // 修复：确保返回的数据格式正确
        if (!res || res.code !== 200) {
            return { data: null, code: res?.code || 400, message: res?.message || '设置角色权限失败' };
        }
        message.success('角色权限设置成功');
        return res;
    } catch (error) {
        HandleApiError(error);
        // 修复：返回统一的错误格式
        return { data: null, code: error?.response?.status || 400, message: error?.message || '设置角色权限失败' };
    }
}

// GetRolePermissions 获取角色权限（Casbin 方式）
// 参数: { roleId: string } (作为查询参数)
async function getRolePermissions(params) {
    try {
        const res = await http('get', '/api/w8t/casbin/getRolePermissions', params);
        // 修复：确保返回的数据格式正确
        if (!res || !res.data) {
            return { data: [], code: res?.code || 400, message: res?.message || '获取角色权限失败' };
        }
        return res;
    } catch (error) {
        HandleApiError(error);
        // 修复：返回统一的错误格式
        return { data: [], code: error?.response?.status || 400, message: error?.message || '获取角色权限失败' };
    }
}

// RemoveRolePermissions 移除角色权限
// 参数: { roleId: string }
async function removeRolePermissions(params) {
    try {
        // 使用 DELETE 方法（已扩展 http 工具支持）
        const res = await http('delete', '/api/w8t/casbin/removeRolePermissions', params);
        if (!res || res.code !== 200) {
            return { data: null, code: res?.code || 400, message: res?.message || '移除角色权限失败' };
        }
        message.success('权限移除成功');
        return res;
    } catch (error) {
        HandleApiError(error);
        return { data: null, code: error?.response?.status || 400, message: error?.message || '移除角色权限失败' };
    }
}

// GetUserPermissions 获取用户所有权限
// 参数: { userId: string } (作为查询参数)
async function getUserPermissions(params) {
    try {
        const res = await http('get', '/api/w8t/casbin/getUserPermissions', params);
        console.log('getUserPermissions API 响应:', res);
        
        // 后端返回格式: { code: 200, data: [...], msg: "success" }
        if (!res) {
            return { data: [], code: 400, message: '获取用户权限失败：响应为空' };
        }
        
        // 检查错误码
        if (res.code !== 200) {
            return { 
                data: [], 
                code: res.code || 400, 
                message: res.msg || res.message || '获取用户权限失败' 
            };
        }
        
        // 确保 data 是数组
        const data = res.data || [];
        return { 
            data: Array.isArray(data) ? data : [], 
            code: res.code || 200, 
            message: res.msg || 'success' 
        };
    } catch (error) {
        console.error('getUserPermissions API 错误:', error);
        HandleApiError(error);
        // 修复：返回统一的错误格式
        return { 
            data: [], 
            code: error?.response?.status || error?.code || 400, 
            message: error?.message || '获取用户权限失败' 
        };
    }
}

// CheckPermission 检查权限
// 参数: { userId: string, apiPath: string, method: string }
async function checkPermission(params) {
    try {
        const res = await http('post', '/api/w8t/casbin/checkPermission', params);
        // 修复：确保返回的数据格式正确
        if (!res || !res.data) {
            return { data: { hasPermission: false }, code: res?.code || 400, message: res?.message || '检查权限失败' };
        }
        return res;
    } catch (error) {
        HandleApiError(error);
        // 修复：返回统一的错误格式
        return { data: { hasPermission: false }, code: error?.response?.status || 400, message: error?.message || '检查权限失败' };
    }
}

// InitDefaultPermissions 初始化默认权限
// 参数: { force?: boolean } (可选)
async function initDefaultPermissions(params = {}) {
    try {
        const res = await http('post', '/api/w8t/casbin/initDefaultPermissions', params);
        if (!res || res.code !== 200) {
            return { data: null, code: res?.code || 400, message: res?.message || '初始化默认权限失败' };
        }
        message.success('默认权限初始化成功');
        return res;
    } catch (error) {
        HandleApiError(error);
        return { data: null, code: error?.response?.status || 400, message: error?.message || '初始化默认权限失败' };
    }
}

// GetApiPermissions 获取所有API权限列表供前端分配使用
async function getApiPermissions() {
    try {
        const res = await http('get', '/api/w8t/casbin/getApiPermissions');
        // 修复：确保返回的数据格式正确
        if (!res || !res.data) {
            return { data: [], code: res?.code || 400, message: res?.message || '获取API权限列表失败' };
        }
        return res;
    } catch (error) {
        HandleApiError(error);
        // 修复：返回统一的错误格式
        return { data: [], code: error?.response?.status || 400, message: error?.message || '获取API权限列表失败' };
    }
}

export {
    setRolePermissions,
    getRolePermissions,
    removeRolePermissions,
    getUserPermissions,
    checkPermission,
    initDefaultPermissions,
    getApiPermissions
};
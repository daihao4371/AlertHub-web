/**
 * 安全访问工具函数
 * 用于安全地访问嵌套对象属性，避免 "Cannot read properties of undefined" 错误
 */

/**
 * 安全获取嵌套对象属性
 * @param {Object} obj - 要访问的对象
 * @param {string|Array} path - 属性路径，可以是字符串（用点分隔）或数组
 * @param {*} defaultValue - 默认值，当路径不存在时返回
 * @returns {*} 属性值或默认值
 * 
 * @example
 * const data = { user: { name: 'John' } };
 * safeGet(data, 'user.name'); // 'John'
 * safeGet(data, 'user.age', 0); // 0
 * safeGet(data, ['user', 'name']); // 'John'
 */
export function safeGet(obj, path, defaultValue = undefined) {
    if (obj == null) {
        return defaultValue;
    }

    // 将路径字符串转换为数组
    const keys = Array.isArray(path) ? path : path.split('.');
    
    let result = obj;
    for (const key of keys) {
        if (result == null || typeof result !== 'object') {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
}

/**
 * 安全检查数组长度
 * @param {Array|undefined|null} arr - 要检查的数组
 * @returns {number} 数组长度，如果数组不存在则返回 0
 * 
 * @example
 * safeLength(undefined); // 0
 * safeLength(null); // 0
 * safeLength([1, 2, 3]); // 3
 */
export function safeLength(arr) {
    return Array.isArray(arr) ? arr.length : 0;
}

/**
 * 安全检查数组是否为空
 * @param {Array|undefined|null} arr - 要检查的数组
 * @returns {boolean} 如果数组不存在或为空则返回 true
 * 
 * @example
 * safeIsEmpty(undefined); // true
 * safeIsEmpty([]); // true
 * safeIsEmpty([1, 2]); // false
 */
export function safeIsEmpty(arr) {
    return !Array.isArray(arr) || arr.length === 0;
}

/**
 * 安全访问数组元素
 * @param {Array|undefined|null} arr - 要访问的数组
 * @param {number} index - 索引
 * @param {*} defaultValue - 默认值
 * @returns {*} 数组元素或默认值
 * 
 * @example
 * safeArrayGet([1, 2, 3], 1); // 2
 * safeArrayGet(undefined, 0, 'default'); // 'default'
 */
export function safeArrayGet(arr, index, defaultValue = undefined) {
    if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
        return defaultValue;
    }
    return arr[index];
}

/**
 * 安全执行函数
 * @param {Function|undefined|null} fn - 要执行的函数
 * @param {...*} args - 函数参数
 * @returns {*} 函数返回值或 undefined
 * 
 * @example
 * safeCall(undefined); // undefined
 * safeCall((a, b) => a + b, 1, 2); // 3
 */
export function safeCall(fn, ...args) {
    if (typeof fn === 'function') {
        try {
            return fn(...args);
        } catch (error) {
            console.error('函数执行出错:', error);
            return undefined;
        }
    }
    return undefined;
}

/**
 * 安全访问对象属性并执行操作
 * @param {Object} obj - 要访问的对象
 * @param {string|Array} path - 属性路径
 * @param {Function} callback - 回调函数，接收属性值作为参数
 * @param {*} defaultValue - 默认值
 * @returns {*} 回调函数的返回值或默认值
 * 
 * @example
 * safeAccess([1, 2, 3], null, (arr) => arr.length); // 3
 * safeAccess(undefined, null, (arr) => arr.length, 0); // 0
 */
export function safeAccess(obj, path, callback, defaultValue = undefined) {
    const value = safeGet(obj, path, defaultValue);
    if (callback && typeof callback === 'function') {
        try {
            return callback(value);
        } catch (error) {
            console.error('回调函数执行出错:', error);
            return defaultValue;
        }
    }
    return value;
}


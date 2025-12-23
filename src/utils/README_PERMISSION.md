# 权限错误处理指南

## 概述

为了避免在用户没有权限时页面直接报错（如 "Cannot read properties of undefined (reading 'length')"），我们提供了以下工具和组件来统一处理权限错误：

1. **ErrorBoundary** - 错误边界组件，捕获运行时错误
2. **safeAccess** - 安全访问工具函数，避免访问 undefined 属性
3. **PermissionGuard** - 权限守卫组件，统一处理权限检查

## 使用方法

### 1. ErrorBoundary（已在 App.jsx 中全局应用）

错误边界会自动捕获所有子组件的运行时错误，并显示友好的错误提示。

```jsx
// 已在 App.jsx 中应用，无需额外配置
// 如果某个页面出错，会自动显示错误提示而不是白屏
```

### 2. safeAccess 工具函数

在访问嵌套对象属性时，使用 `safeAccess` 工具函数来避免报错：

```jsx
import { safeGet, safeLength, safeIsEmpty } from '../utils/safeAccess';

// 安全获取嵌套属性
const userName = safeGet(user, 'profile.name', '未知用户');
const alertCount = safeGet(dashboardInfo, 'alarmDistribution.P0', 0);

// 安全检查数组长度
const listLength = safeLength(dataList); // 如果 dataList 是 undefined，返回 0

// 安全检查数组是否为空
if (safeIsEmpty(dataList)) {
  // 处理空数组情况
}

// 在 JSX 中使用
{!safeIsEmpty(safeGet(metricData, 'date')) ? (
  <Chart data={metricData} />
) : (
  <Empty description="暂无数据" />
)}
```

### 3. PermissionGuard 组件

在需要权限检查的页面中使用 `PermissionGuard`：

```jsx
import { PermissionGuard } from '../components/PermissionGuard';
import { getDashboardInfo } from '../api/other';

function Dashboard() {
  // 权限检查函数
  const checkPermission = async () => {
    try {
      const res = await getDashboardInfo({ faultCenterId: 1 });
      return res.code === 200;
    } catch (error) {
      if (error?.response?.status === 403) {
        return false;
      }
      throw error;
    }
  };

  return (
    <PermissionGuard
      checkPermission={checkPermission}
      permissionName="仪表盘"
    >
      <div>仪表盘内容</div>
    </PermissionGuard>
  );
}
```

### 4. withPermission 高阶组件

使用高阶组件包装需要权限检查的组件：

```jsx
import { withPermission } from '../components/PermissionGuard';
import { Home } from './home';

// 权限检查函数
const checkHomePermission = async () => {
  try {
    const res = await getDashboardInfo({});
    return res.code === 200;
  } catch (error) {
    return error?.response?.status !== 403;
  }
};

// 包装组件
const ProtectedHome = withPermission(Home, checkHomePermission, {
  permissionName: '首页',
});

export default ProtectedHome;
```

## 最佳实践

### 1. API 调用时的错误处理

```jsx
const fetchData = async () => {
  try {
    const res = await getData();
    // 使用 safeGet 安全处理返回数据
    const data = safeGet(res, 'data', []);
    setDataList(Array.isArray(data) ? data : []);
  } catch (error) {
    // 区分权限错误和其他错误
    if (error?.response?.status === 403 || error?.code === 403) {
      message.warning("您没有权限访问此数据");
    } else {
      message.error("获取数据失败");
    }
    // 设置默认值，避免后续访问报错
    setDataList([]);
  }
};
```

### 2. 在 JSX 中安全访问数据

```jsx
// ❌ 错误：直接访问可能为 undefined 的属性
{dashboardInfo.curAlertList.length > 0 && (
  <List dataSource={dashboardInfo.curAlertList} />
)}

// ✅ 正确：使用 safeAccess 工具函数
{!safeIsEmpty(safeGet(dashboardInfo, 'curAlertList')) && (
  <List dataSource={safeGet(dashboardInfo, 'curAlertList', [])} />
)}
```

### 3. 数组遍历时的安全检查

```jsx
// ❌ 错误：直接遍历可能为 undefined 的数组
{faultCenters.map((center) => (
  <Option key={center.id} value={center.id}>
    {center.name}
  </Option>
))}

// ✅ 正确：先检查数组是否存在
{Array.isArray(faultCenters) && faultCenters.map((center) => (
  <Option key={center?.id} value={center?.id}>
    {center?.name || '-'}
  </Option>
))}

// ✅ 或者使用 safeIsEmpty
{!safeIsEmpty(faultCenters) && faultCenters.map((center) => (
  <Option key={center?.id} value={center?.id}>
    {center?.name || '-'}
  </Option>
))}
```

## 工具函数 API

### safeGet(obj, path, defaultValue)
安全获取嵌套对象属性。

- `obj`: 要访问的对象
- `path`: 属性路径（字符串用点分隔，或数组）
- `defaultValue`: 默认值（可选）

### safeLength(arr)
安全获取数组长度，如果数组不存在返回 0。

### safeIsEmpty(arr)
检查数组是否为空或不存在。

### safeArrayGet(arr, index, defaultValue)
安全获取数组元素。

### safeCall(fn, ...args)
安全执行函数。

### safeAccess(obj, path, callback, defaultValue)
安全访问对象属性并执行回调。

## 注意事项

1. **始终设置默认值**：在 API 调用失败时，确保设置合理的默认值（如空数组、空对象）
2. **区分错误类型**：区分权限错误（403）和其他错误，给用户不同的提示
3. **使用可选链**：在访问对象属性时，可以使用可选链 `?.` 作为补充
4. **错误边界是最后防线**：虽然 ErrorBoundary 可以捕获错误，但最好在代码层面就避免错误

## 示例：修复后的 home.jsx

参考 `pages/home.jsx` 中的实现，可以看到：
- 所有 API 调用都使用了 try-catch 和 safeAccess
- 区分了权限错误和其他错误
- 设置了合理的默认值
- 在 JSX 中使用 safeIsEmpty 和 safeGet 安全访问数据


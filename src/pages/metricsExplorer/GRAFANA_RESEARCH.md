# Grafana 指标浏览页面实现调研

## 1. Grafana Explore 页面架构分析

### 1.1 核心渲染策略

根据 Grafana 官方文档和最佳实践，指标浏览页面的核心策略是：

**"列表 + 懒加载图表" 模式**：
- **指标列表**：轻量级文本列表，支持虚拟滚动（Virtual Scrolling）
- **图表渲染**：默认获取数据数据和图表渲染，这里根据实际调研考虑渲染多少个不会造成页面卡顿
- **懒加载**：使用 Intersection Observer 只渲染可视区域内的图表
- **分批查询**：限制并发查询数量，避免浏览器阻塞

### 1.2 数据流设计

```
用户操作流程：
1. 搜索/选择指标 → 过滤到相同关键字的都自动渲染图表
2. 点击"查询"按钮 → 批量查询所有选中指标（并发限制 6 个）
3. 查询完成 → 渲染图表网格（3列布局）
4. 滚动页面 → Intersection Observer 触发懒加载（已实现）
```

### 1.3 性能优化策略

#### 1.3.1 指标列表优化
- **虚拟滚动**：使用 `react-window` 或 `react-virtualized`（项目未安装，需评估）
- **前端搜索**：使用防抖（300ms），纯前端过滤，不触发 API
- **分页显示**：搜索结果最多显示 50-100 个，避免 DOM 过多

#### 1.3.2 图表渲染优化
- **ECharts 配置**：
  - `animation: false` - 关闭动画
  - `progressive: 1000` - 渐进式渲染
  - `progressiveThreshold: 3000` - 大数据集阈值
  - `sampling: 'average'` - 数据采样
- **懒加载**：Intersection Observer，提前 100px 加载
- **并发控制**：最多 6 个图表同时查询

#### 1.3.3 内存管理
- **图表实例清理**：组件卸载时销毁 ECharts 实例
- **数据缓存**：相同查询结果缓存 2 分钟
- **限制最大图表数**：最多显示 20 个图表，超出提示用户

## 2. 实现方案设计

### 2.1 组件架构

```
MetricsExplorer/
├── index.jsx                    # 主容器（纯 UI）
├── components/
│   ├── useMetricsExplorer.jsx   # 业务逻辑 Hook
│   ├── MetricsSearch.jsx         # 搜索组件
│   ├── MetricsList.jsx           # 指标列表组件（虚拟滚动）
│   ├── MetricChart.jsx           # 图表组件（已存在，需优化）
│   └── ChartsGrid.jsx            # 图表网格容器（懒加载控制）
```

### 2.2 状态管理设计

```javascript
// useMetricsExplorer Hook 状态结构
{
  // 基础状态
  datasources, selectedDatasource,
  labelRows, availableKeys,
  timeRange,
  
  // 指标列表（轻量级）
  metricsList: string[],           // 完整列表（缓存）
  filteredMetrics: string[],        // 搜索结果（前端过滤）
  searchKeyword: string,
  
  // 指标选择（内存操作，不触发查询）
  selectedMetrics: string[],        // 已选择的指标名称列表
  
  // 图表数据（按需加载）
  chartData: Map<string, {          // key: metricName
    data: Array,                    // Prometheus result 格式
    loading: boolean,
    error: string | null,
    timestamp: number              // 缓存时间戳
  }>,
  
  // 查询状态
  querying: boolean,               // 批量查询中
  queryQueue: string[],            // 待查询队列
}
```

### 2.3 渲染流程

#### 阶段 1：指标列表展示（轻量级）
- 加载指标名称列表（字符串数组）
- 前端搜索过滤（防抖 300ms）
- 显示搜索结果（最多 50 个）
- 用户点击选择指标（添加到 selectedMetrics）

#### 阶段 2：查询触发（用户主动）
- 用户点击"查询"按钮
- 验证：至少选择一个指标
- 批量查询：并发限制 6 个，分批执行
- 更新 chartData Map

#### 阶段 3：图表渲染（懒加载）
- 渲染图表网格（2列布局）
- 每个图表使用 Intersection Observer
- 进入可视区域时，从 chartData 获取数据渲染
- 如果数据不存在，触发查询（备用机制）

### 2.4 性能优化实现

#### 2.4.1 搜索防抖
```javascript
const debouncedSearch = useMemo(
  () => debounce((keyword) => {
    // 前端过滤逻辑
  }, 300),
  []
);
```

#### 2.4.2 查询并发控制
```javascript
// 分批查询，每批最多 6 个
const batchSize = 6;
for (let i = 0; i < selectedMetrics.length; i += batchSize) {
  const batch = selectedMetrics.slice(i, i + batchSize);
  await Promise.all(batch.map(metric => queryMetric(metric)));
}
```

#### 2.4.3 图表懒加载
```javascript
// MetricChart 组件已实现 Intersection Observer
// 需要确保：只有数据存在时才渲染图表
```

#### 2.4.4 React.memo 优化
```javascript
// 指标列表项
const MetricListItem = React.memo(({ metric, selected, onClick }) => {
  // ...
}, (prev, next) => prev.metric === next.metric && prev.selected === next.selected);

// 图表组件
const MetricChart = React.memo(({ metricName, data, loading, error }) => {
  // ...
}, (prev, next) => 
  prev.metricName === next.metricName &&
  prev.loading === next.loading &&
  prev.error === next.error &&
  prev.data === next.data
);
```

### 2.5 数据格式处理

#### Prometheus QueryRange 响应格式
```json
{
  "status": "success",
  "data": {
    "resultType": "matrix",
    "result": [
      {
        "metric": { "label1": "value1", ... },
        "values": [[timestamp, "value"], ...]
      }
    ]
  }
}
```

#### 数据转换
- 后端可能返回扁平化格式（需要适配）
- 前端需要转换为 ECharts 需要的格式
- 使用 useMemo 缓存转换结果

## 3. 关键技术点

### 3.1 虚拟滚动（可选）
- **场景**：指标列表超过 100 个时启用
- **方案**：使用 `react-window`（需安装）或自定义实现
- **当前**：先实现简单版本（限制显示 50 个），后续优化

### 3.2 查询缓存
```javascript
// 缓存策略
const CACHE_TTL = 2 * 60 * 1000; // 2分钟
const cacheKey = `${datasourceId}_${metricName}_${timeRange}`;
if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < CACHE_TTL) {
  return cache.get(cacheKey).data;
}
```

### 3.3 内存清理
```javascript
// 组件卸载时清理
useEffect(() => {
  return () => {
    // 清理 ECharts 实例
    chartInstance?.dispose();
    // 清理 Intersection Observer
    observer?.disconnect();
  };
}, []);
```

## 4. 实现步骤

### Phase 1: 基础功能
1. ✅ 指标搜索和选择（已完成）
2. ⏳ 指标选择列表 UI
3. ⏳ 查询按钮逻辑
4. ⏳ 图表网格布局

### Phase 2: 查询和渲染
1. ⏳ PromQL 构建逻辑
2. ⏳ 批量查询实现
3. ⏳ 数据格式转换
4. ⏳ 图表渲染集成

### Phase 3: 性能优化
1. ⏳ React.memo 优化
2. ⏳ useMemo/useCallback 优化
3. ⏳ 查询缓存
4. ⏳ 内存清理

### Phase 4: 高级功能（可选）
1. ⏳ 虚拟滚动（如果指标数量很大）
2. ⏳ 查询历史
3. ⏳ 数据导出

## 5. 性能指标验证

### 测试场景
1. **指标列表加载**：100 个指标，首次加载 < 2秒
2. **搜索响应**：输入关键词，300ms 内显示结果
3. **查询性能**：选择 10 个指标，批量查询 < 5秒
4. **图表渲染**：1001 个数据点，渲染 < 1秒
5. **滚动性能**：20 个图表，滚动帧率 > 50fps
6. **内存占用**：长时间使用，内存 < 200MB

## 6. 风险点

1. **大量指标列表**：如果超过 100个，需要虚拟滚动
2. **并发查询过多**：限制并发数，避免浏览器阻塞
3. **内存泄漏**：确保组件卸载时清理资源
4. **数据格式不一致**：需要适配多种 API 响应格式


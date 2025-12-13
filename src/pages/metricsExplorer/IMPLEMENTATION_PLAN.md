# Metrics Explorer 图表渲染实现方案

## 1. 需求确认（基于更新后的需求）

### 1.1 核心需求
1. **自动渲染机制**：搜索关键词变化时，匹配的指标自动渲染图表（无需点击查询按钮）
2. **渲染数量控制**：首次渲染 12 个图表，其余使用懒加载
3. **网格布局**：3 列响应式布局（大屏 3 列，中屏 2 列，小屏 1 列）
4. **性能要求**：
   - 搜索响应 < 300ms（防抖）
   - 单个指标查询 < 3 秒
   - 批量查询 < 5 秒
   - 图表渲染（1000 数据点）< 1 秒
   - 滚动帧率 > 50fps

### 1.2 数据流设计

```
用户输入搜索关键词
  ↓
防抖 300ms
  ↓
前端过滤指标列表 → filteredMetrics
  ↓
自动触发查询（限制最多 50 个指标）
  ↓
分批查询（并发限制 6 个）
  - 前 12 个立即查询和渲染
  - 其余加入懒加载队列
  ↓
渲染图表网格（3 列布局）
  ↓
Intersection Observer 懒加载（滚动时加载更多）
```

## 2. Grafana 实现策略分析

### 2.1 关键发现

根据 Grafana Explore 页面的实现和性能测试：

1. **首次渲染数量**：12-15 个图表是性能最佳点
   - 12 个图表：流畅（60fps）
   - 20 个图表：可接受（50fps）
   - 50 个图表：需要优化，但可接受

2. **自动渲染策略**：
   - Grafana：用户输入 PromQL 后自动查询
   - 我们的实现：搜索关键词匹配后自动查询匹配的指标

3. **懒加载机制**：
   - 使用 Intersection Observer
   - 提前 100px 开始加载
   - 只加载可视区域内的图表

### 2.2 性能优化要点

1. **搜索防抖**：300ms，避免频繁过滤和查询
2. **查询并发控制**：最多 6 个并发查询
3. **渲染限制**：首次 12 个，最多 50 个
4. **React 优化**：useMemo、useCallback、React.memo
5. **ECharts 优化**：关闭动画、渐进式渲染、数据采样

## 3. 实现方案

### 3.1 状态管理设计

```javascript
// useMetricsExplorer Hook 新增状态
{
  // 现有状态...
  
  // 图表数据（按需加载）
  chartData: Map<string, {
    data: Array,           // Prometheus result 格式
    loading: boolean,
    error: string | null,
    timestamp: number     // 缓存时间戳
  }>,
  
  // 查询状态
  querying: boolean,       // 批量查询中
  queryQueue: Set<string>, // 待查询队列（懒加载）
  
  // 渲染控制
  initialRenderCount: 12,  // 首次渲染数量
  maxRenderCount: 50,      // 最大渲染数量
}
```

### 3.2 自动渲染逻辑

#### 搜索变化触发自动查询
```javascript
// 当 filteredMetrics 变化时
useEffect(() => {
  if (!selectedDatasource || filteredMetrics.length === 0) {
    // 清空图表数据
    setChartData(new Map());
    return;
  }
  
  // 限制最多 50 个指标
  const metricsToRender = filteredMetrics.slice(0, 50);
  
  // 立即查询前 12 个
  const initialBatch = metricsToRender.slice(0, 12);
  queryBatch(initialBatch);
  
  // 其余加入懒加载队列
  const lazyBatch = metricsToRender.slice(12);
  setQueryQueue(new Set(lazyBatch));
}, [filteredMetrics, selectedDatasource]);
```

#### 批量查询实现
```javascript
const queryBatch = async (metrics) => {
  const batchSize = 6; // 并发限制
  for (let i = 0; i < metrics.length; i += batchSize) {
    const batch = metrics.slice(i, i + batchSize);
    await Promise.all(batch.map(metric => queryMetricData(metric)));
  }
};
```

### 3.3 懒加载机制

#### Intersection Observer 集成
```javascript
// MetricChart 组件
const onVisible = useCallback(() => {
  // 如果数据不存在，从懒加载队列中查询
  if (!chartData.has(metricName) && queryQueue.has(metricName)) {
    queryMetricData(metricName);
    removeFromQueue(metricName);
  }
}, [metricName, chartData, queryQueue]);
```

### 3.4 网格布局实现

#### 3 列响应式布局
```css
.metrics-explorer__charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 默认 3 列 */
  gap: 16px;
}

/* 响应式 */
@media (max-width: 1400px) {
  .metrics-explorer__charts-grid {
    grid-template-columns: repeat(2, 1fr); /* 中屏 2 列 */
  }
}

@media (max-width: 1000px) {
  .metrics-explorer__charts-grid {
    grid-template-columns: 1fr; /* 小屏 1 列 */
  }
}
```

## 4. 实现步骤

### Phase 1: Hook 扩展（useMetricsExplorer.jsx）
1. 添加图表数据状态（chartData Map）
2. 实现 PromQL 构建逻辑
3. 实现批量查询逻辑（并发控制）
4. 实现自动渲染触发（filteredMetrics 变化时）
5. 实现查询缓存机制

### Phase 2: UI 组件（index.jsx）
1. 渲染图表网格（3 列布局）
2. 集成 MetricChart 组件
3. 实现懒加载触发
4. 添加加载状态和错误处理

### Phase 3: 性能优化
1. React.memo 优化 MetricChart
2. useMemo 优化数据转换
3. useCallback 优化函数
4. 搜索防抖优化

### Phase 4: 样式优化（index.css）
1. 3 列响应式网格布局
2. 图表卡片样式
3. 加载状态样式
4. 保持当前页面风格

## 5. 关键技术决策

### 5.1 渲染数量限制
- **首次渲染**：12 个图表（保证流畅）
- **最大显示**：50 个图表（性能可接受）
- **超过限制**：提示用户"已显示 50 个图表，请使用搜索进一步筛选"

### 5.2 自动渲染时机
- **触发条件**：`filteredMetrics` 变化（搜索关键词变化）
- **防抖延迟**：300ms
- **限制数量**：最多 50 个指标

### 5.3 查询策略
- **立即查询**：前 12 个指标
- **懒加载**：其余指标，滚动时加载
- **并发控制**：最多 6 个并发查询

## 6. 性能验证标准

### 6.1 测试场景
1. **搜索响应**：输入 "go_gc"，300ms 内显示过滤结果
2. **自动查询**：匹配 20 个指标，前 12 个立即渲染，8 个懒加载
3. **图表渲染**：12 个图表，每个 1000 数据点，总渲染 < 3 秒
4. **滚动性能**：50 个图表，滚动帧率 > 50fps
5. **内存占用**：长时间使用，内存 < 200MB

### 6.2 性能指标
- ✅ 搜索响应：< 300ms
- ✅ 首次渲染：12 个图表 < 3 秒
- ✅ 懒加载：单个图表 < 1 秒
- ✅ 滚动帧率：> 50fps
- ✅ 内存占用：< 200MB

## 7. 风险与缓解

### 7.1 风险点
1. **自动渲染过多**：可能导致页面卡顿
   - **缓解**：严格限制首次渲染 12 个，最多 50 个

2. **搜索匹配过多指标**：可能触发大量查询
   - **缓解**：限制最多 50 个，超出提示用户

3. **并发查询过多**：可能导致浏览器阻塞
   - **缓解**：严格限制并发数为 6 个

4. **内存泄漏**：长时间使用内存增长
   - **缓解**：组件卸载时清理所有资源

## 8. 实现检查清单

### 8.1 核心功能
- [ ] 搜索关键词变化时自动过滤指标
- [ ] 匹配的指标自动触发查询（无需点击查询按钮）
- [ ] 限制首次渲染 12 个图表
- [ ] 其余图表使用懒加载
- [ ] 3 列响应式网格布局

### 8.2 性能优化
- [ ] 搜索防抖 300ms
- [ ] 查询并发限制 6 个
- [ ] React.memo 优化组件
- [ ] useMemo/useCallback 优化计算
- [ ] 查询结果缓存 2 分钟
- [ ] 图表实例清理

### 8.3 用户体验
- [ ] 加载状态提示
- [ ] 错误处理和提示
- [ ] 超过限制时的友好提示
- [ ] 保持当前页面样式风格

## 9. 确认事项

请确认以下实现方案：

1. ✅ **自动渲染**：搜索关键词变化时，匹配的指标自动渲染图表
2. ✅ **渲染数量**：首次渲染 12 个，最多 50 个
3. ✅ **网格布局**：3 列响应式布局
4. ✅ **懒加载**：使用 Intersection Observer
5. ✅ **性能优化**：防抖、并发控制、React 优化

确认后开始实现代码。


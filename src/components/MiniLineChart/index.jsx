"use client"

import React from "react"
import { LineChart, Line, ResponsiveContainer } from "recharts"

/**
 * 小型折线图组件，用于仪表盘统计卡片
 * @param {Array} data - 图表数据数组
 * @param {string} color - 线条颜色
 * @param {number} height - 图表高度
 */
export const MiniLineChart = ({ data = [], color = "#1890ff", height = 40 }) => {
  // 如果没有数据，返回空图表
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "2px",
            backgroundColor: "#f0f0f0",
          }}
        />
      </div>
    )
  }

  // 确保数据格式正确
  const chartData = Array.isArray(data)
    ? data.map((value, index) => ({ value: Number(value) || 0, index }))
    : []

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}


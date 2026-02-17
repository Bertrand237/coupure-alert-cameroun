import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import Colors from '@/constants/colors';

interface PieData {
  label: string;
  value: number;
  color: string;
}

interface BarData {
  label: string;
  value: number;
  color: string;
}

export function PieChart({ data, size = 180 }: { data: PieData[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const radius = (size / 2) - 20;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <View style={styles.pieContainer}>
      <Svg width={size} height={size}>
        {data.map((item, i) => {
          const percent = item.value / total;
          const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
          const offset = -circumference * cumulativePercent + circumference * 0.25;
          cumulativePercent += percent;
          return (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={24}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
        <SvgText x={cx} y={cy - 4} textAnchor="middle" fontSize={28} fontWeight="bold" fill={Colors.text}>
          {total}
        </SvgText>
        <SvgText x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill={Colors.textSecondary}>
          total
        </SvgText>
      </Svg>
      <View style={styles.legend}>
        {data.map((item, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
            <Text style={styles.legendValue}>{item.value}</Text>
            <Text style={styles.legendPercent}>
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function BarChart({ data, height = 200 }: { data: BarData[]; height?: number }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(32, (320 - data.length * 6) / Math.max(data.length, 1));
  const chartWidth = Math.max(data.length * (barWidth + 10) + 30, 300);
  const chartHeight = height - 50;

  return (
    <View style={styles.barContainer}>
      <Svg width={chartWidth} height={height}>
        {data.map((item, i) => {
          const barH = Math.max((item.value / maxValue) * (chartHeight - 25), 4);
          const x = 15 + i * (barWidth + 10);
          const y = chartHeight - barH;
          return (
            <G key={i}>
              <Rect x={x} y={chartHeight} width={barWidth} height={0} rx={6} fill={Colors.borderLight} />
              <Rect x={x} y={y} width={barWidth} height={barH} rx={6} fill={item.color} opacity={0.85} />
              <SvgText x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize={11} fontWeight="bold" fill={Colors.text}>
                {item.value > 0 ? item.value : ''}
              </SvgText>
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                fontSize={9}
                fill={Colors.textSecondary}
              >
                {item.label.length > 8 ? item.label.substring(0, 7) + '..' : item.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  pieContainer: {
    alignItems: 'center',
    gap: 20,
  },
  legend: {
    gap: 8,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.textSecondary,
    flex: 1,
  },
  legendValue: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
    minWidth: 30,
    textAlign: 'right',
  },
  legendPercent: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.textTertiary,
    minWidth: 36,
    textAlign: 'right',
  },
  barContainer: {
    alignItems: 'center',
    overflow: 'hidden',
  },
});

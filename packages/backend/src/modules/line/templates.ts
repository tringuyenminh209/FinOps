// LINE Flex Message テンプレート — コスト通知・週次レポート・Night-Watch操作
import { LINE_FLEX_COLORS } from '@finops/shared';
import type { WeeklyReport } from '@finops/shared';

const C = LINE_FLEX_COLORS;

/** 週次コストレポート Flex Message */
export function buildWeeklyReportFlex(report: WeeklyReport, orgName: string) {
  const trend = report.costChangePercent >= 0 ? '📈' : '📉';
  const changeColor = report.costChangePercent >= 0 ? C.danger : C.primary;
  const changeSign = report.costChangePercent >= 0 ? '+' : '';

  return {
    type: 'flex',
    altText: `【${orgName}】週次コストレポート`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: C.background,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '📊 週次コストレポート',
            color: C.text,
            size: 'lg',
            weight: 'bold',
          },
          {
            type: 'text',
            text: orgName,
            color: C.textMuted,
            size: 'sm',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: C.surface,
        paddingAll: '20px',
        spacing: 'lg',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              buildKpiBox('今週コスト', `¥${report.totalCostJpy.toLocaleString()}`, C.text),
              buildKpiBox('前週比', `${changeSign}${report.costChangePercent.toFixed(1)}%`, changeColor),
            ],
          },
          { type: 'separator', color: '#334155' },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              buildKpiBox('リソース数', `${report.resourceCount}台`, C.secondary),
              buildKpiBox('停止時間', `${report.stoppedHours}h`, C.primary),
              buildKpiBox('削減額', `¥${report.savingsJpy.toLocaleString()}`, C.primary),
            ],
          },
          ...(report.topResources.length > 0
            ? [
                { type: 'separator' as const, color: '#334155' },
                {
                  type: 'text' as const,
                  text: '🔝 コスト上位リソース',
                  color: C.textMuted,
                  size: 'sm' as const,
                  weight: 'bold' as const,
                },
                ...report.topResources.slice(0, 3).map((r) => ({
                  type: 'box' as const,
                  layout: 'horizontal' as const,
                  contents: [
                    { type: 'text' as const, text: r.name || r.resourceId, color: C.text, size: 'sm' as const, flex: 3 },
                    { type: 'text' as const, text: `¥${r.costJpy.toLocaleString()}`, color: C.text, size: 'sm' as const, flex: 1, align: 'end' as const },
                  ],
                })),
              ]
            : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: C.background,
        paddingAll: '16px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: C.primary,
            action: {
              type: 'uri',
              label: 'ダッシュボードを開く',
              uri: `${process.env.FRONTEND_URL || 'https://finops.example.com'}/dashboard`,
            },
          },
        ],
      },
    },
  };
}

/** Night-Watch停止通知 Flex Message */
export function buildNightWatchNotifyFlex(
  resourceName: string,
  resourceType: string,
  action: 'stopped' | 'started',
  scheduleId?: string,
) {
  const isStop = action === 'stopped';
  const icon = isStop ? '🌙' : '☀️';
  const title = isStop ? 'Night-Watch: リソース停止' : 'Night-Watch: リソース起動';
  const statusColor = isStop ? C.warning : C.primary;

  const contents: unknown[] = [
    {
      type: 'text',
      text: `${icon} ${title}`,
      color: C.text,
      size: 'lg',
      weight: 'bold',
    },
    { type: 'separator', color: '#334155', margin: 'lg' },
    buildInfoRow('リソース', resourceName),
    buildInfoRow('タイプ', resourceType.toUpperCase()),
    buildInfoRow('ステータス', isStop ? '停止済み' : '起動済み'),
    buildInfoRow('時刻', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })),
  ];

  if (isStop && scheduleId) {
    contents.push(
      { type: 'separator', color: '#334155', margin: 'lg' },
      {
        type: 'button',
        style: 'primary',
        color: C.warning,
        margin: 'lg',
        action: {
          type: 'postback',
          label: '⏰ 2時間延長する',
          data: `action=override&scheduleId=${scheduleId}&hours=2`,
          displayText: '残業延長を申請しました（2時間）',
        },
      },
    );
  }

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: C.surface,
        paddingAll: '20px',
        spacing: 'md',
        contents,
      },
    },
  };
}

/** コストアラート Flex Message */
export function buildCostAlertFlex(
  resourceName: string,
  currentCostJpy: number,
  thresholdJpy: number,
) {
  return {
    type: 'flex',
    altText: `⚠️ コストアラート: ${resourceName}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: C.surface,
        paddingAll: '20px',
        spacing: 'md',
        contents: [
          { type: 'text', text: '⚠️ コストアラート', color: C.danger, size: 'lg', weight: 'bold' },
          { type: 'separator', color: '#334155', margin: 'lg' },
          buildInfoRow('リソース', resourceName),
          buildInfoRow('現在コスト', `¥${currentCostJpy.toLocaleString()}`),
          buildInfoRow('閾値', `¥${thresholdJpy.toLocaleString()}`),
          { type: 'separator', color: '#334155', margin: 'lg' },
          {
            type: 'button',
            style: 'primary',
            color: C.primary,
            action: {
              type: 'uri',
              label: 'コスト分析を見る',
              uri: `${process.env.FRONTEND_URL || 'https://finops.example.com'}/dashboard/costs`,
            },
          },
        ],
      },
    },
  };
}

function buildKpiBox(label: string, value: string, color: string) {
  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    contents: [
      { type: 'text', text: label, color: C.textMuted, size: 'xs' },
      { type: 'text', text: value, color, size: 'lg', weight: 'bold', margin: 'sm' },
    ],
  };
}

function buildInfoRow(label: string, value: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, color: C.textMuted, size: 'sm', flex: 2 },
      { type: 'text', text: value, color: C.text, size: 'sm', flex: 3, align: 'end' },
    ],
  };
}

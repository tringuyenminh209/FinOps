// AI Advisor サービス — GPT-4o mini によるコスト最適化提案
import OpenAI from 'openai';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { resources, cloudAccounts, optimizations } from '../../db/schema';
import type { Optimization, OptimizationAction } from '@finops/shared';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `あなたは日本のSME向けクラウドFinOpsアドバイザーです。
以下のルールに従って回答してください：
- 必ずJSON形式で回答（recommendations配列）
- actionDescriptionは日本語で記述
- 金額はJPY（円）単位
- savingsJpyは月間削減見込み額（正の整数）
- co2ReducedKgはCO2削減量（kg単位の正の数）
- actionTypeは "ri_purchase", "sp_purchase", "rightsize", "stop" のいずれか
- 最大5件の推奨アクションを提案`;

interface AiRecommendationRaw {
  resourceId: string;
  actionType: OptimizationAction;
  actionDescription: string;
  savingsJpy: number;
  co2ReducedKg: number;
}

// ── AI 分析 + 推奨生成 ──

export async function analyzeAndRecommend(orgId: string): Promise<Optimization[]> {
  const resourceData = await db
    .select({
      id: resources.id,
      name: resources.name,
      resourceType: resources.resourceType,
      status: resources.status,
      monthlyCostJpy: resources.monthlyCostJpy,
      region: cloudAccounts.region,
      provider: cloudAccounts.provider,
    })
    .from(resources)
    .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
    .where(and(eq(cloudAccounts.orgId, orgId), eq(cloudAccounts.isActive, true)))
    .limit(50);

  if (resourceData.length === 0) return [];

  const totalMonthlyCost = resourceData.reduce((s, r) => s + (r.monthlyCostJpy ?? 0), 0);

  const prompt = `以下のクラウドリソース利用状況を分析し、コスト最適化の推奨アクションをJSON形式で提案してください。

【現在の月額コスト合計】: ¥${totalMonthlyCost.toLocaleString('ja-JP')}

【リソース一覧】:
${resourceData.map(r =>
  `- ID: ${r.id}, タイプ: ${r.resourceType}, 名前: ${r.name ?? r.resourceType}, ステータス: ${r.status}, 月額: ¥${r.monthlyCostJpy}, リージョン: ${r.region}`
).join('\n')}

必ず以下のJSON形式で回答してください:
{
  "recommendations": [
    {
      "resourceId": "<リソースID>",
      "actionType": "<ri_purchase|sp_purchase|rightsize|stop>",
      "actionDescription": "<日本語での具体的な説明>",
      "savingsJpy": <月間削減額（整数）>,
      "co2ReducedKg": <CO2削減量（小数可）>
    }
  ]
}`;

  let rawRecommendations: AiRecommendationRaw[] = [];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(content) as { recommendations?: AiRecommendationRaw[] };
    rawRecommendations = parsed.recommendations ?? [];
  } catch (err) {
    console.error('[AI Advisor] OpenAI API error, using fallback:', err);
    rawRecommendations = generateFallbackRecommendations(resourceData);
  }

  // 有効なリソースIDのみフィルタ
  const validResourceIds = new Set(resourceData.map(r => r.id));
  const validRecs = rawRecommendations
    .filter(r => validResourceIds.has(r.resourceId) && r.savingsJpy > 0)
    .slice(0, 5);

  if (validRecs.length === 0) return [];

  // optimizations テーブルに保存
  const inserted = await db
    .insert(optimizations)
    .values(validRecs.map(rec => ({
      resourceId: rec.resourceId,
      recommendedBy: 'gpt-4o-mini',
      actionType: rec.actionType,
      actionDescription: rec.actionDescription,
      status: 'pending' as const,
      savingsJpy: Math.round(rec.savingsJpy),
      co2ReducedKg: Number(rec.co2ReducedKg.toFixed(4)),
      details: { analyzedAt: new Date().toISOString(), orgId },
    })))
    .returning();

  return inserted.map(mapOptimization);
}

// OpenAI 利用不可時のフォールバック推奨生成
function generateFallbackRecommendations(
  resourceData: Array<{
    id: string;
    name: string | null;
    resourceType: string;
    status: string;
    monthlyCostJpy: number;
    region: string;
    provider: string;
  }>,
): AiRecommendationRaw[] {
  const recs: AiRecommendationRaw[] = [];

  for (const r of resourceData) {
    if (recs.length >= 5) break;

    if (r.status === 'stopped' && r.monthlyCostJpy > 1000) {
      recs.push({
        resourceId: r.id,
        actionType: 'stop',
        actionDescription: `${r.name ?? r.resourceType} は停止中ですが月額コストが発生しています。不要であれば削除することでコストを削減できます。`,
        savingsJpy: Math.round(r.monthlyCostJpy * 0.9),
        co2ReducedKg: r.monthlyCostJpy * 0.0005,
      });
    } else if (r.status === 'running' && r.monthlyCostJpy > 10000 && r.resourceType === 'ec2') {
      recs.push({
        resourceId: r.id,
        actionType: 'ri_purchase',
        actionDescription: `${r.name ?? r.resourceType} は継続稼働中です。1年間のReserved Instanceを購入することで約40%のコスト削減が見込めます。`,
        savingsJpy: Math.round(r.monthlyCostJpy * 0.4),
        co2ReducedKg: r.monthlyCostJpy * 0.0008,
      });
    } else if (r.status === 'running' && r.monthlyCostJpy > 5000) {
      recs.push({
        resourceId: r.id,
        actionType: 'rightsize',
        actionDescription: `${r.name ?? r.resourceType} のCPU使用率が低い可能性があります。ダウンサイジングにより月額コストを削減できます。`,
        savingsJpy: Math.round(r.monthlyCostJpy * 0.25),
        co2ReducedKg: r.monthlyCostJpy * 0.0004,
      });
    }
  }

  return recs;
}

// ── 推奨一覧取得 ──

export async function getRecommendations(orgId: string, status?: string): Promise<Optimization[]> {
  const orgResources = await db
    .select({ id: resources.id })
    .from(resources)
    .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
    .where(eq(cloudAccounts.orgId, orgId));

  if (orgResources.length === 0) return [];

  const resourceIds = orgResources.map(r => r.id);

  const conditions = [inArray(optimizations.resourceId, resourceIds)];
  if (status && ['pending', 'approved', 'executed', 'dismissed'].includes(status)) {
    conditions.push(eq(optimizations.status, status));
  }

  const rows = await db
    .select()
    .from(optimizations)
    .where(and(...conditions))
    .orderBy(desc(optimizations.recommendedAt))
    .limit(50);

  return rows.map(mapOptimization);
}

// ── 推奨ステータス更新 ──

export async function updateOptimizationStatus(
  orgId: string,
  optimizationId: string,
  newStatus: 'approved' | 'dismissed',
): Promise<Optimization | null> {
  // テナント分離: orgに属するリソースかを検証
  const orgResources = await db
    .select({ id: resources.id })
    .from(resources)
    .innerJoin(cloudAccounts, eq(resources.cloudAccountId, cloudAccounts.id))
    .where(eq(cloudAccounts.orgId, orgId));

  const resourceIds = new Set(orgResources.map(r => r.id));

  const [opt] = await db
    .select()
    .from(optimizations)
    .where(eq(optimizations.id, optimizationId))
    .limit(1);

  if (!opt || !resourceIds.has(opt.resourceId)) return null;

  const [updated] = await db
    .update(optimizations)
    .set({
      status: newStatus,
      ...(newStatus === 'approved' ? { executedAt: new Date() } : {}),
    })
    .where(eq(optimizations.id, optimizationId))
    .returning();

  return updated ? mapOptimization(updated) : null;
}

// ── マッパー ──

function mapOptimization(row: typeof optimizations.$inferSelect): Optimization {
  return {
    id: row.id,
    resourceId: row.resourceId,
    recommendedBy: row.recommendedBy,
    actionType: row.actionType as OptimizationAction,
    actionDescription: row.actionDescription,
    status: row.status as Optimization['status'],
    savingsJpy: row.savingsJpy,
    co2ReducedKg: row.co2ReducedKg,
    details: (row.details as Record<string, unknown>) ?? {},
    recommendedAt: row.recommendedAt,
    executedAt: row.executedAt,
  };
}

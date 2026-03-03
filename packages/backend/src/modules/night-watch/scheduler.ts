import type { ScheduledEvent } from 'aws-lambda';
import { executeNightWatch } from './service';

/**
 * EventBridge Lambda ハンドラー
 * 定期実行（例: 毎分 or 5分間隔）でNight-Watchサイクルを実行
 */
export async function handler(event: ScheduledEvent) {
  console.log('Night-Watch スケジューラ実行開始', JSON.stringify(event));

  try {
    const result = await executeNightWatch();

    console.log(
      `Night-Watch 完了: ${result.stopped}台停止, ${result.started}台起動` +
      (result.errors.length > 0 ? `, ${result.errors.length}件エラー` : ''),
    );

    if (result.errors.length > 0) {
      console.warn('Night-Watch エラー詳細:', result.errors);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('Night-Watch スケジューラ実行失敗:', err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
    };
  }
}

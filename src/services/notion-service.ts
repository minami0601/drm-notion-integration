import { Client } from '@notionhq/client';
import type { NotionPageId } from '../types';
import { chunk } from 'remeda';

// Notion APIクライアントと環境変数を保持する変数
let notion: Client;
let STUDENT_DATABASE_ID: string;
let EVENT_DATABASE_ID: string;

/**
 * バッチサイズの定数
 * NotionのAPIフィルター制限（最大100項目）に対応するため
 */
const BATCH_SIZE = 90; // 余裕を持って90に設定

/**
 * 配列をバッチに分割する関数
 *
 * @param items 分割する配列
 * @param batchSize バッチサイズ
 * @returns バッチの配列
 */
function batchItems<T>(items: T[], batchSize: number = BATCH_SIZE): T[][] {
  return chunk(items, batchSize);
}

/**
 * バッチ処理の結果を集約する関数
 *
 * @param results 集約する結果の配列
 * @returns 集約された結果の配列
 */
function aggregateResults<T>(results: T[][]): T[] {
  return results.flat();
}

/**
 * Notion APIクライアントを初期化する関数
 *
 * @param apiKey Notion API Key
 * @param studentDbId 生徒データベースID
 * @param eventDbId イベントデータベースID
 */
export function initNotionClient(apiKey: string, studentDbId: string, eventDbId: string): void {
  notion = new Client({ auth: apiKey });
  STUDENT_DATABASE_ID = studentDbId;
  EVENT_DATABASE_ID = eventDbId;
}

/**
 * 生徒情報を取得する関数
 *
 * @param studentIds 生徒IDのリスト
 * @returns NotionページIDのリスト
 */
export async function getStudents(studentIds: string[]): Promise<NotionPageId[]> {
  if (!STUDENT_DATABASE_ID) {
    throw new Error('STUDENT_DATABASE_ID環境変数が設定されていません');
  }

  try {
    // IDをバッチに分割
    const batches = batchItems(studentIds);

    // 各バッチを順次処理
    const batchResults: NotionPageId[][] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const response = await notion.databases.query({
          database_id: STUDENT_DATABASE_ID,
          filter: {
            or: batch.map(id => ({
              property: 'LステップID',
              rich_text: {
                equals: id
              }
            }))
          }
        });

        // 結果のIDのみを抽出
        const pageIds = response.results.map(page => page.id);
        batchResults.push(pageIds);
      } catch (batchError) {
        console.error(`バッチ${i + 1}の処理中にエラーが発生しました:`, batchError);
        throw batchError;
      }
    }

    // 結果を集約
    const allResults = aggregateResults(batchResults);

    // 見つからなかった生徒IDがあれば報告
    if (allResults.length < studentIds.length) {
      console.warn(`警告: ${studentIds.length - allResults.length}件の生徒IDが見つかりませんでした`);
    }

    return allResults;
  } catch (error) {
    console.error('生徒情報取得エラー:', error);
    throw error;
  }
}

/**
 * 既存のイベントを更新する関数
 *
 * @param pageId イベントページのID
 * @param students 参加生徒のNotionページIDリスト
 * @returns 更新されたイベントのID
 */
export async function updateEventParticipants(pageId: string, students: NotionPageId[]): Promise<{id: string}> {
  try {
    // イベントページを更新
    const response = await notion.pages.update({
      page_id: pageId,
      properties: {
        '参加者': {
          relation: students.map(studentId => ({
            id: studentId
          }))
        }
      }
    });

    return {
      id: response.id
    };
  } catch (error) {
    console.error('イベント更新エラー:', error);
    throw error;
  }
}

/**
 * 環境変数の型定義
 */
export interface Env {
	NOTION_API_KEY: string;
	STUDENT_DATABASE_ID: string;
	EVENT_DATABASE_ID: string;
}

/**
 * NotionのページID型
 */
export type NotionPageId = string;

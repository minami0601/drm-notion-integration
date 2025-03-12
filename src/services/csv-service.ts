import { parse } from "csv-parse/browser/esm/sync";

interface CsvRow {
	[key: string]: string;
}

/**
 * CSVを解析して生徒IDのリストを取得する関数
 *
 * @param url CSVファイルのURL
 * @returns 抽出した生徒IDのリスト
 */
export async function parseCSV(url: string): Promise<string[]> {
	try {
		// CSVファイルを取得
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(
				`CSVファイルの取得に失敗しました: ${response.status} ${response.statusText}`,
			);
		}

		const csvContent = await response.text();

		// csv-parseを使用して同期的にパース
		const records = parse(csvContent, {
			columns: true, // ヘッダー行を使用
			from_line: 2, // 1行目をスキップ（2行目をヘッダーとして使用）
			trim: true, // 空白を削除
			skip_empty_lines: true, // 空行を無視
		});

		// 生徒IDを抽出
		const studentIds: string[] = [];
		for (const row of records) {
			// 'ID'カラムの値を取得（大文字小文字区別なし）
			const idValue = Object.entries(row).find(
				([key]) => key.toUpperCase() === "ID",
			)?.[1];

			if (idValue && typeof idValue === "string" && idValue.trim()) {
				studentIds.push(idValue.trim());
			}
		}

		return studentIds;
	} catch (error) {
		console.error("CSV解析エラー:", error);
		throw error;
	}
}

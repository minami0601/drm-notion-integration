import * as fastCsv from "fast-csv";
import { Readable } from "node:stream";

interface CsvRow {
	[key: string]: string;
}

/**
 * string型のデータをReadableStreamに変換する関数
 *
 * @param string 変換する文字列
 * @returns Readable stream
 */
function stringToStream(string: string): Readable {
	const stream = new Readable();
	stream.push(string);
	stream.push(null);
	return stream;
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

		// 生徒IDを格納する配列
		const studentIds: string[] = [];

		// fast-csvでパース処理を行う
		return new Promise<string[]>((resolve, reject) => {
			const stream = stringToStream(csvContent);

			fastCsv
				.parseStream<CsvRow, CsvRow>(stream, {
					headers: true, // ヘッダー行を使用
					skipLines: 1, // 1行目をスキップ（2行目をヘッダーとして使用）
					trim: true, // 空白を削除
					ignoreEmpty: true, // 空行を無視
				})
				.on("data", (row: CsvRow) => {
					// 'ID'カラムの値を取得（大文字小文字区別なし）
					const idValue = Object.entries(row).find(
						([key]) => key.toUpperCase() === "ID",
					)?.[1];

					if (idValue && typeof idValue === "string" && idValue.trim()) {
						studentIds.push(idValue.trim());
					}
				})
				.on("error", (error: Error) => {
					console.error("CSV解析エラー:", error);
					reject(error);
				})
				.on("end", () => {
					resolve(studentIds);
				});
		});
	} catch (error) {
		console.error("CSV解析エラー:", error);
		throw error;
	}
}

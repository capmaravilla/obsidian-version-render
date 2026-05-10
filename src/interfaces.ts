export interface OpenSyncHistorySettings {
	// reserved for future settings
}

declare module 'obsidian' {
	interface App {
		internalPlugins: {
			plugins: {
				'file-recovery': {
					instance: fileRInstance;
				};
			};
		};
	}
}

export interface recResult {
	path: string;
	ts: number;
	data: string;
}

export interface vItem {
	html: HTMLElement;
}

export interface vRecoveryItem extends vItem {
	data: string;
}

export interface fileRInstance {
	db: {
		transaction(
			type: 'backups',
			access: 'readonly'
		): {
			store: {
				index(key: 'path'): {
					getAll(): Promise<recResult[]>;
				};
			};
		};
	};
}

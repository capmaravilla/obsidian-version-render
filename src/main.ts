import { Command, Notice, Plugin, TFile } from 'obsidian';
import type { OpenSyncHistorySettings } from './interfaces';
import OpenSyncHistorySettingTab from './settings';
import RecoveryView from './recovery_diff_view';

const DEFAULT_SETTINGS: OpenSyncHistorySettings = {};

export default class VersionRenderPlugin extends Plugin {
	//@ts-ignore
	settings: OpenSyncHistorySettings;

	openRecoveryView(file: TFile): void {
		new RecoveryView(this, this.app, file).open();
	}

	giveCallback(
		fn: (file: TFile) => Promise<void> | void
	): Command['checkCallback'] {
		return (checking: boolean): boolean => {
			const tfile: TFile | null = this.app.workspace.getActiveFile();
			if (tfile) {
				if (!checking) {
					fn(tfile);
				}
				return true;
			} else {
				return false;
			}
		};
	}

	returnRecoveryCommand(): Command {
		return {
			id: 'open-version-history',
			name: 'Show version history for active file',
			checkCallback: this.giveCallback(
				this.openRecoveryView.bind(this)
			),
		};
	}

	async onload() {
		console.log('loading Version Render plugin');

		this.addCommand(this.returnRecoveryCommand());

		await this.loadSettings();

		this.addSettingTab(new OpenSyncHistorySettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading Version Render plugin');
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

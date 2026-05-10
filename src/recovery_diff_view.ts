import { App, Notice, TFile } from 'obsidian';
import type VersionRenderPlugin from './main';
import type { recResult, vRecoveryItem } from './interfaces';
import { ITEM_CLASS } from './constants';
import VersionRenderView from './abstract_diff_view';

export default class RecoveryView extends VersionRenderView {
	versions: recResult[];
	leftVList: vRecoveryItem[];
	rightVList: vRecoveryItem[];

	constructor(plugin: VersionRenderPlugin, app: App, file: TFile) {
		super(plugin, app, file);
		this.versions = [];
		this.leftVList = [];
		this.rightVList = [];
	}

	async onOpen() {
		super.onOpen();
		await this.getInitialVersions();
		this.makeHistoryLists();
		this.renderSideBySide();
		this.appendVersions();
		this.makeMoreGeneralHtml();
	}

	async getInitialVersions() {
		const fileRecovery = await this.app.internalPlugins.plugins[
			'file-recovery'
		].instance.db
			.transaction('backups', 'readonly')
			.store.index('path')
			.getAll();
		const fileContent = await this.app.vault.read(this.file);
		this.versions.push({ path: this.file.path, ts: 0, data: fileContent });
		const len = fileRecovery.length - 1;
		for (let i = len; i >= 0; i--) {
			const version = fileRecovery[i];
			if (version.path === this.file.path) {
				this.versions.push(version);
			}
		}
		if (!(this.versions.length > 1)) {
			this.close();
			new Notice('No hay al menos dos versiones disponibles.');
			return;
		}

		[this.leftContent, this.rightContent] = [
			this.versions[1].data,
			this.versions[0].data,
		];
	}

	appendVersions() {
		this.leftVList.push(
			...this.appendRecoveryVersions(
				this.leftHistory[1],
				this.versions,
				true
			)
		);
		this.rightVList.push(
			...this.appendRecoveryVersions(
				this.rightHistory[1],
				this.versions,
				false
			)
		);
	}

	private appendRecoveryVersions(
		el: HTMLElement,
		versions: recResult[],
		left: boolean = false
	): vRecoveryItem[] {
		const versionList: vRecoveryItem[] = [];
		for (let i = 0; i < versions.length; i++) {
			const version = versions[i];
			let date = new Date(version.ts);
			if (i === 0) {
				date = new Date();
			}
			let div = el.createDiv({
				cls: ITEM_CLASS,
				attr: {
					id: left ? this.ids.left : this.ids.right,
				},
			});
			left ? (this.ids.left += 1) : (this.ids.right += 1);
			if (i === 0) {
				div.createDiv({ text: 'Estado actual' });
				div.createDiv({ text: date.toLocaleTimeString() });
			} else {
				div.createDiv({
					text:
						date.toDateString() + ', ' + date.toLocaleTimeString(),
				});
			}
			versionList.push({
				html: div,
				data: version.data,
			});
			div.addEventListener('click', async () => {
				await this.generateVersionListener(
					div,
					left ? this.leftVList : this.rightVList,
					left ? this.leftActive : this.rightActive,
					left
				);
				if (left) {
					this.leftContent = version.data;
				} else {
					this.rightContent = version.data;
				}
				this.renderSideBySide();
				// Re-append version lists to preserve them after render
				this.contentEl.insertBefore(
					this.leftHistory[0],
					this.renderContainer
				);
				this.contentEl.appendChild(this.rightHistory[0]);
			});
		}
		return versionList;
	}
}

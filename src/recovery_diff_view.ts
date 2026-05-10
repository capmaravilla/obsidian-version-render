import { App, Notice, TFile } from 'obsidian';
import type VersionRenderPlugin from './main';
import type { recResult, vRecoveryItem } from './interfaces';
import { ITEM_CLASS } from './constants';
import VersionRenderView from './abstract_diff_view';

/**
 * Formatea una fecha en español con dos líneas: fecha arriba, hora abajo.
 */
function formatDateSpanish(ts: number): string {
	const d = new Date(ts);
	const fecha = d.toLocaleDateString('es-ES', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
	const hora = d.toLocaleTimeString('es-ES', {
		hour: '2-digit',
		minute: '2-digit',
	});
	return fecha + '\n' + hora;
}

export default class RecoveryView extends VersionRenderView {
	versions: recResult[];
	vList: vRecoveryItem[];

	constructor(plugin: VersionRenderPlugin, app: App, file: TFile) {
		super(plugin, app, file);
		this.versions = [];
		this.vList = [];
	}

	async onOpen() {
		super.onOpen();
		await this.getInitialVersions();
		this.makeHistoryList();
		this.renderSideBySide();
		this.appendVersions();
		// Activar primera versión histórica (índice 1 = la más reciente)
		if (this.vList.length > 0) {
			this.vList[0].html.addClass('is-active');
			this.active = 0;
		}
	}

	async getInitialVersions() {
		const fileRecovery = await this.app.internalPlugins.plugins[
			'file-recovery'
		].instance.db
			.transaction('backups', 'readonly')
			.store.index('path')
			.getAll();

		// La versión actual (disco) siempre va fija en el panel derecho
		this.currentContent = await this.app.vault.read(this.file);

		// Recolectar versiones históricas (excluyendo la actual del disco)
		const len = fileRecovery.length - 1;
		for (let i = len; i >= 0; i--) {
			const version = fileRecovery[i];
			if (version.path === this.file.path) {
				this.versions.push(version);
			}
		}

		if (this.versions.length === 0) {
			this.close();
			new Notice('No hay versiones históricas disponibles.');
			return;
		}

		// Seleccionar la versión más reciente como la inicial
		this.selectedContent = this.versions[0].data;
		this.selectedLabel = formatDateSpanish(this.versions[0].ts);
	}

	appendVersions() {
		this.vList.push(
			...this.appendRecoveryVersions(this.historyList, this.versions)
		);
	}

	private appendRecoveryVersions(
		el: HTMLElement,
		versions: recResult[]
	): vRecoveryItem[] {
		const versionList: vRecoveryItem[] = [];

		for (let i = 0; i < versions.length; i++) {
			const version = versions[i];
			const dateStr = formatDateSpanish(version.ts);

			const div = el.createDiv({
				cls: ITEM_CLASS,
				attr: { id: this.ids },
			});
			this.ids += 1;

			// Fecha y hora en dos líneas
			const lines = dateStr.split('\n');
			div.createDiv({ text: lines[0] });
			div.createDiv({ text: lines[1] });

			versionList.push({
				html: div,
				data: version.data,
			});

			div.addEventListener('click', async () => {
				await this.activateVersion(div);
				this.selectedContent = version.data;
				this.selectedLabel = dateStr;
				this.renderSideBySide();
				// Re-posicionar el selector tras el render
				this.contentEl.insertBefore(
					this.historyContainer,
					this.renderContainer
				);
			});
		}

		return versionList;
	}
}

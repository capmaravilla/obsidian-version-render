import {
	App,
	Component,
	MarkdownRenderer,
	Modal,
	Notice,
	setTooltip,
	TFile,
} from 'obsidian';
import type VersionRenderPlugin from './main';

export default class FileModal extends Modal {
	raw: boolean;
	comp: Component;

	constructor(
		private plugin: VersionRenderPlugin,
		public app: App,
		private syncFile: string,
		private file: TFile,
		private warning: string
	) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.file = file;
		this.syncFile = syncFile;
		this.raw = false;
		this.comp = new Component();
		this.comp.load();
	}

	async onClose() {
		this.comp.unload();
	}

	async onOpen() {
		this.containerEl.addClass('version-display');

		/* Warning con banner estilizado */
		const warningBanner = this.contentEl.createDiv({ cls: 'bt-warning' });
		warningBanner.createSpan({ text: this.warning });

		/* Grupo de acciones */
		const actions = this.contentEl.createDiv({ cls: 'bt-actions' });

		const restoreButton = actions.createEl('button', {
			cls: 'bt-restore-btn',
			text: 'Restaurar esta versión',
		});
		setTooltip(restoreButton, 'Sobrescribe el archivo actual con esta versión', {
			placement: 'top',
		});

		const switchButton = actions.createEl('button', {
			cls: 'bt-toggle-btn',
			text: 'Ver texto plano',
		});

		/* Área de contenido */
		const contentArea = this.contentEl.createDiv({ cls: 'bt-content-area' });

		switchButton.addEventListener('click', () => {
			if (!this.raw) {
				contentArea.empty();
				const textArea = contentArea.createEl('textarea', {
					text: this.syncFile,
					attr: { spellcheck: 'false' },
					cls: 'bt-raw-area',
				});
				this.raw = !this.raw;
				switchButton.innerText = 'Ver vista de lectura';
			} else {
				this.raw = !this.raw;
				(async () => {
					contentArea.empty();
					await MarkdownRenderer.render(
						this.app,
						this.syncFile,
						contentArea,
						this.file.path,
						this.comp
					);
				})();
				switchButton.innerText = 'Ver texto plano';
			}
		});

		restoreButton.addEventListener('click', () => {
			(async () => {
				await this.app.vault.modify(this.file, this.syncFile);
			})();
			new Notice(
				`Archivo «${this.file.basename}» restaurado a la versión seleccionada.`
			);
			this.close();
		});

		await MarkdownRenderer.render(
			this.app,
			this.syncFile,
			contentArea,
			this.file.path,
			this.comp
		);
	}
}

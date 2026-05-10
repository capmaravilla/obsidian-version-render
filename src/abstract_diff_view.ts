import { App, Component, MarkdownRenderer, Modal, TFile } from 'obsidian';
import { FILE_REC_WARNING } from './constants';
import FileModal from './file_modal';
import type { vItem, vRecoveryItem } from './interfaces';
import type VersionRenderPlugin from './main';

export default abstract class VersionRenderView extends Modal {
	plugin: VersionRenderPlugin;
	app: App;
	file: TFile;
	leftVList: vItem[];
	rightVList: vItem[];
	leftActive: number;
	rightActive: number;
	rightContent: string;
	leftContent: string;
	renderContainer: HTMLElement;
	leftHistory: HTMLElement[];
	rightHistory: HTMLElement[];
	ids: { left: number; right: number };
	private currentComp: Component | null = null;

	constructor(plugin: VersionRenderPlugin, app: App, file: TFile) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.file = file;
		this.modalEl.addClasses(['mod-sync-history', 'diff']);
		this.leftVList = [];
		this.rightVList = [];
		this.rightActive = 0;
		this.leftActive = 1;
		this.rightContent = '';
		this.leftContent = '';
		this.ids = { left: 0, right: 0 };
		//@ts-expect-error, will be filled with the correct data later
		this.leftHistory = [null];
		//@ts-expect-error, will be filled with the correct data later
		this.rightHistory = [null];
		this.containerEl.addClass('diff');
		// @ts-ignore
		this.renderContainer = this.contentEl.createDiv({
			cls: ['version-render-container', 'diff'],
		});
	}

	onOpen() {
		super.onOpen();
	}

	abstract getInitialVersions(): Promise<void | boolean>;

	abstract appendVersions(): void;

	public renderSideBySide(): void {
		// Limpiar contenedor y componente anterior
		this.renderContainer.empty();
		this.currentComp?.unload();

		const comp = new Component();
		comp.load();
		this.currentComp = comp;

		// Header: nombre de la nota
		this.titleEl.setText(this.file.basename);

		// Crear los dos paneles
		const leftPanel = this.renderContainer.createDiv({
			cls: 'version-render-panel',
		});
		const rightPanel = this.renderContainer.createDiv({
			cls: 'version-render-panel',
		});

		// Etiquetas de cada panel
		leftPanel.createDiv({
			cls: 'version-render-panel-header',
			text: `← Versión antigua`,
		});
		rightPanel.createDiv({
			cls: 'version-render-panel-header',
			text: `→ Versión reciente`,
		});

		// Contenido renderizado
		const leftContent = leftPanel.createDiv({
			cls: 'version-render-panel-body',
		});
		const rightContent = rightPanel.createDiv({
			cls: 'version-render-panel-body',
		});

		MarkdownRenderer.render(
			this.app,
			this.leftContent,
			leftContent,
			this.file.path,
			comp
		);
		MarkdownRenderer.render(
			this.app,
			this.rightContent,
			rightContent,
			this.file.path,
			comp
		);

		// Añadir elementos al DOM
		this.contentEl.appendChild(this.leftHistory[0]);
		this.contentEl.appendChild(this.renderContainer);
		this.contentEl.appendChild(this.rightHistory[0]);
	}

	public makeHistoryLists(): void {
		this.leftHistory = this.createHistory(this.contentEl, true);
		this.rightHistory = this.createHistory(this.contentEl, false);
	}

	private createHistory(
		el: HTMLElement,
		left: boolean = false
	): HTMLElement[] {
		const container = el.createDiv({
			cls: 'sync-history-list-container',
		});

		// Botón "Render this version" en AMBOS lados
		const side = left ? 'left' : 'right';
		const showFile = container.createEl('button', {
			cls: 'mod-cta',
			text: `Render ${side} version`,
		});
		showFile.addEventListener('click', () => {
			const content = left ? this.leftContent : this.rightContent;
			new FileModal(
				this.plugin,
				this.app,
				content,
				this.file,
				FILE_REC_WARNING
			).open();
		});

		const historyList = container.createDiv({
			cls: 'sync-history-list',
		});
		return [container, historyList];
	}

	public makeMoreGeneralHtml(): void {
		this.rightVList[0].html.addClass('is-active');
		this.leftVList[1].html.addClass('is-active');
		this.rightActive = 0;
		this.leftActive = 1;
	}

	public async generateVersionListener(
		div: HTMLDivElement,
		currentVList: vItem[],
		currentActive: number,
		left: boolean = false
	): Promise<vItem> {
		const currentSideOldVersion = currentVList[currentActive];
		const idx = Number(div.id);
		const clickedEl: vItem = currentVList[idx];
		div.addClass('is-active');
		if (left) {
			this.leftActive = idx;
		} else {
			this.rightActive = idx;
		}
		if (Number.parseInt(currentSideOldVersion.html.id) !== idx) {
			currentSideOldVersion.html.classList.remove('is-active');
		}
		return clickedEl;
	}

	onClose() {
		super.onClose();
		this.currentComp?.unload();
		this.currentComp = null;
	}
}

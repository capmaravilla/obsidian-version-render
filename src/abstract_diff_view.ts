import { App, Component, MarkdownRenderer, Modal, TFile } from 'obsidian';
import type { vItem } from './interfaces';
import type VersionRenderPlugin from './main';

export default abstract class VersionRenderView extends Modal {
	plugin: VersionRenderPlugin;
	app: App;
	file: TFile;
	vList: vItem[];
	active: number;
	currentContent: string;
	selectedContent: string;
	selectedLabel: string;
	renderContainer: HTMLElement;
	historyContainer: HTMLElement;
	historyList: HTMLElement;
	ids: number;
	private currentComp: Component | null = null;

	constructor(plugin: VersionRenderPlugin, app: App, file: TFile) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.file = file;
		this.modalEl.addClasses(['mod-sync-history', 'diff']);
		this.vList = [];
		this.active = 0;
		this.selectedContent = '';
		this.currentContent = '';
		this.selectedLabel = '';
		this.ids = 0;
		//@ts-expect-error, will be filled later
		this.historyContainer = null;
		//@ts-expect-error, will be filled later
		this.historyList = null;
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
		this.renderContainer.empty();
		this.currentComp?.unload();

		const comp = new Component();
		comp.load();
		this.currentComp = comp;

		this.titleEl.setText(this.file.basename);

		// Panel izquierdo: versión seleccionada (histórica)
		const selectedPanel = this.renderContainer.createDiv({
			cls: 'version-render-panel',
		});
		// Panel derecho: versión actual (fija)
		const currentPanel = this.renderContainer.createDiv({
			cls: 'version-render-panel',
		});

		selectedPanel.createDiv({
			cls: 'version-render-panel-header',
			text: this.selectedLabel || 'Versión seleccionada',
		});
		currentPanel.createDiv({
			cls: 'version-render-panel-header',
			text: 'Versión actual',
		});

		const selectedBody = selectedPanel.createDiv({
			cls: 'version-render-panel-body',
		});
		const currentBody = currentPanel.createDiv({
			cls: 'version-render-panel-body',
		});

		MarkdownRenderer.render(
			this.app,
			this.selectedContent,
			selectedBody,
			this.file.path,
			comp
		);
		MarkdownRenderer.render(
			this.app,
			this.currentContent,
			currentBody,
			this.file.path,
			comp
		);

		// Hacer el texto seleccionable
		selectedBody.style.userSelect = 'text';
		currentBody.style.userSelect = 'text';

		// Aplicar resaltado de diferencias
		this.applyDiffHighlighting(selectedBody, currentBody);

		// Sincronizar scroll
		this.syncScroll(selectedBody, currentBody);

		// Reconstruir layout: selector a la izquierda, paneles a la derecha
		this.contentEl.appendChild(this.historyContainer);
		this.contentEl.appendChild(this.renderContainer);
	}

	/**
	 * Sincroniza el scroll entre dos paneles.
	 */
	private syncScroll(panelA: HTMLElement, panelB: HTMLElement): void {
		let syncing = false;

		const sync = (
			source: HTMLElement,
			target: HTMLElement
		) => {
			source.addEventListener('scroll', () => {
				if (syncing) return;
				syncing = true;
				// Sincronizar proporcionalmente
				const ratio =
					source.scrollTop /
					(source.scrollHeight - source.clientHeight || 1);
				target.scrollTop =
					ratio * (target.scrollHeight - target.clientHeight);
				requestAnimationFrame(() => {
					syncing = false;
				});
			});
		};

		sync(panelA, panelB);
		sync(panelB, panelA);
	}

	/**
	 * Aplica opacidad reducida a los bloques que son idénticos entre ambas versiones,
	 * dejando a opacidad completa los que difieren.
	 */
	private applyDiffHighlighting(
		selectedBody: HTMLElement,
		currentBody: HTMLElement
	): void {
		requestAnimationFrame(() => {
			const leftBlocks = Array.from(
				selectedBody.children
			) as HTMLElement[];
			const rightBlocks = Array.from(
				currentBody.children
			) as HTMLElement[];

			const matchedRight = new Set<number>();

			for (let li = 0; li < leftBlocks.length; li++) {
				const lb = leftBlocks[li];
				const leftText = (lb.textContent || '').trim();

				if (lb.style.opacity === '0.3') continue;

				let bestMatch = -1;
				for (
					let ri = 0;
					ri < rightBlocks.length && ri < li + 3;
					ri++
				) {
					if (matchedRight.has(ri)) continue;
					const rb = rightBlocks[ri];
					const rightText = (rb.textContent || '').trim();
					if (
						leftText === rightText &&
						leftText.length > 0
					) {
						bestMatch = ri;
						break;
					}
				}

				if (bestMatch >= 0) {
					matchedRight.add(bestMatch);
					lb.style.opacity = '0.3';
					rightBlocks[bestMatch].style.opacity = '0.3';
				}
			}
		});
	}

	public makeHistoryList(): void {
		const container =
			this.historyContainer ||
			this.contentEl.createDiv({
				cls: 'sync-history-list-container',
			});
		this.historyContainer = container;

		this.historyList = container.createDiv({
			cls: 'sync-history-list',
		});
	}

	public async activateVersion(
		div: HTMLDivElement
	): Promise<vItem> {
		const oldVersion = this.vList[this.active];
		const idx = Number(div.id);
		const clickedEl: vItem = this.vList[idx];
		div.addClass('is-active');
		this.active = idx;
		if (
			oldVersion &&
			Number.parseInt(oldVersion.html.id) !== idx
		) {
			oldVersion.html.classList.remove('is-active');
		}
		return clickedEl;
	}

	onClose() {
		super.onClose();
		this.currentComp?.unload();
		this.currentComp = null;
	}
}

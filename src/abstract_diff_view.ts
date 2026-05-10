import { App, Component, MarkdownRenderer, Modal, TFile } from 'obsidian';
import type { vItem } from './interfaces';
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
		this.renderContainer.empty();
		this.currentComp?.unload();

		const comp = new Component();
		comp.load();
		this.currentComp = comp;

		this.titleEl.setText(this.file.basename);

		const leftPanel = this.renderContainer.createDiv({
			cls: 'version-render-panel',
		});
		const rightPanel = this.renderContainer.createDiv({
			cls: 'version-render-panel',
		});

		leftPanel.createDiv({
			cls: 'version-render-panel-header',
			text: '← Versión antigua',
		});
		rightPanel.createDiv({
			cls: 'version-render-panel-header',
			text: '→ Versión reciente',
		});

		const leftBody = leftPanel.createDiv({
			cls: 'version-render-panel-body',
		});
		const rightBody = rightPanel.createDiv({
			cls: 'version-render-panel-body',
		});

		MarkdownRenderer.render(
			this.app,
			this.leftContent,
			leftBody,
			this.file.path,
			comp
		);
		MarkdownRenderer.render(
			this.app,
			this.rightContent,
			rightBody,
			this.file.path,
			comp
		);

		// Aplicar resaltado de diferencias
		this.applyDiffHighlighting(leftBody, rightBody);

		this.contentEl.appendChild(this.leftHistory[0]);
		this.contentEl.appendChild(this.renderContainer);
		this.contentEl.appendChild(this.rightHistory[0]);
	}

	/**
	 * Aplica opacidad reducida a los bloques que son idénticos entre ambas versiones,
	 * dejando a opacidad completa los que difieren.
	 * Usa una comparación de bloques DOM con ventana deslizante para alinear
	 * correctamente los elementos aunque haya inserciones o eliminaciones.
	 */
	private applyDiffHighlighting(
		leftBody: HTMLElement,
		rightBody: HTMLElement
	): void {
		// Aseguramos que el render se complete antes de manipular el DOM
		requestAnimationFrame(() => {
			const leftBlocks = Array.from(
				leftBody.children
			) as HTMLElement[];
			const rightBlocks = Array.from(
				rightBody.children
			) as HTMLElement[];

			// Para cada bloque de la izquierda, buscar el mejor match en la derecha
			const matchedRight = new Set<number>();

			for (let li = 0; li < leftBlocks.length; li++) {
				const lb = leftBlocks[li];
				const leftText = (lb.textContent || '').trim();

				// Si ya se emparejó, siguiente
				if (lb.style.opacity === '0.3') continue;

				// Buscar en la derecha un bloque con el mismo texto
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

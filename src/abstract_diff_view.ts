import { App, Component, MarkdownRenderer, Modal, TFile } from 'obsidian';
import { diffWordsWithSpace } from 'diff';
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

		const selectedPanel = this.renderContainer.createDiv({
			cls: 'version-render-panel',
		});
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

		selectedBody.style.userSelect = 'text';
		currentBody.style.userSelect = 'text';

		this.applyDiffHighlighting(selectedBody, currentBody);
		this.syncScroll(selectedBody, currentBody);

		this.contentEl.appendChild(this.historyContainer);
		this.contentEl.appendChild(this.renderContainer);
	}

	private syncScroll(panelA: HTMLElement, panelB: HTMLElement): void {
		let syncing = false;

		const sync = (source: HTMLElement, target: HTMLElement) => {
			source.addEventListener('scroll', () => {
				if (syncing) return;
				syncing = true;
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
	 * Estrategia de resaltado:
	 * 1. Bloques con textContent idéntico → opacidad 0.3 (atenuados)
	 * 2. Bloques diferentes:
	 *    a. Opacidad 1.0
	 *    b. Subrayado amarillo en los fragmentos concretos que cambiaron
	 *
	 * Se usa diffWordsWithSpace para capturar cambios de espacios,
	 * guiones y puntuación, no solo palabras.
	 * El resaltado SOLO se aplica dentro de bloques no-atenuados.
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

			// --- Pase 1: atenuar bloques idénticos ---
			const matchedRight = new Set<number>();
			const leftMatched = new Set<number>();

			for (let li = 0; li < leftBlocks.length; li++) {
				const lb = leftBlocks[li];
				const leftText = (lb.textContent || '').trim();
				if (leftText.length === 0) continue;

				let bestMatch = -1;
				for (
					let ri = 0;
					ri < rightBlocks.length && ri < li + 3;
					ri++
				) {
					if (matchedRight.has(ri)) continue;
					const rb = rightBlocks[ri];
					const rightText = (rb.textContent || '').trim();
					if (leftText === rightText) {
						bestMatch = ri;
						break;
					}
				}

				if (bestMatch >= 0) {
					matchedRight.add(bestMatch);
					leftMatched.add(li);
					lb.style.opacity = '0.3';
					rightBlocks[bestMatch].style.opacity = '0.3';
				}
			}

			// --- Pase 2: subrayar diferencias dentro de bloques NO atenuados ---
			// Usamos diffWordsWithSpace para capturar espacios, guiones y puntuación
			const diffs = diffWordsWithSpace(
				this.selectedContent,
				this.currentContent
			);

		// Extraer fragmentos cambiados para cada lado, agrupando consecutivos.
		// NO recortamos: los espacios en blanco son cambios legítimos.
		const leftFragments: string[] = [];
		const rightFragments: string[] = [];

		let leftBuf = '';
		let rightBuf = '';

		for (const part of diffs) {
			if (part.removed) {
				if (rightBuf.length > 0) {
					rightFragments.push(rightBuf);
					rightBuf = '';
				}
				leftBuf += part.value;
			} else if (part.added) {
				if (leftBuf.length > 0) {
					leftFragments.push(leftBuf);
					leftBuf = '';
				}
				rightBuf += part.value;
			} else {
				// Segmento sin cambios: vaciar los buffers
				if (leftBuf.length > 0) {
					leftFragments.push(leftBuf);
					leftBuf = '';
				}
				if (rightBuf.length > 0) {
					rightFragments.push(rightBuf);
					rightBuf = '';
				}
			}
		}
		// Vaciar restos
		if (leftBuf.length > 0) leftFragments.push(leftBuf);
		if (rightBuf.length > 0) rightFragments.push(rightBuf);

			// Subrayar SOLO dentro de bloques no-atenuados
			this.highlightFragmentsInPanel(
				selectedBody,
				leftFragments,
				leftMatched
			);
			this.highlightFragmentsInPanel(
				currentBody,
				rightFragments,
				matchedRight
			);
		});
	}

	/**
	 * Subraya los fragmentos cambiados SOLO en los bloques que no fueron
	 * atenuados (no idénticos). Esto evita falsos positivos como "James".
	 */
	private highlightFragmentsInPanel(
		body: HTMLElement,
		fragments: string[],
		matchedBlocks: Set<number>
	): void {
		if (fragments.length === 0) return;

		// Filtrar fragmentos vacíos y demasiado genéricos
		const filtered = fragments.filter(
			(f) => f.length > 0
		);

		// Obtener acceso indexado a los bloques
		const blocks = Array.from(body.children) as HTMLElement[];

		// Para cada bloque NO atenuado, buscar fragmentos y subrayarlos
		for (let i = 0; i < blocks.length; i++) {
			// Saltar bloques atenuados (idénticos al otro panel)
			if (matchedBlocks.has(i)) continue;

			const block = blocks[i];
			this.highlightFragmentInBlock(block, filtered);
		}
	}

	/**
	 * Busca y subraya fragmentos de texto dentro de un bloque concreto.
	 */
	private highlightFragmentInBlock(
		block: HTMLElement,
		fragments: string[]
	): void {
		const walker = document.createTreeWalker(
			block,
			NodeFilter.SHOW_TEXT,
			{
				acceptNode: (node) => {
					// Saltar solo nodos ya resaltados (evita doble proceso)
					const parent = (node as Text).parentElement;
					if (
						parent?.closest(
							'.diff-word-changed, .diff-frag-highlight'
						)
					) {
						return NodeFilter.FILTER_SKIP;
					}
					return NodeFilter.FILTER_ACCEPT;
				},
			}
		);

		// Intentar encontrar cada fragmento en los nodos de texto del bloque
		for (const frag of fragments) {
			if (frag.length === 0) continue;

			// Reiniciar el walker para cada fragmento
			walker.currentNode = block;

			let textNode: Text | null;
			while ((textNode = walker.nextNode() as Text)) {
				const text = textNode.textContent || '';
				const idx = text.indexOf(frag);

				if (idx >= 0) {
					// Encontrado: envolver en un span con subrayado
					const span = document.createElement('span');
					span.className = 'diff-frag-highlight';
					span.textContent = frag;

					const fragment = document.createDocumentFragment();
					if (idx > 0) {
						fragment.appendChild(
							document.createTextNode(text.slice(0, idx))
						);
					}
					fragment.appendChild(span);
					if (idx + frag.length < text.length) {
						fragment.appendChild(
							document.createTextNode(
								text.slice(idx + frag.length)
							)
						);
					}

					textNode.parentNode?.replaceChild(fragment, textNode);
					break; // Pasar al siguiente fragmento
				}
			}
		}
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

	public async activateVersion(div: HTMLDivElement): Promise<vItem> {
		const oldVersion = this.vList[this.active];
		const idx = Number(div.id);
		const clickedEl: vItem = this.vList[idx];
		div.addClass('is-active');
		this.active = idx;
		if (oldVersion && Number.parseInt(oldVersion.html.id) !== idx) {
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

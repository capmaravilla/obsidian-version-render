import { App, Component, MarkdownRenderer, Modal, TFile } from 'obsidian';
import { diffWords, Change } from 'diff';
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

		// Aplicar resaltado de diferencias (bloques + palabras)
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
	 * Aplica resaltado en dos niveles:
	 * 1. Bloques idénticos → opacidad 0.3
	 * 2. Palabras cambiadas dentro de bloques diferentes → subrayado amarillo
	 */
	private applyDiffHighlighting(
		selectedBody: HTMLElement,
		currentBody: HTMLElement
	): void {
		requestAnimationFrame(() => {
			// Nivel 1: bloques idénticos → atenuar
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
					if (leftText === rightText && leftText.length > 0) {
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

			// Nivel 2: word-level diff en todo el contenido
			this.highlightWordChanges(selectedBody, currentBody);
		});
	}

	/**
	 * Compara palabra a palabra y subraya en amarillo los cambios exactos.
	 */
	private highlightWordChanges(
		selectedBody: HTMLElement,
		currentBody: HTMLElement
	): void {
		const diffs = diffWords(this.selectedContent, this.currentContent);

		// Extraer las palabras cambiadas para cada lado
		// Lado izquierdo: palabras que fueron eliminadas (solo están en la versión antigua)
		// Lado derecho: palabras que fueron añadidas (solo están en la versión actual)
		const leftWords: string[] = [];
		const rightWords: string[] = [];

		for (const part of diffs) {
			// Saltar whitespace-only y puntuación suelta
			const trimmed = part.value.trim();
			if (trimmed.length === 0) continue;

			if (part.removed) {
				// Tokenizar: dividir en palabras individuales
				leftWords.push(...trimmed.split(/\s+/));
			}
			if (part.added) {
				rightWords.push(...trimmed.split(/\s+/));
			}
		}

		// Subrayar en cada panel
		this.highlightWordsInPanel(selectedBody, leftWords);
		this.highlightWordsInPanel(currentBody, rightWords);
	}

	/**
	 * Recorre los nodos de texto y envuelve las palabras cambiadas
	 * en un span con subrayado amarillo.
	 */
	private highlightWordsInPanel(
		container: HTMLElement,
		words: string[]
	): void {
		if (words.length === 0) return;

		// Filtrar palabras significativas (>1 char, sin solo puntuación)
		const significant = words.filter(
			(w) => w.length > 1 && /[a-zA-Záéíóúüñ0-9]/.test(w)
		);

		// Crear un Set para búsqueda O(1)
		const wordSet = new Set(significant);

		const walker = document.createTreeWalker(
			container,
			NodeFilter.SHOW_TEXT,
			{
				acceptNode: (node) => {
					// No procesar nodos dentro de elementos de código
					const parent = node.parentElement;
					if (
						parent?.closest(
							'code, pre, .diff-word-changed'
						)
					) {
						return NodeFilter.FILTER_SKIP;
					}
					return NodeFilter.FILTER_ACCEPT;
				},
			}
		);

		const replacements: Array<{
			node: Text;
			fragment: DocumentFragment;
		}> = [];

		let textNode: Text | null;
		while ((textNode = walker.nextNode() as Text)) {
			const text = textNode.textContent || '';
			if (text.trim().length === 0) continue;

			const fragment = document.createDocumentFragment();
			let lastIndex = 0;
			let hasMatch = false;

			// Tokenizar el texto del nodo en palabras manteniendo delimitadores
			const regex = /(\S+|\s+)/g;
			let match: RegExpExecArray | null;
			while ((match = regex.exec(text)) !== null) {
				const token = match[0];
				// Si es una palabra cambiada, envolverla
				if (wordSet.has(token)) {
					// Añadir texto anterior sin resaltar
					if (match.index > lastIndex) {
						fragment.appendChild(
							document.createTextNode(
								text.slice(lastIndex, match.index)
							)
						);
					}
					// Envolver la palabra cambiada
					const span = document.createElement('span');
					span.className = 'diff-word-changed';
					span.textContent = token;
					fragment.appendChild(span);
					lastIndex = match.index + token.length;
					hasMatch = true;
				}
			}

			if (hasMatch) {
				// Añadir el resto del texto tras el último match
				if (lastIndex < text.length) {
					fragment.appendChild(
						document.createTextNode(text.slice(lastIndex))
					);
				}
				replacements.push({ node: textNode, fragment });
			}
		}

		// Aplicar reemplazos
		for (const { node, fragment } of replacements) {
			node.parentNode?.replaceChild(fragment, node);
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

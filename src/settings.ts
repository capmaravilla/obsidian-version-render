import { App, PluginSettingTab } from 'obsidian';
import type VersionRenderPlugin from './main';

export default class VersionRenderSettingTab extends PluginSettingTab {
	plugin: VersionRenderPlugin;

	constructor(app: App, plugin: VersionRenderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('bt-settings');

		/* ── Cabecera ── */
		const header = containerEl.createEl('div', { cls: 'bt-setting-card' });
		const headerTop = header.createEl('div', { cls: 'bt-setting-card-header' });
		headerTop.createEl('h3', { text: 'cm-backtrack' });
		headerTop.createEl('span', { cls: 'bt-badge', text: 'v1.0' });

		const headerBody = header.createEl('div', { cls: 'bt-setting-card-body' });
		headerBody.createEl('p', {
			text: 'Historial de versiones con vista renderizada side-by-side. Compara dos versiones de una nota como se verían en Obsidian, con las diferencias resaltadas.'
		});

		/* ── Cómo usar ── */
		const usage = containerEl.createEl('div', { cls: 'bt-setting-card' });
		const usageHeader = usage.createEl('div', { cls: 'bt-setting-card-header' });
		usageHeader.createEl('h3', { text: '▶ Cómo usar' });

		const usageBody = usage.createEl('div', { cls: 'bt-setting-card-body' });
		const ol = usageBody.createEl('ol');
		ol.createEl('li').createEl('p', { text: 'Abre cualquier nota en Obsidian.' });
		const li2 = ol.createEl('li');
		li2.createEl('p').appendChild(
			createFragment((frag) => {
				frag.append('Abre la paleta de comandos con ');
				frag.createEl('kbd', { text: 'Ctrl+P' });
				frag.append(' / ');
				frag.createEl('kbd', { text: 'Cmd+P' });
				frag.append('.');
			})
		);
		ol.createEl('li').createEl('p', {
			text: 'Busca "Show version history" y selecciona el comando.'
		});
		const li4 = ol.createEl('li');
		li4.createEl('p').appendChild(
			createFragment((frag) => {
				frag.append('Haz clic en una versión de la lista para verla renderizada en el panel derecho, con los cambios subrayados en ');
				frag.createEl('span', { 
					text: 'amarillo',
					attr: { style: 'color: var(--text-highlight-bg, #e6a700); font-weight: var(--font-semibold);' }
				});
				frag.append('.');
			})
		);

		/* ── Requisitos ── */
		containerEl.createEl('div', { cls: 'bt-divider' });

		const reqs = containerEl.createEl('div', { cls: 'bt-setting-card' });
		const reqsHeader = reqs.createEl('div', { cls: 'bt-setting-card-header' });
		reqsHeader.createEl('h3', { text: '⚙ Requisitos' });

		const reqsBody = reqs.createEl('div', { cls: 'bt-setting-card-body' });
		const ul = reqsBody.createEl('ul');
		ul.createEl('li').createEl('p', { text: 'Obsidian Sync o File Recovery deben estar activos y tener historial de versiones.' });
		ul.createEl('li').createEl('p', { text: 'El plugin Version History Diff debe estar instalado como dependencia para ver el diff entre versiones.' });
	}
}

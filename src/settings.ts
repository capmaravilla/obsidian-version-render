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

		containerEl.createEl('h2', {
			text: 'Version Render',
		});

		containerEl.createEl('p', {
			text: 'Muestra el historial de versiones de File Recovery con vista renderizada side-by-side. Cada panel muestra el markdown renderizado como se vería en Obsidian.',
		});

		containerEl.createEl('h3', {
			text: 'Uso',
		});

		containerEl.createEl('p', {
			text: 'Abre una nota y ejecuta el comando "Show version history for active file" desde la paleta de comandos (Ctrl+P / Cmd+P).',
		});
	}
}

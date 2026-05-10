# Version Render for Obsidian

Fork de [obsidian-version-history-diff](https://github.com/kometenstaub/obsidian-version-history-diff) por kometenstaub.

**Versión simplificada que solo muestra File Recovery con vista renderizada side-by-side.**

## Diferencias con el original

| | Original | Version Render |
|---|---|---|
| Backends | Sync, File Recovery, Git | Solo **File Recovery** |
| Vista | Diff (unificado / side-by-side) | **Renderizado markdown** side-by-side |
| Dependencias | diff, diff2html | Ninguna extra |
| Tamaño | ~200KB (comprimido) | ~25KB |

## Requisitos

- Obsidian v1.6.0+
- File Recovery activado (plugin core, viene activado por defecto)

## Uso

1. Abre una nota
2. Ejecuta el comando **"Show version history for active file"** desde la paleta de comandos (`Ctrl+P` / `Cmd+P`)
3. Se abre un modal con:
   - **Panel izquierdo**: lista de versiones antiguas
   - **Centro**: dos paneles con la nota renderizada (izquierda = versión antigua, derecha = versión actual)
   - **Panel derecho**: lista de versiones recientes
4. Haz clic en cualquier versión para actualizar la vista
5. Usa los botones "Render left/right version" para ver una versión individual con opción de restaurar

## Instalación

1. Descarga la [última release](https://github.com/capmaravilla/obsidian-version-render/releases)
2. Extrae `main.js`, `manifest.json`, `styles.css` a `TuBoveda/.obsidian/plugins/obsidian-version-render/`
3. Activa el plugin en Ajustes → Plugins comunitarios

## Desarrollo

```bash
npm install
npm run dev    # Modo watch
npm run build  # Producción
```

## Licencia

MIT

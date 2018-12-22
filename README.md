# Go to definition extension for JupyterLab

Jump to definition of a variable or function in JupyterLab notebook and file editor.

Use <kbd>Alt</kbd> + <kbd>click</kbd> to jump to a definition using your mouse, or <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> keyboard-only alternative.

![Go to definition](https://user-images.githubusercontent.com/5832902/47969769-616a8880-e074-11e8-9da3-6aed3ff9182a.gif)

You can replace the key modifier for mouse click from <kbd>Alt</kbd> to <kbd>Control</kbd>, <kbd>Shift</kbd>, <kbd>Meta</kbd> or <kbd>AltGraph</kbd> in the settings.

The plugin is language-agnostic, though optimized for Python. Better support for other languages is planned (PRs welcome).

## Prerequisites

* JupyterLab

## Installation

```bash
jupyter labextension install @krassowski/jupyterlab_go_to_definition
```

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
npm install
npm run build
jupyter labextension link .
```

To rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```


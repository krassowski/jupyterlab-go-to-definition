# Go to definition extension for JupyterLab

[![Build Status](https://travis-ci.org/krassowski/jupyterlab-go-to-definition.svg?branch=master)](https://travis-ci.org/krassowski/jupyterlab-go-to-definition) [![codebeat badge](https://codebeat.co/badges/89f4b78a-c28e-43a0-9b4c-35d36dbd9d5e)](https://codebeat.co/projects/github-com-krassowski-jupyterlab-go-to-definition-master) [![Binder](https://beta.mybinder.org/badge.svg)](https://mybinder.org/v2/gh/krassowski/jupyterlab-go-to-definition/master?urlpath=lab/tree/examples/demo.ipynb)

Jump to definition of a variable or function in JupyterLab notebook and file editor.

Use <kbd>Alt</kbd> + <kbd>click</kbd> to jump to a definition using your mouse, or <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> keyboard-only alternative.

![Go to definition](https://raw.githubusercontent.com/krassowski/jupyterlab-go-to-definition/master/examples/demo.gif)

You can replace the key modifier for mouse click from <kbd>Alt</kbd> to <kbd>Control</kbd>, <kbd>Shift</kbd>, <kbd>Meta</kbd> or <kbd>AltGraph</kbd> in the settings*.

To jump back to the variable/function usage, use <kbd>Alt</kbd> + <kbd>o</kbd>.

The plugin is language-agnostic, though optimized for Python. Initial support for R was recently implemented.
Support for other languages is possible (PRs welcome).

*) For full list of physical keys mapped to the modifiers (which depend on your Operating System), please see [the MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState).

Safari users: Safari does not implement `MouseEvent.getModifierState` (see [#3](https://github.com/krassowski/jupyterlab-go-to-definition/issues/3)), thus only <kbd>Alt</kbd>, <kbd>Control</kbd>, <kbd>Shift</kbd> and <kbd>Meta</kbd> are supported.

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

To run tests suite:

```bash
npm test
```

### Adding support for additional languages

Support for new languages should be provided by implementation of abstract `LanguageAnalyzer` class (in case of languages which support use of semicolons to terminate statements `LanguageWithOptionalSemicolons` helper class can be utilized).

Each new language class needs to be included in `chooseLanguageAnalyzer` function and the developer needs to verify if `setLanguageFromMime` in `fileeditor.ts` will be able to recognize the language properly.

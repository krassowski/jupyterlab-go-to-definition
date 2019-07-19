# Go to definition extension for JupyterLab

[![Build Status](https://travis-ci.org/krassowski/jupyterlab-go-to-definition.svg?branch=master)](https://travis-ci.org/krassowski/jupyterlab-go-to-definition) [![codebeat badge](https://codebeat.co/badges/89f4b78a-c28e-43a0-9b4c-35d36dbd9d5e)](https://codebeat.co/projects/github-com-krassowski-jupyterlab-go-to-definition-master) [![Binder](https://beta.mybinder.org/badge.svg)](https://mybinder.org/v2/gh/krassowski/jupyterlab-go-to-definition/master?urlpath=lab/tree/examples/demo.ipynb)

Jump to definition of a variable or function in JupyterLab notebook and file editor.

Use <kbd>Alt</kbd> + <kbd>click</kbd> to jump to a definition using your mouse, or <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> keyboard-only alternative.

![Go to definition](https://raw.githubusercontent.com/krassowski/jupyterlab-go-to-definition/master/examples/demo.gif)

You can replace the key modifier for mouse click from <kbd>Alt</kbd> to <kbd>Control</kbd>, <kbd>Shift</kbd>, <kbd>Meta</kbd> or <kbd>AltGraph</kbd> in the settings (see remarks below).

To jump back to the variable/function usage, use <kbd>Alt</kbd> + <kbd>o</kbd>.

The plugin is language-agnostic, though optimized for Python and R.
Support for other languages is possible (PRs welcome).

#### Jumping to definitions in other files

Python:
 - alt-click on the name of a module in Python (e.g. `from x.y import z` - alt-click on `x` or `z`) (new in v0.5)
 - alt-click on a class, function or method imported from any module (except for builtin modules written in C as such do not have a corresponding Python source file) **in a notebook with active Python 3 kernel** (new in v0.6)

R (new in v0.5):
 - alt-click on `source` function (e.g. alt-clicking on `source` in `source('test.R')` will open `test.R` file)
 - alt-click on `.from` of `import::here(x, y, .from='some_file.R')`

Background: there are two ways to solve the definitions location: static analysis and inspection performed in the kernel. The latter is more accurate, although it currently only works in notebooks (not in the file editor). For the implementation overview, please see [the design page](https://github.com/krassowski/jupyterlab-go-to-definition/wiki).

#### Changing the modifiers key from `alt`

Please go to `Settings > Advanced Setting Editor > Go-to-definition` and set a modifier of your choice in the User Preferences panel. For full list of physical keys mapped to the modifiers (which depend on your Operating System), please see [the MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState).

Safari users: Safari does not implement `MouseEvent.getModifierState` (see [#3](https://github.com/krassowski/jupyterlab-go-to-definition/issues/3)), thus only <kbd>Alt</kbd>, <kbd>Control</kbd>, <kbd>Shift</kbd> and <kbd>Meta</kbd> are supported.

## Prerequisites

* JupyterLab

## Installation

```bash
jupyter labextension install @krassowski/jupyterlab_go_to_definition
```

To update already installed extension:

```bash
jupyter labextension update @krassowski/jupyterlab_go_to_definition
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


### Experimental: Language Server Protocol with many more IDE features

Clone and switch to `lsp` branch:

```bash
git clone https://github.com/krassowski/jupyterlab-go-to-definition.git
cd jupyterlab-go-to-definition
git checkout lsp
# dev-dependencies may be needed as well
npm install .
jupyter labextension install .
```

Install servers for languages of your choice. Below are examples for Python (with [pyls](https://github.com/palantir/python-language-server)) and R (with [languageserver](https://github.com/REditorSupport/languageserver)):

```bash
pip install python-language-server[all]
```

```bash
R -e 'install.packages("languageserver")'
```

create file called `servers.yml`:

```yaml
langservers:
  python:
    - pyls
  R:
    - R
    - --slave
    - -e
    - languageserver::run()
```

For the full list of langauge servers see the [Microsoft's list](https://microsoft.github.io/language-server-protocol/implementors/servers/); it may also be good to visit the repository of each server as many provide some additional configuration options.

Then run (TODO: could this be started by the extension?):
```bash
node node_modules/jsonrpc-ws-proxy/dist/server.js --port 3000 --languageServers servers.yml
```

To enable opening files outside of the root directory (the place where you start JupyterLab),
create `.lsp_symlink` and symlink your `home`, `usr`, or any other location which include the files that you wish to make possible to open in there:
```bash
mkdir .lsp_symlink
cd .lsp_symlink
ln -s /home home
ln -s /usr usr
```

If your user does not have sufficient permissions to traverse the entire path, you will not be able to open the file.

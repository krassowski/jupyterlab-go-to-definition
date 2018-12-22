import { Notebook } from "@jupyterlab/notebook";
import { nbformat } from '@jupyterlab/coreutils';

import { CodeJumper } from "./jumper";
import { IJump } from "../jump";
import { _ensureFocus, _findCell, _findTargetCell } from "../notebook_private";


export class NotebookJumper extends CodeJumper {

  notebook: Notebook;

  constructor(notebook: Notebook) {
    super();
    this.notebook = notebook;
  }

  get editors() {
    return this.notebook.widgets.map((cell) => cell.editor)
  }

  get language () {
    let languageInfo = this.notebook.model.metadata.get('language_info') as nbformat.ILanguageInfoMetadata;
    // TODO: consider version of the language as well
    return languageInfo.name;
  }

  jump(jump: IJump) {
    // Using `index = this._findCell(editor.host)` does not work,
    // as the host editor has not switched to the clicked cell yet.
    let index;

    // The mouse event is utilized to workaround Firefox's issue.
    if (jump.mouseEvent !== undefined) {
      index = _findTargetCell(this.notebook, jump.mouseEvent).index;
    } else {
      index = _findCell(this.notebook, jump.origin);
    }

    let {token, cellIndex} = this._findLastDefinition(jump.token, index);

    // nothing found
    if (!token) {
      return;
    }

    // Prevents event propagation issues
    setTimeout(() => {
      this.notebook.deselectAll();
      this.notebook.activeCellIndex = cellIndex;
      _ensureFocus(this.notebook);
      this.notebook.mode = 'edit';

      // find out offset for the element
      let activeEditor = this.notebook.activeCell.editor;

      // place cursor in the line with the definition
      let position = activeEditor.getPositionAt(token.offset);
      activeEditor.setSelection({start: position, end: position});
    }, 0);

  }

}

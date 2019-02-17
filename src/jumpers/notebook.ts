import { Notebook } from "@jupyterlab/notebook";
import { nbformat } from '@jupyterlab/coreutils';

import { CodeJumper } from "./jumper";
import { IJump, IJumpPosition } from "../jump";
import { _ensureFocus, _findCell, _findTargetCell } from "../notebook_private";
import { JumpHistory } from "../history";


export class NotebookJumper extends CodeJumper {

  notebook: Notebook;
  history: JumpHistory;

  constructor(notebook: Notebook, history: JumpHistory) {
    super();
    this.notebook = notebook;
    this.history = history;
  }

  get editors() {
    return this.notebook.widgets.map((cell) => cell.editor)
  }

  get language () {
    let languageInfo = this.notebook.model.metadata.get('language_info') as nbformat.ILanguageInfoMetadata;
    // TODO: consider version of the language as well
    return languageInfo.name;
  }

  jump(position: IJumpPosition) {
    let { token, index } = position;

    // Prevents event propagation issues
    setTimeout(() => {
      this.notebook.deselectAll();
      this.notebook.activeCellIndex = index;
      _ensureFocus(this.notebook);
      this.notebook.mode = 'edit';

      // find out offset for the element
      let activeEditor = this.notebook.activeCell.editor;

      // place cursor in the line with the definition
      let position = activeEditor.getPositionAt(token.offset);
      activeEditor.setSelection({start: position, end: position});
    }, 0);

  }

  jump_to_definition(jump: IJump, index?: number) {

    if (index === undefined)
    {
      // Using `index = this._findCell(editor.host)` does not work,
      // as the host editor has not switched to the clicked cell yet.

      // The mouse event is utilized to workaround Firefox's issue.
      if (jump.mouseEvent !== undefined) {
        index = _findTargetCell(this.notebook, jump.mouseEvent).index;
      } else {
        index = _findCell(this.notebook, jump.origin);
      }
    }

    let {token, cellIndex} = this._findLastDefinition(jump.token, index);

    // nothing found
    if (!token) {
      return;
    }

    this.history.store(this.notebook, {token: jump.token, index: index});
    this.jump({token: token, index: cellIndex})
  }

  jump_back() {
    let previous_position = this.history.recollect(this.notebook);
    if (previous_position)
      this.jump(previous_position)
  }

}

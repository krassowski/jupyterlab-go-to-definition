import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { CodeEditor } from "@jupyterlab/codeeditor";
import { Notebook } from "@jupyterlab/notebook";
import { nbformat } from '@jupyterlab/coreutils';

import { ICodeJumper } from "./jumper";
import { IJump } from "../jump";
import { _ensureFocus, _findCell, _findTargetCell } from "../notebook_private";
import { chooseLanguageAnalyzer } from "../languages/chooser";
import { CodeMirrorExtension } from "../editors/codemirror";


export class NotebookJumper implements ICodeJumper {

  notebook: Notebook;

  constructor(notebook: Notebook) {
    this.notebook = notebook;
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

  /**
   * Find the last definition of given variable.
   */
  private _findLastDefinition(token: CodeEditor.IToken, stopIndex: number) {
    let definitionToken = null;
    let definitionIndex = null;
    const originToken = token;

    for (let i = 0; i <= stopIndex; i++) {
      let cell = this.notebook.widgets[i];

      let analyzerClass = chooseLanguageAnalyzer(this.language);

      // TODO: make this dynamic, depending on editor implementation in use (like with languages)
      let editor = new CodeMirrorExtension(cell.editor as CodeMirrorEditor, this);

      let analyzer = new analyzerClass(editor, token.value);

      // try to find variable assignment
      let definitions = analyzer.getDefinitions();


      if (definitions.length) {
        // Get the last definition / assignment that appears before
        // token of origin (is in an earlier cell or has lower offset),
        let filtered = definitions.filter(
          otherToken => i < stopIndex || otherToken.offset < originToken.offset
        );

        // but ignore ones that are part of the same assignment expression,
        // for example in a cell like this:
        // >>> a = 1
        // >>> a = a + 1
        // clicking on the last 'a' should jump to the first line,
        // and not to beginning of the second line.
        filtered = definitions.filter(otherToken => {
          // If otherToken is in previous cell, we don't need to worry.
          if (i < stopIndex) {
            return true;
          }
          return !analyzer.isTokenInSameAssignmentExpression(
            otherToken, token, cell
          );
        });

        if (filtered.length) {
          definitionToken = filtered[filtered.length - 1];
          definitionIndex = i;
        } else if (!definitionToken && i === stopIndex) {
          // but if there is no definition at all, and we are in the last cell,
          // just return the token of origin (the clicked element), so the
          // editor will focus on the clicked element rather than ignore the
          // click altogether.
          definitionToken = token;
          definitionIndex = i;
        }
      }
    }
    return {
      token: definitionToken,
      cellIndex: definitionIndex
    };
  }
}

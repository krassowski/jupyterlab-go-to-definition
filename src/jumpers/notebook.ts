import { Notebook, NotebookPanel } from "@jupyterlab/notebook";
import { nbformat } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';

import { CodeJumper } from "./jumper";
import { IJump, IJumpPosition } from "../jump";
import { _ensureFocus, _findCell, _findTargetCell } from "../notebook_private";
import { JumpHistory } from "../history";
import { TokenContext } from "../languages/analyzer";
import { Kernel } from "@jupyterlab/services";


export class NotebookJumper extends CodeJumper {

  notebook: Notebook;
  widget: NotebookPanel;

  constructor(notebook_widget: NotebookPanel, history: JumpHistory, document_manager: IDocumentManager) {
    super();
    this.widget = notebook_widget;
    this.notebook = notebook_widget.content;
    this.history = history;
    this.document_manager = document_manager;
  }

  get kernel(): Kernel.IKernelConnection {
    return this.widget.session.kernel;
  }

  get cwd() {
    return this.widget.model.modelDB.basePath.split('/').slice(0, -1).join('/')
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

    // if the definition is in a different file:
    // only support cases like:
    //    "from x import y" (clicking on y opens x.py)
    // or
    //    "y.x" (clicking on y opens y.py)
    let cell_of_origin_editor = this.editors[index];
    let cell_of_origin_analyzer = this._getLanguageAnalyzerForCell(cell_of_origin_editor);

    cell_of_origin_analyzer._maybe_setup_tokens();

    let context = new TokenContext(
      jump.token,
      cell_of_origin_analyzer.tokens,
      cell_of_origin_analyzer._get_token_index(jump.token)
    );

    if(cell_of_origin_analyzer.isCrossFileReference(context)) {
      this.jump_to_cross_file_reference(context, cell_of_origin_analyzer);
    } else {
      // try to get the location of definition from the kernel (for Python - using inspect)

      // if has location:
      // open tab with the file
      this.inspect_and_jump(context, cell_of_origin_analyzer, () => {

        // if it fails, jump to the last definition in the current notebook:
        let {token, cellIndex} = this._findLastDefinition(jump.token, index);

        // nothing found
        if (!token) {
          return;
        }

        this.history.store(this.notebook, {token: jump.token, index: index});
        this.jump({token: token, index: cellIndex})

      });

    }
  }

  jump_back() {
    let previous_position = this.history.recollect(this.notebook);
    if (previous_position)
      this.jump(previous_position)
  }

}

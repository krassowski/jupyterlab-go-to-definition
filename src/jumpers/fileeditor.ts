import { FileEditor } from "@jupyterlab/fileeditor";
import { IJump, IJumpPosition } from "../jump";
import { CodeJumper } from "./jumper";
import { JumpHistory } from "../history";
import { TokenContext } from "../languages/analyzer";
import { IDocumentManager } from "@jupyterlab/docmanager";


export class FileEditorJumper extends CodeJumper {

  editor: FileEditor;
  language: string;
  history: JumpHistory;

  constructor(editor: FileEditor, history: JumpHistory, document_manager: IDocumentManager) {
    super();
    this.document_manager = document_manager;
    this.editor = editor;
    this.history = history;
    this.setLanguageFromMime(editor.model.mimeType);

    editor.model.mimeTypeChanged.connect((session, mimeChanged) => {
      this.setLanguageFromMime(mimeChanged.newValue)
    });
  }

  setLanguageFromMime(mime: string){
    let type = mime.replace('text/x-', '');
    switch (type) {
      case 'rsrc':
        this.language = 'R';
        break;
      default:
        this.language = type;
    }
  }

  get editors() {
    return [this.editor.editor];
  }

  jump(jump_position: IJumpPosition) {

    let { token } = jump_position;

    // TODO: this is common
    // place cursor in the line with the definition
    let position = this.editor.editor.getPositionAt(token.offset);
    this.editor.editor.setSelection({start: position, end: position});
    this.editor.editor.focus()
  }

  jump_to_definition(jump: IJump) {

    let cell_of_origin_editor = this.editors[0];
    let cell_of_origin_analyzer = this._getLanguageAnalyzerForCell(cell_of_origin_editor);

    cell_of_origin_analyzer._maybe_setup_tokens();

    let context = new TokenContext(
      jump.token,
      cell_of_origin_analyzer.tokens,
      cell_of_origin_analyzer._get_token_index(jump.token)
    );

    if(cell_of_origin_analyzer.isCrossFileReference(context))
    {
      this.jump_to_cross_file_reference(context, cell_of_origin_analyzer)
    } else {

      let {token} = this._findLastDefinition(jump.token, 0);

      // nothing found
      if (!token) {
        return;
      }

      this.history.store(this.editor, {token: jump.token});

      this.jump({token: token})
    }

  }

  jump_back() {
    let previous_position = this.history.recollect(this.editor);
    if (previous_position)
      this.jump(previous_position)
  }
}

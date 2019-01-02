import { FileEditor } from "@jupyterlab/fileeditor";
import { IJump } from "../jump";
import { CodeJumper } from "./jumper";


export class FileEditorJumper extends CodeJumper {

  editor: FileEditor;
  language: string;

  constructor(editor: FileEditor) {
    super();
    this.editor = editor;
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

  jump(jump: IJump) {
    let {token} = this._findLastDefinition(jump.token, 0);

    // nothing found
    if (!token) {
      return;
    }

    // TODO: this is common
    // place cursor in the line with the definition
    let position = this.editor.editor.getPositionAt(token.offset);
    this.editor.editor.setSelection({start: position, end: position});
  }

}

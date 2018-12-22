import { FileEditor } from "@jupyterlab/fileeditor";
import { IJump } from "../jump";
import { CodeJumper } from "./jumper";


export class FileEditorJumper extends CodeJumper {

  editor: FileEditor;
  language: string;

  constructor(editor: FileEditor) {
    super();
    this.editor = editor;
    // TODO: language detection
    // editor.context.session.kernel.getSpec().then((spec) => {this.language = spec.language;});
    this.language = 'python'
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

import { FileEditor } from "@jupyterlab/fileeditor";
import { IJump } from "../jump";
import { ICodeJumper } from "./jumper";

export class FileEditorJumper implements ICodeJumper {

  editor: FileEditor;

  constructor(editor: FileEditor) {
    this.editor = editor;
  }

  jump(jump: IJump) {
    // TODO: implement jumping around in here.
  }

}

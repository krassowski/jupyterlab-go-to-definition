import { IJump } from "../jump";

export interface ICodeJumper {

  //editor: CodeEditor.IEditor;

  jump(jump: IJump): void

}

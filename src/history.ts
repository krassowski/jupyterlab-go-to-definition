import { FileEditor } from "@jupyterlab/fileeditor";
import { Notebook } from "@jupyterlab/notebook";
import { IJumpPosition } from "./jump";

export class JumpHistory {

  jump_history: Map<string, Array<IJumpPosition>>;

  constructor() {
    this.jump_history = new Map<string, Array<IJumpPosition>>();
  }

  store(entity: FileEditor | Notebook, position: IJumpPosition) {
    let memories: Array<IJumpPosition>;
    if (!this.jump_history.has(entity.id)) {
      memories = new Array<IJumpPosition>();
      this.jump_history.set(entity.id, memories)
    }
    else {
      memories = this.jump_history.get(entity.id);
    }
    memories.push(position);
  }

  recollect(entity: FileEditor | Notebook): IJumpPosition {
    if (!this.jump_history.has(entity.id)) {
      return null;
    }
    let memories = this.jump_history.get(entity.id);
    return memories.pop()
  }
}


import { CodeEditor } from "@jupyterlab/codeeditor";
import { LanguageWithOptionalSemicolons, IMeaningfulSiblings } from "./analyzer";


export class RAnalyzer extends LanguageWithOptionalSemicolons {

  definitionRules = [
    this.isStandaloneAssignment,
    this.isImport,
    this.isForLoop,
  ];

  isAssignment(token: CodeEditor.IToken): boolean {
    return (
      (token.type === 'operator' && token.value === '=')
      ||
      (token.type === 'operator arrow' && (
        token.value === '<-' || token.value === '<<-'
      ))
    )
  }

  // Matching standalone variable assignment:
  isStandaloneAssignment(siblings: IMeaningfulSiblings) {
    let { previous, next } = siblings;
    return (
      // standard, leftwards assignments:
      (next && this.isAssignment(next))
      ||
      // rightwards assignments:
      (previous && previous.type == 'operator arrow' &&
        (previous.value === '->' || previous.value === '->>')
      )
    )
  }

  // Matching imports:
  isImport(siblings: IMeaningfulSiblings) {
    let { previous } = siblings;
    return (
      previous &&
      previous.type === 'variable' &&
      (previous.value === 'library' || previous.value === 'require')
    )
  }

  // Matching `for` loop and comprehensions:
  isForLoop(siblings: IMeaningfulSiblings) {
    let { previous, next } = siblings;
    return (
      previous &&
      previous.type === 'keyword' &&
      previous.value === 'for' &&
      next &&
      next.type === 'keyword' &&
      next.value === 'in'
    )
  }

}

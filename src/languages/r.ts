import { CodeEditor } from "@jupyterlab/codeeditor";
import { LanguageWithOptionalSemicolons, TokenContext } from "./analyzer";


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
  isStandaloneAssignment(context: TokenContext) {
    let { previous, next } = context;
    return (
      // standard, leftwards assignments:
      (next.exists && this.isAssignment(next))
      ||
      // rightwards assignments:
      (previous.exists && previous.type == 'operator arrow' &&
        (previous.value === '->' || previous.value === '->>')
      )
    )
  }

  // Matching imports:
  isImport(context: TokenContext) {
    let { previous } = context;

    if (
      previous.exists &&
      previous.type === 'variable' &&
      (previous.value === 'library' || previous.value === 'require')
    )
      return true;

    previous = this.traverse_left(previous, ', ');

    if (
      previous.exists && previous.value == 'here' && previous.type == 'variable' &&
      previous.previous.value == '::' && previous.previous.previous.value === 'import'
    )
      return true;

    return false
  }

  // Matching `for` loop and comprehensions:
  isForLoop(context: TokenContext) {
    let { previous, next } = context;
    return (
      previous.exists &&
      previous.type === 'keyword' &&
      previous.value === 'for' &&
      next.exists &&
      next.type === 'keyword' &&
      next.value === 'in'
    )
  }

  guessReferencePath(context: TokenContext) {
    let { next } = context;
    return [next.next.value.slice(0, -1)]
  }

  isCrossFileReference(context: TokenContext): boolean {
    // TODO: unit test
    // case: "source('test.R')" - clicking on source will open test.R

    let { next } = context;

    if (
      context.type == 'variable' &&
      context.value == 'source' &&
      next.exists && next.value == "'" &&
      next.next.exists
    )
      return true;

    return false;
  }

}

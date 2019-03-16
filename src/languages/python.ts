import { CodeEditor } from "@jupyterlab/codeeditor";
import { LanguageWithOptionalSemicolons, IMeaningfulSiblings } from "./analyzer";
import IToken = CodeEditor.IToken;


function evaluateSkippingBrackets(tokens: ReadonlyArray<IToken>, indexShift: number, callback: Function, allowNegativeBrackets=false){

  // here `nextToken` is any token, not necessarily a meaningful one
  let nextToken = tokens[indexShift];

  // unpacking with curly braces is not possible
  const openingBrackets = '([';
  const closingBrackets = ')]';
  let openedBrackets = 0;

  // value of token is equal to an empty string for line breaks

  // a line break is the latest when the search should terminate,
  // unless the left-hand tuple is spread over several lines (in brackets)
  while (nextToken && (nextToken.value !== '' || openedBrackets > 0)) {
    if (nextToken.value === '') {
      // ignoring new-lines (when within brackets)
    } else if (openingBrackets.includes(nextToken.value)) {
      openedBrackets += 1;
    } else if (closingBrackets.includes(nextToken.value) && (allowNegativeBrackets || openedBrackets > 0)) {
      openedBrackets -= 1;
    } else if (nextToken.value === ' ' || nextToken.value === '\t') {
      // ignoring whitespaces
    } else {
      let result = callback(nextToken, indexShift);
      if (result !== undefined)
        return result;
    }
    indexShift += 1;
    nextToken = tokens[indexShift];
  }

  return false;

}


export class PythonAnalyzer extends LanguageWithOptionalSemicolons {

  // idea for improvement:
  //  rename Analyzer to RuleTester, define class Rule, make Rule instances take a callback on init,
  //  possibly add a string with rule's name (it could be displayed as "defined in >for< loop, line 9",
  //  or "imported from xyz module" and in case of multiple hits, user could choose which one to jump to),
  //  and make the rules interface the way to go for other languages.
  definitionRules = [
    this.isStandaloneAssignment,
    this.isImport,
    this.isWithStatement,
    this.isForLoopOrComprehension,
    this.isTupleUnpacking,
    this.isStoreMagic
  ];

  // Matching standalone variable assignment:
  isStandaloneAssignment(siblings: IMeaningfulSiblings) {
    let { next } = siblings;

    return next && this.isAssignment(next)
  }

  // IPython %store -r magic:
  isStoreMagic(siblings: IMeaningfulSiblings, tokens: ReadonlyArray<IToken>, i: number) {
    // this may be much better using regexpr
    // (and more compatible with other engines, but possibly slower)
    let { previous } = siblings;

    if (previous && previous.value === 'r') {
      let r_pos = i - 2;
      let has_r_switch = false;

      while (i - r_pos < 10 && r_pos >= 3) {

        if (tokens[r_pos].value === 'r') {
          if (tokens[r_pos - 1].value === '-') {
            has_r_switch = true;
          }
          break;
        }
        if (tokens[r_pos].value.trim() != '') {
          return false;
        }
        r_pos -= 1;

      }
      if (!has_r_switch) {
        return false;
      }

      let store_pos = r_pos - 2;
      while (r_pos - store_pos < 10 && store_pos >= 1) {
        if (tokens[store_pos].value === 'store') {
          if (tokens[store_pos - 1].value === '%') {
            return true;
          }
        }
        if (tokens[store_pos].value.trim() != '') {
          return false;
        }
        store_pos -= 1;
      }
      return false;
    }
    return false;
  }

  // Matching imports:
  isImport(siblings: IMeaningfulSiblings) {
    let { previous } = siblings;
    return (
      previous &&
      previous.type === 'keyword' &&
      previous.value === 'import'
    )
  }

  // Matching `as`:
  // e.g. `with open('name') as f:` or `except Exception as e:`
  isWithStatement(siblings: IMeaningfulSiblings) {
    let { previous } = siblings;
    return (
      previous &&
      previous.type === 'keyword' &&
      previous.value === 'as'
    )
  }

  // Matching `for` loop and comprehensions:
  isForLoopOrComprehension(siblings: IMeaningfulSiblings) {
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

  isTupleUnpacking(siblings: IMeaningfulSiblings, tokens: ReadonlyArray<CodeEditor.IToken>, i: number) {
    // Matching variables in tuple unpacking:

    // Considering: `a, [b, c], (d, ) = 1, [1, 2], (1,)`, if the tested
    // token is `a`, then the next expected token would be a comma,
    // and then one of following: a variable, an assignment symbol,
    // or an opening bracket (for simplicity brackets can be ignored).
    let commaExpected = true;

    return evaluateSkippingBrackets(tokens, i + 1, (nextToken: IToken, indexShift: number) => {

      if (nextToken.type === 'operator' && nextToken.value === '=') {

        let lastToken: IToken;

        evaluateSkippingBrackets(tokens, indexShift + 1, (nextToken: IToken) => {
          lastToken = nextToken
        });

        // return true unless in a function call
        if ((!lastToken || lastToken.value !== ')'))
          return true;

      }

      if (commaExpected && nextToken.value !== ',') {
        return false
      }

      commaExpected = !commaExpected;
    }, true);

  }
}

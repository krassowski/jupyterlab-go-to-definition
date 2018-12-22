import { LanguageAnalyzer } from "./analyzer";
import { PythonAnalyzer } from "./python";
import { IEditorExtension } from "../editors/editor";


export interface LanguageAnalyzerConstructor {
    new(editor: IEditorExtension, name: string): LanguageAnalyzer;
}


export function chooseLanguageAnalyzer(language: string): LanguageAnalyzerConstructor {
    if (language !== 'python') {
        console.warn(language + ' is not supported yet by go-to-definition extension');
    }
    return PythonAnalyzer;
}

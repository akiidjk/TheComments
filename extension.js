const vscode = require('vscode');
const os = require('os');
const path = require('path');
const fs = require('fs');

function recognize_lang(languageId){
    if(languageId == "javascript"){
        comment_prefix = "//"
    }
    else if(languageId == "python"){
        comment_prefix = "#"
    }
    if(languageId == "javascript"){
        regex_lines = /\/\/(.)(\d+)\/\//g;
        regex_max = /\/\/(.)(M)\/\//g
        regex_sentence_undefine = /\/\/(.)(.{2,})(S)\/\//g
        regex_sentence_define = /\/\/(.)([A-Za-z\s]{2,})(\d+)(SD)\/\//g
        regex_toggle = /\/\/(.{2,})(\|)(\d+)(T)\/\//g
        regex_todo= /\/\/(TODO|todo)(\d+)\/\//g
    }
    else if(languageId == "python"){
        regex_lines = /#(.)(\d+)#/g;
        regex_max = /#(.)(M)#/g
        regex_sentence_undefine = /#(.)(.{2,})(S)#/g
        regex_sentence_define = /#(.)([A-Za-z\s]{2,})(\d+)(SD)#/g
        regex_toggle = /#(.{2,})(\|)(\d+)(T)#/g
        regex_todo= /#(TODO|todo)(\d+)#/g
    }
    else{
        regex_lines = null;
        regex_max =null;
        regex_sentence_undefine= null;
        regex_sentence_define= null;
        regex_toggle= null;
        regex_todo= null;
    }
}

var comment_prefix
var regex_lines = null; 
var regex_max = null;
var regex_sentence_undefine = null;
var regex_sentence_define = null;
var regex_toggle = null;
var regex_todo= null;
function activate(context) {
    vscode.window.showInformationMessage('Extension "the-comments" active!');
    create_keybinds()
    const activeEditor = vscode.window.activeTextEditor;
    let languageId = activeEditor.document.languageId;
    vscode.window.showInformationMessage(`Activate: ${languageId}`);
    
    recognize_lang(languageId)

    let activate_language = vscode.commands.registerCommand('the-comments.language', function () {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            languageId = activeEditor.document.languageId;
            vscode.window.showInformationMessage(`Activate: ${languageId}`);
        } else {
            vscode.window.showErrorMessage('No active document.');
        }
    });
    context.subscriptions.push(activate_language);

    let multilines = vscode.commands.registerCommand('the-comments.multilines', function () {
        gen_multilines()
    });
    context.subscriptions.push(multilines);
    
    function onDidChangeActiveTextEditor(editor) {
        
    }
    vscode.window.onDidChangeActiveTextEditor(event => {
        const document = event.document;
        languageId = document.languageId;
        recognize_lang(languageId)
    });

    vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;
        const edit = new vscode.WorkspaceEdit();
        let match
        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            const text = line.text;
            match = regex_lines.exec(text);
            if (match) {
                const [fullMatch, char, count] = match;
                const range = new vscode.Range(lineIndex, 0, lineIndex, line.text.length);
                const newText = gen_lines(fullMatch, char, count);
                edit.replace(document.uri, range, newText);
            }
            match = regex_max.exec(text)
            if(match){
                const [fullMatch, char] = match;
                const range = new vscode.Range(lineIndex, 0, lineIndex, line.text.length);
                const newText = gen_max(fullMatch, char);
                edit.replace(document.uri, range, newText);
            }
            match = regex_sentence_undefine.exec(text)
            if(match){
                const [fullMatch, char,string] = match;
                const range = new vscode.Range(lineIndex, 0, lineIndex, line.text.length);
                const newText = gen_sentence_undefine(fullMatch, char,string);
                edit.replace(document.uri, range, newText);
            }
            match = regex_sentence_define.exec(text)
            if(match){
                const [fullMatch, char,string,count] = match;
                const range = new vscode.Range(lineIndex, 0, lineIndex, line.text.length);
                const newText = gen_sentence_define(fullMatch, char,string,count);
                edit.replace(document.uri, range, newText);
            }
            match = regex_toggle.exec(text)
            if(match){
                const [fullMatch,char,space,count] = match;
                const range = new vscode.Range(lineIndex, 0, lineIndex, line.text.length);
                const newText = gen_toggle(fullMatch, char,count);
                edit.replace(document.uri, range, newText);
            }
            match = regex_todo.exec(text)
            if(match){
                const [fullMatch,_,count] = match;
                const range = new vscode.Range(lineIndex, 0, lineIndex, line.text.length);
                const newText = gen_todo(fullMatch,count);
                edit.replace(document.uri, range, newText);
            }
        }
        vscode.workspace.applyEdit(edit);
    });
}


function gen_todo(fullMatch, count){
    count = parseInt(count)
    let newText = `${comment_prefix} TODO LIST: `
    for(let i = 0;i < count;i++){
        newText =  newText + `\n${comment_prefix} - ` 
    }
    return newText
}
function gen_toggle(fullMatch, char, count){

    const repeatedString = alternateRepeatChars(char, parseInt(count));
    const newText = `${comment_prefix}${repeatedString}`;
    return newText
}
function alternateRepeatChars(characters, repeatCount) {
    const charArray = characters.split('');
    let result = '';
    let currentIndex = 0;

    for (let i = 0; i < repeatCount; i++) {
        result += charArray[currentIndex];
        currentIndex = (currentIndex + 1) % charArray.length;
    }

    return result;
}
function gen_sentence_undefine(fullMatch, char, string){
    const starsStr = char.repeat(20);
    const newText = `${comment_prefix}${starsStr} ${string} ${starsStr}`;
    return newText
}
function gen_sentence_define(fullMatch, char,string,count){
    count = parseInt(count);
        if(count % 2 == 1){
            count++
        }
    const starsStr = char.repeat(count/2);
    const newText = `${comment_prefix}${starsStr} ${string} ${starsStr}`;
    return newText
}
function gen_max(fullMatch, char){
    const starsStr = char.repeat(getMaxHorizontalPosition());
    const newText = `${comment_prefix}${starsStr}`;
    return newText
}
function getMaxHorizontalPosition(){
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const lineCount = editor.document.lineCount;
        let maxHorizontalPosition = 0;

        for (let lineNumber = 0; lineNumber < lineCount; lineNumber++) {
            const line = editor.document.lineAt(lineNumber);
            const lineLength = line.range.end.character;
            
            if (lineLength > maxHorizontalPosition) {
                maxHorizontalPosition = lineLength;
            }
        }
        return maxHorizontalPosition
    } else {
        vscode.window.showWarningMessage(`No active text editor.`);
    }
}
function gen_multilines(){
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const selection = editor.selection;
        if (!selection.isEmpty) {
            const selectedText = editor.document.getText(selection);
            if(selectedText.includes("//")){
                const replacedText = selectedText.replace("//","/*\n\r*/")
                editor.edit(editBuilder => {
                editBuilder.replace(selection, replacedText);
                });
            }
        } else {
            console.log('No text select.');
        }
        } else {
        console.log('No active text editor.');
        }
}
function gen_lines(fullMatch, char, count){
    const numStars = parseInt(count);
    const starsStr = char.repeat(numStars);
    const newText = `${comment_prefix}${starsStr}`;
    return newText
}

function deactivate() {}


function create_keybinds() {
    const myExtension = vscode.extensions.getExtension('Retr0.the-comments');
    if (myExtension) {
        // Definisci le tue keybindings
        const keybindings = [
            {
                "key": "ctrl+alt+z",
                "command": "the-comments.multilines",
                "when": "editorHasSelection"
            },
        ];
        const userHomeDir = os.homedir();
        const keybindingsPath = path.join(userHomeDir, 'AppData', 'Roaming', 'Code', 'User', 'keybindings.json');
        let existingKeybindings = [];
        if (fs.existsSync(keybindingsPath)) {
            try {
                const fileContent = fs.readFileSync(keybindingsPath, 'utf8');
                const cleanedContent = removeComments(fileContent);
                existingKeybindings = JSON.parse(cleanedContent);
            } catch (error) {
                vscode.window.showErrorMessage(`Error while parsing keybindings.json file: ${error.message}`);
            }
        } else {
            vscode.window.showInformationMessage(`File not exist`);
        }
        if (!existingKeybindings.some(bind => bind.command === "the-comments.multilines")) {
            // Unisci le nuove keybindings con quelle esistenti
            const mergedKeybindings = existingKeybindings.concat(keybindings);
            // Scrivi il nuovo contenuto in keybindings.json
            fs.writeFileSync(keybindingsPath, JSON.stringify(mergedKeybindings, null, 4));
            vscode.window.showInformationMessage('Keybindings successfully added!');
        }
    }
}

function removeComments(content) {
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => !line.trim().startsWith('//'));
    return filteredLines.join('\n');
}

module.exports = {
    activate,
    deactivate
};





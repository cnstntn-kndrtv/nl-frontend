//document.body.style.overflow = "hidden" // lock scroll

var container = document.getElementById('editor-container');

var editor = ace.edit(container);
var EditSession = require("ace/edit_session").EditSession;
var aisession = new EditSession("");
editor.setSession(aisession);

var StatusBar = ace.require("ace/ext/statusbar").StatusBar;
var statusBar = new StatusBar(editor, document.getElementById("statusBar"));

editor.setTheme("ace/theme/pastel_on_dark");
editor.session.setMode("ace/mode/aiscript");
//editor.session.setMode("ace/mode/javascript");

// autocomplete
var langTools = ace.require("ace/ext/language_tools");
var rhymeCompleter = {
    getCompletions: function(editor, session, pos, prefix, callback) {
        if (prefix.length === 0) {
            callback(null, []);
            return
        }
        $.getJSON(
            "http://rhymebrain.com/talk?function=getRhymes&word=" + prefix,
            function(wordList) {
                // wordList like [{"word":"flow","freq":24,"score":300,"flags":"bc","syllables":"1"}]
                callback(null, wordList.map(function(ea) {
                    return {
                        name: ea.word,
                        value: ea.word,
                        score: ea.score,
                        meta: "rhyme"
                    }
                }));
            })
    }
}
var ssPluginCompleter = {
    getCompletions: function(editor, session, pos, prefix, callback) {
        if (prefix.length === 0) {
            callback(null, []);
            return;
        }
        var pluginList = [
            {
                "name": "^first()",
            },{
                "name": "^second()",
            }
        ];
        
        callback(null, pluginList.map(function(pl) {
            return {
                name: pl.name,
                value: pl.name,
                meta: "Plugin"
            }
        }));
    }
}
langTools.addCompleter(rhymeCompleter);
langTools.addCompleter(ssPluginCompleter);


//spellcheck //
ace.require("ace/ext/spellcheck");
// options
editor.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true,
    spellcheck: true,
    showInvisibles: true,
});

//getFile();

function getFile() {
    var xhr = new XMLHttpRequest();
    var content = '';
    xhr.open("GET", "/api/getFile/", true);
    xhr.send();
    xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) return;

        if (xhr.status != 200) {
            alert(xhr.status + ': ' + xhr.statusText);
        } else {
            aisession.setValue(xhr.responseText)
                editor.setValue(xhr.responseText);
        }
    }
}

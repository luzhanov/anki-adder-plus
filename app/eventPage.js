'use strict';

chrome.commands.onCommand.addListener(function (command) {
    var n = +command[7]; //Number part of "add-to-x"
    chrome.tabs.executeScript({
        code: "(typeof window.getSelection===undefined)?undefined:window.getSelection().toString();"
    }, function (selection) {
        console.log("selection onCommand", selection);
        if (selection !== undefined) {
            _gaq.push(['_trackEvent', 'Insert', 'field_command']);
            addSelectionToField(selection[0], n);
        } else {
            alert(chrome.i18n.getMessage("errorCannotshortcuts"));
        }
    });

});

chrome.runtime.onInstalled.addListener(function () {
    updateContextMenu();
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    var menuIdxNumber = +info.menuItemId[3];

    // commented due the Chrome bug - info.selectionText contains no newLines
    //var selectionRaw = info.selectionText;
    //if (selectionRaw !== undefined) {
    //    addSelectionToField(selectionRaw, menuIdxNumber);
    //}

    onContextMenuClick(menuIdxNumber);
});

function onContextMenuClick(menuIdx) {
    chrome.tabs.insertCSS({code: "body {cursor: wait}"});
    chrome.tabs.executeScript({
        code: "(typeof window.getSelection===undefined)?undefined:window.getSelection().toString();"
    }, function (selection) {
        chrome.tabs.insertCSS({code: "body {cursor: default}"});
        if (selection !== undefined) {
            //_gaq.push(['_trackEvent', 'Insert', "field_menu"]);
            addSelectionToField(selection[0], menuIdx);
        } else {
            alert(chrome.i18n.getMessage("errorCannotcontext"));
        }
    });
}

function addSelectionToField(selectionRaw, menuIdx) {
    if (!selectionRaw) {
//        alert("Empty selection, please select again");
        return;
    }

    console.log("Adding selection value to field", selectionRaw, menuIdx);

    var isClozeField = Boolean(menuIdx == localStorage["model-clozeFieldNum:" + localStorage["currentModel"]]);
    var selection = selectionRaw.trim()
        .replace(/(\r|\t|\v|\f)/g, " ")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    //Setting new value or appending to the existing one
    var fieldN = ("field" + menuIdx);
    if (!localStorage[fieldN] || localStorage[fieldN] === "<div><br></div>" || localStorage[fieldN] === "<br>") {
        localStorage[fieldN] = selection.replace(/\n/g, "<br>");
    } else {
        localStorage[fieldN] += "<br><br>" + selection.replace(/\n/g, "<br>");
    }

    //Make the newly added text selected
    localStorage["caretField"] = menuIdx;
    if (isClozeField) { //If field is a cloze field
        var fullLength = convertHtmlToCloze(localStorage[fieldN]).length;
        var insertedLength = convertHtmlToCloze(selection.replace(/\n/g, "<br>")).length;
        localStorage["caretPos"] = (fullLength - insertedLength) + "->" + (fullLength);
    } else {
        var nodes = calculateNodeCount(selection);
        localStorage["caretPos"] = "fromend:" + nodes;
    }
}

function updateContextMenu() { //Same as in ankiweb.js //todo: extract duplicate
    chrome.commands.getAll(function (coms) {
        chrome.contextMenus.removeAll(function () {
            if (localStorage["model-fieldName-" + 1 + ":" + localStorage["currentModel"]] === undefined) {
                //Without field names
                for (var n = 1; n <= 9; n++) {
                    chrome.contextMenus.create({
                        "title": chrome.i18n.getMessage("contextAddtofield") + n + shortcut,
                        "contexts": ["selection"],
                        "id": "add" + n
                    });
                }
            } else {
                for (var n = 1; (localStorage["model-fieldName-" + n + ":" + localStorage["currentModel"]] && n <= 9); n++) {
                    var shortcut = (coms[n]["shortcut"] ? " [" + coms[n]["shortcut"] + "]" : "");
                    chrome.contextMenus.create({
                        "title": chrome.i18n.getMessage("contextAddto") + localStorage["model-fieldName-" + n + ":" + localStorage["currentModel"]] + shortcut,
                        "contexts": ["selection"],
                        "id": "add" + n
                    });
                }
            }
        });
    });
}
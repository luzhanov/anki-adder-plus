'use strict';

chrome.commands.onCommand.addListener(function (command) {
    var n = +command[7]; //Number part of "add-to-x"
    chrome.tabs.executeScript({
        code: "(typeof window.getSelection===undefined)?undefined:window.getSelection().toString();"
    }, function (selection) {
        console.log("selection onCommand", selection);
        if (selection !== undefined)
            addSelectionToField(selection[0], n);
        else
            alert(chrome.i18n.getMessage("errorCannotshortcuts"));
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
        if (selection !== undefined)
            addSelectionToField(selection[0], menuIdx);
        else
            alert(chrome.i18n.getMessage("errorCannotcontext"));
    });
}

function addSelectionToField(selectionRaw, menuIdx) {
    if (!selectionRaw) {
//        alert("Empty selection, please select again");
        return;
    }

    console.log("Adding selection value to field", selectionRaw, menuIdx);

    var isClozeField = Boolean(menuIdx == localStorage["model-clozeFieldNum:" + localStorage["currentModel"]]);
    var selection = selectionRaw.trim().replace(/(\r|\t|\v|\f)/g, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    if (!localStorage["field" + menuIdx] || localStorage["field" + menuIdx] === "<div><br></div>" || localStorage["field" + menuIdx] === "<br>") {
        localStorage["field" + menuIdx] = selection.replace(/\n/g, "<br>");
    } else {
        localStorage["field" + menuIdx] += "<br><br>" + selection.replace(/\n/g, "<br>");
    }

    //Make the newly added text selected
    localStorage["caretField"] = menuIdx;
    if (isClozeField) { //If field is a cloze field
        var fullLength = htmlToClozeText(localStorage["field" + menuIdx]).length;
        var insertedLength = htmlToClozeText(selection.replace(/\n/g, "<br>")).length;
        localStorage["caretPos"] = (fullLength - insertedLength) + "->" + (fullLength);
    } else {
        var splits = selection.split("\n");
        var numberOfTextNodes = 0;
        var numberOfNewLines = splits.length - 1;
        for (var i in splits) {
            if (splits[i] != "")
                numberOfTextNodes++;
        }
        var nodes = numberOfTextNodes + numberOfNewLines;
        localStorage["caretPos"] = "fromend:" + nodes;
    }
}

function updateContextMenu() { //Same as in ankiweb.js
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

function htmlToClozeText(s) { //Same as in marking.js
    if (s === undefined || s == "<br>")
        return "";
    else
        return s.replace(/^<div>(<br><\/div>)?/, "").replace(/<div><br><\/div>/g, "\n").replace(/<div>/g, "\n").replace(/<br>/g, "\n").replace(/<.*?>/g, "").replace(/&nbsp;/g, " ");
}
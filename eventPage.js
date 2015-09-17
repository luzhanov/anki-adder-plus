chrome.commands.onCommand.addListener(function(command) {

	var n = +command[7]; //Number part of "add-to-x"
	chrome.tabs.executeScript({
		code: "(typeof window.getSelection===undefined)?undefined:window.getSelection().toString();"
	}, function(selection) {
		if (selection !== undefined)
		addSelectionToField(selection[0],n);
		else
		alert(chrome.i18n.getMessage("errorCannotshortcuts"));
	});
	
});

chrome.runtime.onInstalled.addListener(function(){
	updateContextMenu();
});

chrome.contextMenus.onClicked.addListener(function(info, tab){
	var n = +info.menuItemId[3];
	//addSelectionToField(info.selectionText,n); - not used since it takes away newlines
	chrome.tabs.executeScript({
		code: "(typeof window.getSelection===undefined)?undefined:window.getSelection().toString();"
	}, function(selection) {
		if (selection !== undefined)
		addSelectionToField(selection[0],n);
		else
		alert(chrome.i18n.getMessage("errorCannotcontext"));
	});
});

function addSelectionToField(selection, n) {
	var isClozeField = Boolean(n == localStorage["model-clozeFieldNum:"+localStorage["currentModel"]]);
	var s = selection;
	s = s.trim().replace(/(\r|\t|\v|\f)/g," ").replace(/</g,"&lt;").replace(/>/g,"&gt;");
	if (!localStorage["field"+n] || localStorage["field"+n]==="<div><br></div>" || localStorage["field"+n]==="<br>")
	localStorage["field"+n] = s.replace(/\n/g, "<br>");
	else
	localStorage["field"+n] += "<br><br>" + s.replace(/\n/g, "<br>");
	
	//Make the newly added text selected
	localStorage["caretField"] = n;
	if (isClozeField) { //If field is a cloze field
		var fullLength = htmlToClozeText(localStorage["field"+n]).length;
		var insertedLength = htmlToClozeText(s.replace(/\n/g, "<br>")).length;
		localStorage["caretPos"] = (fullLength - insertedLength) + "->" + (fullLength);
	} else {
		var splits = s.split("\n");
		var numberOfTextNodes = 0;
		var numberOfNewLines = splits.length-1;
		for (i in splits) {
			if (splits[i] != "")
			numberOfTextNodes++;
		}
		var nodes = numberOfTextNodes + numberOfNewLines;
		localStorage["caretPos"] = "fromend:"+nodes;
	}
}

function updateContextMenu() { //Same as in ankiweb.js
	chrome.commands.getAll(function(coms){
		chrome.contextMenus.removeAll(function(){	
			if (localStorage["model-fieldName-"+1+":"+localStorage["currentModel"]] === undefined) {
				//Without field names
				for (var n=1; n<=9; n++) {
					chrome.contextMenus.create({
						"title" : chrome.i18n.getMessage("contextAddtofield")+n+shortcut,
						"contexts" : ["selection"],
						"id" : "add"+n
					});
				}
			} else {
				for (var n=1; (localStorage["model-fieldName-"+n+":"+localStorage["currentModel"]] && n<=9); n++) {
					var shortcut = (coms[n]["shortcut"]?" ["+coms[n]["shortcut"]+"]":"");
					chrome.contextMenus.create({
						"title" : chrome.i18n.getMessage("contextAddto")+localStorage["model-fieldName-"+n+":"+localStorage["currentModel"]]+shortcut,
						"contexts" : ["selection"],
						"id" : "add"+n
					});
				}
			}
		});
	});
}

function htmlToClozeText(s) { //Same as in marking.js
	if (s===undefined || s=="<br>")
	return "";
	else
	return s.replace(/^<div>(<br><\/div>)?/, "").replace(/<div><br><\/div>/g, "\n").replace(/<div>/g, "\n").replace(/<br>/g, "\n").replace(/<.*?>/g,"").replace(/&nbsp;/g," ");
}
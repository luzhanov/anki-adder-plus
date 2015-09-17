//Global variables
var MAXCOMBOS = 32; //Length of history of combos
var comboLevel=0;
var lastAnchorNode = undefined;
var lastAnchorOffset = 0;
var lastFocusNode = undefined;
var lastFocusOffset = 0;
var ctrl = false;
var shift = false;
var alt = false;
var mouseDown = true; //Keep track of whether the mouse is pressed (only true if mouse was pressed inside a field). Is true at the beginning to prevent placing caret at end
var returnDeck = false; //When the value of the deck list has been changed into a long name this is true which makes it change back when the user goes to the list.

$(document).ready(function(){
	if (!localStorage["option-ID"] || !localStorage["option-password"]) {
		showMessage(1, "errorNoinfo");
		return;
	}
	if (!navigator.onLine) {
		showMessage(0, "errorNointernet");
		return;
	}

	if (localStorage["model0"]===undefined || localStorage["deck0"]===undefined) {
		showMessage(0, "errorLoading");
	} else {
		//Make sure there are non-hidden models and decks
		var allModelsAreHidden = true;
		for (var i=0; localStorage["model"+i]; i++) {
			if (!localStorage["excludedModel:"+localStorage["model"+i]]) {
				allModelsAreHidden = false;
				break;
			}
		}
		if (allModelsAreHidden) {
			showMessage(1, "errorHiddenmodels");
			return;
		}
		var allDecksAreHidden = true;
		for (var i=0; localStorage["deck"+i]; i++) {
			if (!localStorage["excludedDeck:"+localStorage["deck"+i]]) {
				allDecksAreHidden = false;
				break;
			}
		}
		if (allDecksAreHidden) {
			showMessage(1, "errorHiddendecks");
			return;
		}
		
		
		formStart();
	}
			
	connectToAnki(function(updateCurrent, updateModelList, updateDeckList){
		if (arguments.length==1) { //An error occurred
			if (arguments[0] == "errorWronginfo")
			showMessage(1, "errorWronginfo");
			else
			alert(arguments[0]);
			return;
		}
		if ($("#popup").css("display")=="none") {
			formStart();
		}
		$(".loadinggifsmall").stop(true).fadeOut(400);
		if (updateModelList)
		fillModelList();
		if (updateDeckList) {
			detailedDeckNames();
			fillDeckList();
			showDetailedDeckName();
		}
		if (updateCurrent) {
			if ($(document.activeElement).attr("data-fieldnum"))
			saveSelection($(document.activeElement).attr("data-fieldnum"));
			generateFields();
			loadSelection();
		}
	});
})

function formStart() {
	$("#popup").css("display","block");
	$("#message").css("display","none");

	initPopup();
	initToolbar();
	loadTranslation();
	
	fillModelList();
	fillDeckList();
	generateFields();
	updateContextMenu();
	
	loadSelection();
	document.onselectionchange = function(){ saveSelection(false); updateToolbar(); }
	setTimeout(function(){mouseDown=false;},1);
	updateToolbar();
	
	showDetailedDeckName();
}

function initPopup() {
	$(".loadinggifsmall").delay(3000).fadeIn(1000); //If the connection to AnkiWeb has not been initialized after 3 secs, show small loading gif
	$(".addcardbutton").click(function(){
		if ($(this).is(".addcardbuttondown")) {
			//Cancel the adding of a card
			if (currentXhr && currentXhr.readyState != 4) {
				currentXhr.abort();
				currentXhr = null;
				$(".loadinggif").stop(true).css("display","none");
				$(".buttonready").stop(true).css({"display":"block", "opacity":"1"});
				$(this).addClass("addcardbutton").removeClass("addcardbuttondown");
			}
		} else {
			addNote();
		}
	});
	
	//Attach event handlers for change to model and deck lists
	$("select[name='model']").change(function(){
			localStorage["currentModel"] = $(this).val();
			generateFields();
			updateContextMenu();
			localStorage["combo0"] = localStorage["currentModel"]+"::"+localStorage["currentDeck"]; //Save changed combo at zero level
			if (localStorage["combo0"]==localStorage["combo1"])
			comboLevel = 1;
			else
			comboLevel = 0;
		});
	$("select[name='deck']").change(function(){
			localStorage["currentDeck"] = $(this).val();
			var chosenClass = $("[name='deck'] > option[value='"+localStorage["currentDeck"]+"']").attr("class");
			$("select[name='deck']").removeClass().addClass(chosenClass);
			localStorage["combo0"] = localStorage["currentModel"]+"::"+localStorage["currentDeck"]; //Save changed combo at zero level
			if (localStorage["combo0"]==localStorage["combo1"])
			comboLevel = 1;
			else
			comboLevel = 0;
			
		}).on({"focus":function(){
				if (returnDeck) {returnDeck=false; $(this).val(localStorage["currentDeck"]);}
			}, "blur":function(){
				//Use longer names when needed
				showDetailedDeckName();
			}
		});
	$("#tags").val(localStorage["fieldTags"])
			.on({'input propertychange' : function() {
					localStorage["fieldTags"] = $(this).val();
				}, 'blur' : function() {
					saveSelection('tags');
					setTimeout(function(){if (document.activeElement==document.body) saveSelection(-1)},200);
				}
			});
			
	$(document).keydown(function(e){
		ctrl = e.ctrlKey;
		shift = e.shiftKey;
		alt = e.altKey;
		//alert(e.which);
		
		clozeUpdateHoverColor();
		
		if ((ctrl || shift) && e.which==13) { //Ctrl/Shift + Enter
			if ($(".addcardbutton").length) {
				$(":focus").blur();
				addNote();
			}
		}
		
		if (ctrl && shift && e.which == 88) { //Ctrl + Shift + X
			if ($(document.activeElement).is(".htmlfield")) { //From html to normal
				var n = $(document.activeElement).attr("data-fieldnum");
				var start = document.activeElement.selectionStart;
				var end = document.activeElement.selectionEnd;
				
				var content = $(document.activeElement).val();
				
				content.replace(/<.*?>|&\S+?;/g, function(tag, offset){
					if (offset < start && offset+tag.length > start) //If caret is inside html tag, move it to nearby text
					start = offset+tag.length;
					if (offset < end && offset+tag.length > end) //If caret is inside html tag, move it to nearby text
					end = offset+tag.length;
					return tag;
				});
				
				var field = createField(n);
				$(document.activeElement).replaceWith(field);
				saveSelection(n);
				setTimeout(function(){if (document.activeElement==document.body) saveSelection(-1);},280);
				updateScrollWidth();
				
				//Insert temporary "caret" elements for the edge positions of current selection
				if (start==end)
				field.get(0).innerHTML = content.slice(0,start) + "<caret></caret>" + content.slice(start);
				else
				field.get(0).innerHTML = content.slice(0,start) + "<caret></caret>" + content.slice(start,end) + "<caret></caret>" + content.slice(end);
				
				var nodeStart;
				var nodeEnd;
				for (var pos=0; (pos==0 || (pos==1 && start!=end)); pos++) {
					var caretElement = $("caret").first();
					var node = caretElement.get(0);
					while (node && node.nodeType != 3 && $(node).parents(field).length) {
						var child = node;
						if ($(node).text()) {
							for (var i in node.childNodes) {
								if ($(node.childNodes[i]).text()) {
									node = node.childNodes[i];
									break;
								}
							}
						} else {
							if (node.nextSibling !== null) {
								node = node.nextSibling;
							} else {
								while (node.nextSibling === null)
								node = node.parentNode;
								node = node.nextSibling;
							}
						}
					}
					if (!$(node).parents().is(field) && pos==0) //If node is outside of the field, and is the start node
					node = null;
					
					if (pos==0) {
						nodeStart = node;
						if (start==end)
						nodeEnd = node;
						caretElement.remove();
					} else {
						nodeEnd = node;
						$("caret").remove();
					}
				}
				
				if (field.get(0).innerHTML.replace(/<caret><\/caret>/g,"") != field.get(0).innerHTML)
				field.get(0).innerHTML = field.get(0).innerHTML.replace(/<caret><\/caret>/g,"");
				
				$(field).focus();
				
				if (node) {
					anchorNode = nodeStart;
					focusNode = nodeEnd;
					anchorOffset=0;
					focusOffset=0;

					var s = window.getSelection();
					s.collapse(anchorNode, anchorOffset);
					s.extend(focusNode, focusOffset);
				} else {
					placeCaretAtEnd(n);
				}
				
			} else //From normal to html
			if ($(document.activeElement).is(".field")) {
				editHTML($(document.activeElement).attr("data-fieldnum"));
			}
		}
		
		if (ctrl && shift && e.which == 67) { //Ctrl + Shift + C
			// Adds cloze brackets around selection
			
			var text; //Text in the field
			var content; //Selected content that should be inside {{}} brackets.
			
			e.preventDefault();
			var field = $(document.activeElement);
			if (field.is(".field")) {
				text = field.text();
			} else if (field.is(".htmlfield, #clozearea")) {
				text = field.val();
			} else {
				return;
			}
			
			var c;
			var used_c = [];
			var highest_c = 1;
			text.replace(/{{c([1-9]|10)::(.+?)}}/g, function(str, n, cloze){
				n = Number(n);
				used_c[n] = true;
				if (n>highest_c)
				highest_c = n;
				return str;
			});
			if (alt) {
				c = highest_c;
			} else {
				for (var i=1; i<=10; i++) {
					if (!used_c[i]) {
						c = i;
						break;
					}
				}
			}
			if (c === undefined)
			return;
			
			if (field.is(".field")) {
				var s = window.getSelection();
				content = s.toString();
				if (content) {
					document.execCommand("insertText", false, "{{c"+c+"::"+content+"}}");
				} else {
					document.execCommand("insertText", false, "{{c"+c+"::}}");
					s.modify("move", "backward", "character"); //Move the caret to {{c1::|}}
					s.modify("move", "backward", "character"); //                        ^
				}
			} else {
				var area = field.get(0);
				var sp = area.selectionStart;
				var ep = area.selectionEnd;
				content = area.value.substring(sp,ep);
				
				var event = document.createEvent('TextEvent');
				var input = "{{c"+c+"::"+content+"}}";
				event.initTextEvent('textInput', true, true, null, input);
				area.dispatchEvent(event);
				if (sp==ep) { //If no text was selected
					var pos = sp + ("{{c"+c+"::").length;
					area.setSelectionRange(pos, pos); //Move caret
				}
			}
		}
		
		var a = $(document.activeElement);
		var fieldnum = (a.is(".field")?a.attr("data-fieldnum"):a.is("#clozearea")?clozeN:a.is("#tags")?"Tags":0);
		if (fieldnum)
		var currentFieldIsEmpty = ((clozeN==fieldnum && $(a).val()=="") || (fieldnum=="Tags" && localStorage["fieldTags"]=="") || ($(".field[data-fieldnum="+fieldnum+"]").text()=="" && $(".field[data-fieldnum="+fieldnum+"]").html()!==null && $(".field[data-fieldnum="+fieldnum+"]").html().split("br").length<3)); // !localStorage["field"+fieldnum];
		if (document.activeElement==document.body || currentFieldIsEmpty) {
			if (e.which==38) { //Up
				if (localStorage["combo"+(+comboLevel+1)]) {//If there is a higher level
					var prevLevel = comboLevel;
					if (comboLevel==0 && localStorage["combo0"]==localStorage["combo1"])
					comboLevel++; //If 0 and 1 are equal, move two steps
					comboLevel++;
					if (!loadCombo((comboLevel==1), "up")) //If you go from 0 to 1, save current configuration to level zero
					comboLevel = prevLevel;
				}
			}
			if (e.which==40) { //Down
				if (comboLevel>1 || (comboLevel==1 && localStorage["combo0"]!=localStorage["combo1"])) {
					var prevLevel = comboLevel;
					comboLevel--;
					if (!loadCombo(false, "down")) //Current configuration is not saved
					comboLevel = prevLevel;
				}
			}
		}
		
		if (e.which==118) {//F7
			executeTag("foreColor");
			e.preventDefault();
		} else if (e.which==119) {//F8
			executeTag("pickColor");
			e.preventDefault();
		}
		
		if (ctrl) {
			var preventDefault = true;
			if (e.which==66) //Ctrl+B
			executeTag("bold");
			else if (e.which==73) //Ctrl+I
			executeTag("italic");
			else if (e.which==85) //Ctrl+U
			executeTag("underline");
			else if (e.which==187) //Ctrl++
			executeTag("superscript");
			else if (e.which==48) //Ctrl+0
			executeTag("subscript");
			else if (e.which==82) //Ctrl+R
			executeTag("removeFormat");
			else if (e.which==77) {//Ctrl+N
				if ($("select[name=model]").is(":focus"))
				loadSelection();
				else
				$("select[name=model]").focus();
			} else if (e.which==68) {//Ctrl+D
				if ($("select[name=deck]").is(":focus"))
				loadSelection();
				else
				$("select[name=deck]").focus();
			} else
			preventDefault = false;
			if (preventDefault)
			e.preventDefault();
		}
	}).keyup(function(e){
		ctrl = e.ctrlKey;
		alt = e.altKey;
		shift = e.shiftKey;
		
		clozeUpdateHoverColor();
	});
	
	$(window).mouseup(function(){
			if ($("#clozefield").length)
			globalMouseUp(); //Works even outside the window
			mouseDown = false;
		});
}

function generateFields() {
	$("#fields").empty();
	oldClozeN = clozeN;
	clozeN = undefined;
	var id = $("select[name=model]").val();
	for (var n=1; localStorage["model-fieldName-"+n+":"+id]; n++) {
		$("#fields")
			.append($(document.createElement("div"))
				.addClass("fname")
				.append(document.createTextNode(localStorage["model-fieldName-"+n+":"+id]))
			);
		if (localStorage["model-clozeFieldNum:"+id]==n) { //Clozefield
			clozeN = n; //Save field number
			appendClozefield();
			changedWhileCloze = false;
		} else {
			if (n == oldClozeN && changedWhileCloze) {//If changed from clozefield to normal field, prevent </>/& from being interpreted as html, and convert \n to <br>. Only if it was actually changed.
				if (localStorage["field"+n]!==undefined)
				localStorage["field"+n] = localStorage["field"+n].replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
			}
			appendField(n);
		}
	}
	updateScrollWidth();
}

function appendClozefield() {
	$("#fields .fname").last().attr("title", chrome.i18n.getMessage("tooltipClozefield")); //Add description

	$("#fields").append($(document.createElement("textarea")).attr("id","clozearea").val(htmlToClozeText(localStorage["field"+clozeN])));

	if (clozeFieldIsEmpty()) { //If not empty
		clozeArea();
	} else {
		clozeField();
	}
}

function appendField(n) {
	$("#fields").append(createField(n));
}

function createField(n) {
	//Creates field number 'n' and returns the jQuery object
	
	var model = localStorage["currentModel"];
	var field = $(document.createElement("div"));
	var font = localStorage["model-fieldFont-"+n+":"+model];
	var size = localStorage["model-fieldSize-"+n+":"+model];
	var rtl = localStorage["model-fieldRtl-"+n+":"+model];
	var content = localStorage["field"+n];
	if (!content)
	content = "";

	field
		.addClass("field")
		.attr({ contenteditable : true, "data-fieldnum" : n })
		.val(content)
		.css({"font-family" : font + ", sans-serif",
			  "font-size" : size + "px",
			  "direction" : rtl?"rtl":"ltr"
			  })
		.html(content)
		.on({'paste' : function(e) {
				var text = e.originalEvent.clipboardData.getData('text/plain');
				if (!validPaste(text, font, size)) { //Prevent pasting formatted html, other than between fields with the same font and size
					e.preventDefault();
					document.execCommand('insertText', false, text.replace(/\r/g," "));
				}
			}, 'copy cut' : function() {
				localStorage["lastCopyText"] = window.getSelection();
				localStorage["lastCopyFont"] = font;
				localStorage["lastCopySize"] = size;
			}, 'input propertychange' : function() {
				localStorage["field"+n] = $(this).html();
				updateScrollWidth(); //If the editing added a new line, the new height may create a scrollbar. In this case, the width should decrease to leave room for it.
			}, 'blur' : function() {
				saveSelection(n);
				setTimeout(function(){if (document.activeElement==document.body) saveSelection(-1)},200);
			}, 'focus' : function() {
				if (!mouseDown) { //Means the field got focus with the tab key
					placeCaretAtEnd(n);
				}
			}, 'mousedown' : function() {
				mouseDown = true;
			}
		});
	return field;
}

function editHTML(n) {
	//Replaces a field with a corresponding html field and returns the jQuery object
	
	var id = $(".field[data-fieldnum="+n+"]");
	var model = localStorage["currentModel"];
	
	var field = $(document.createElement("textarea"));
	
	var content = $(id).html();
	var contentWithCaret;
	
	var s = window.getSelection();

	//Get start position of current selection
	s.getRangeAt(0).insertNode($("<caret />").get(0)); //Insert a temporary "caret" element at range start
	contentWithCaret = $(id).html();
	var posStart = contentWithCaret.indexOf("<caret>");
	$("caret").remove();
	
	//Get end position
	s.collapse(s.getRangeAt(0).endContainer, s.getRangeAt(0).endOffset); //Move start point to end
	s.getRangeAt(0).insertNode($("<caret />").get(0)); //Insert a temporary "caret" element at range start, now equal to range end
	contentWithCaret = $(id).html();
	var posEnd = contentWithCaret.indexOf("<caret>");
	$("caret").remove();
	
	field
		.addClass("htmlfield")
		.val(content)
		.attr("data-fieldnum", n)
		.on({'input propertychange' : function() {
				localStorage["field"+n] = $(this).val();
				updateAreaHeight(field.get(0));
				updateScrollWidth();
			}, 'blur' : function() {
				$(this).replaceWith(createField(n));
				saveSelection(n);
				setTimeout(function(){if (document.activeElement==document.body) saveSelection(-1);},280);
				updateScrollWidth();
			}
		});
	
	$(id).replaceWith(field);
	updateAreaHeight(field.get(0));
	updateScrollWidth();
	
	field.get(0).setSelectionRange(posStart, posEnd);
}

function updateAreaHeight(id) { //Adjust area to fit content
	var off = 10; //Padding over and under
	$(id).css("height", 0);
	$(id).css("height", id.scrollHeight-off);
}

function validPaste(text, font, size) {
	//Checks whether pasting comes from a field with the same font and size
	return (text !== undefined && localStorage["lastCopyText"] !== undefined && text.replace(/\s/g,"") == localStorage["lastCopyText"].replace(/\s/g,"") && font == localStorage["lastCopyFont"] && size == localStorage["lastCopySize"])
}

function saveSelection(fieldnum) {
	//Saves caret position/selection range, based on relative indexes, so that it remains the same when the popup is reopened
	
	if (fieldnum==false) {//Quick save of the selection's nodes and offsets
		var tagsId = document.getElementById("tags");
		var clozeId = document.getElementById("clozearea");
		if (document.activeElement == tagsId) {
			lastAnchorOffset = tagsId.selectionStart;
			lastFocusOffset = tagsId.selectionEnd;
		} else if (document.activeElement == clozeId) {
			lastAnchorOffset = clozeId.selectionStart;
			lastFocusOffset = clozeId.selectionEnd;
		} else {
			var s = window.getSelection();
			lastAnchorNode = s.anchorNode;
			lastAnchorOffset = s.anchorOffset;
			lastFocusNode = s.focusNode;
			lastFocusOffset = s.focusOffset;
		}
	} else if (fieldnum==-1) { //Save empty selection to localStorage
		localStorage["caretPos"] = 0;
		localStorage["caretField"] = 0;
	} else if (fieldnum=='tags') { //Save tags field to localStorage
		localStorage["caretPos"] = lastAnchorOffset;
		if (lastFocusOffset != lastAnchorOffset)
		localStorage["caretPos"] += "->"+lastFocusOffset;
		localStorage["caretField"] = "tags";
	} else if (fieldnum==clozeN) { //Save clozearea to localStorage
		localStorage["caretPos"] = lastAnchorOffset;
		if (lastFocusOffset != lastAnchorOffset)
		localStorage["caretPos"] += "->"+lastFocusOffset;
		localStorage["caretField"] = clozeN;
	} else { //Save to localStorage
		var anchorParentIndex = $(".field[data-fieldnum="+fieldnum+"]").find("*").index($(lastAnchorNode).parent());
		var anchorNodeIndex = $(lastAnchorNode).parent().contents().index($(lastAnchorNode));
		var anchorOffset = lastAnchorOffset;
		var focusParentIndex = $(".field[data-fieldnum="+fieldnum+"]").find("*").index($(lastFocusNode).parent());
		var focusNodeIndex = $(lastFocusNode).parent().contents().index($(lastFocusNode));
		var focusOffset = lastFocusOffset;
		localStorage["caretPos"] = anchorParentIndex+":"+anchorNodeIndex+":"+anchorOffset;
		if (anchorParentIndex!=focusParentIndex || anchorNodeIndex!=focusNodeIndex || anchorOffset!=focusOffset)
		localStorage["caretPos"] += "->"+focusParentIndex+":"+focusNodeIndex+":"+focusOffset;
		localStorage["caretField"] = fieldnum;
	}
}

function loadSelection() {
	//Loads selection from localStorage

	if (!localStorage["caretPos"] || !localStorage["caretField"] || localStorage["caretField"]==0)
	return;
	var pos = localStorage["caretPos"].split(/:|->/);
	var field = localStorage["caretField"];
	if (field == "tags") {
		$("#tags").focus();
		var id = document.getElementById("tags");
		if (pos.length == 1)
		id.setSelectionRange(pos[0],pos[0]);
		else if (pos.length == 2)
		id.setSelectionRange(pos[0],pos[1]);
		return;
	}
	if (field == clozeN) {
		if ($("#clozefield").length)
		clozeArea();
		var id = document.getElementById("clozearea");
		if (!id)
		return;
		$(id).focus();
		if (pos.length == 1)
		id.setSelectionRange(pos[0],pos[0]);
		else if (pos.length == 2)
		id.setSelectionRange(pos[0],pos[1]);
		return;
	}
	$(".field[data-fieldnum="+field+"]").focus();
	if ($(".field[data-fieldnum="+field+"]").text()=="") //Prevent missing caret
	return;
	var s = window.getSelection();
	if (pos[0] == "fromend") { //Newly added text
		var contents = $(".field[data-fieldnum="+field+"]").contents();
		var len = contents.length;
		anchorNode = contents[len-pos[1]];
		anchorOffset = 0;
		focusNode = contents[len-1];
		focusOffset = contents[len-1].length;
		s.collapse(anchorNode, anchorOffset);
		s.extend(focusNode, focusOffset);
		return;
	}
	if (pos.length >= 3) {
		if (pos[0]==-1)
		anchorNode = $(".field[data-fieldnum="+field+"]").contents().eq(pos[1]).get(0);
		else
		anchorNode = $(".field[data-fieldnum="+field+"]").find("*:eq("+pos[0]+")").contents().eq(pos[1]).get(0);
		anchorOffset = pos[2];
		
		s.collapse(anchorNode, anchorOffset);
	}
	if (pos.length == 6) {
		if (pos[3]==-1)
		focusNode = $(".field[data-fieldnum="+field+"]").contents().eq(pos[4]).get(0);
		else
		focusNode = $(".field[data-fieldnum="+field+"]").find("*:eq("+pos[3]+")").contents().eq(pos[4]).get(0);
		focusOffset = pos[5];
		
		if (focusNode)
		s.extend(focusNode, focusOffset);
	}
}

function placeCaretAtEnd(n) {
	if (n==clozeN) {
		var id = document.getElementById("clozearea");
		var pos = $("#clozearea").val().length;
		id.setSelectionRange(pos, pos);
	} else {
		var element = $(".field[data-fieldnum="+n+"]").get(0);
		var range = document.createRange();
        range.selectNodeContents(element); //Select everything
        range.collapse(false); //Collapse to end
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(range);
	}
}

function fillModelList() {
	if (!$("select[name='model']").attr("disabled"))
	$("select[name='model']").empty(); //Remove old items from list
	
	for (var n=0; localStorage["model"+n]; n++) {
		if (!localStorage["excludedModel:"+localStorage["model"+n]]) { //Ignore excluded models
			$("select[name='model']")
				.removeAttr("disabled")
				.append($(document.createElement("option"))
					.attr({ value : localStorage["model"+n] })
					.append(document.createTextNode(localStorage["model-name:"+localStorage["model"+n]]))
				);	
		}
	}
	if (localStorage["currentModel"]) {
		$("select[name='model']").val(localStorage["currentModel"]);
	}
	localStorage["currentModel"] = $("select[name='model']").val(); //Avoid non-existing values
	
}

function fillDeckList() {
	if (!$("select[name='deck']").attr("disabled"))
	$("select[name='deck']").empty(); //Remove old items from list
	
	for (var n=0; localStorage["deck"+n]; n++) {
		if (!localStorage["excludedDeck:"+localStorage["deck"+n]]) { //Ignore excluded decks
			var lvl = localStorage["deck"+n].match(/::/g);
			if (lvl!=null) {
				lvl = lvl.length; //Current sub-level
			} else {
				lvl = 0;
			}
			var endName = /(::|^)([^::]*)$/.exec(localStorage["deck"+n])[2];
			var white = "";
			for (var i=0; i<lvl; i++) {
				white+="&nbsp;&nbsp;&nbsp;";
			}
			var className = "dlvl_"+(lvl<=3?lvl:3);
			$("select[name='deck']")
				.removeAttr("disabled")
				.append($(document.createElement("option"))
					.attr({ value : localStorage["deck"+n] })
					.addClass(className)
					.append(white).append(document.createTextNode(endName))
				);
		}
	}
	
	//Add hidden option, to show detailed deck name when necessary
	$("select[name='deck']")
		.removeAttr("disabled")
		.append($(document.createElement("option"))
			.attr({ value : "\n",
					id : "hiddendeck",
					disabled : "disabled"
					})
			.css("display","none")
			.addClass(className)
		);
	
	if (localStorage["currentDeck"]) {
		$("select[name='deck']").val(localStorage["currentDeck"]);
		var chosenClass = $("select[name='deck'] > option[value='"+localStorage["currentDeck"]+"']").attr("class");
		$("select[name='deck']").removeClass().addClass(chosenClass);
	}
	localStorage["currentDeck"] = $("select[name='deck']").val(); //Avoid non-existing values
}

function saveCombo() {
	var c = localStorage["currentModel"]+"::"+localStorage["currentDeck"];
	var i=1;
	var hole = -1; //Position where the 'hole' occurs, where the filling should start
	while (localStorage["combo"+i]) {
		if (localStorage["combo"+i]==c) {//If the combo is already somewhere in the list, remove it, and fill the hole
			hole = i;
			break;
		}
		i++;
	}
	if (hole==-1) //If it's not in the list, put it at the unused position i
	hole = i;
	if (hole>MAXCOMBOS) //If maximum number of combos is reached, the highest combo is disposed
	hole--;
	for (i=hole; i>1; i--) {
		localStorage["combo"+i] = localStorage["combo"+(+i-1)];
	}
	localStorage["combo1"] = c; //Put new combo foremost
}

function loadCombo(saveCurrent, direction) {
	if (!localStorage["combo"+comboLevel])
	return false; //Cannot load non-existent combo

	var model = /^\d+/.exec(localStorage["combo"+comboLevel])[0];
	var deck = localStorage["combo"+comboLevel].substring(model.length+2);
	while ((!$("select[name=model] > option[value='"+model+"']").length || !$("select[name=deck] > option[value='"+deck+"']").length || (comboLevel!=0 && localStorage["combo"+comboLevel]==localStorage["combo0"])) && comboLevel>=0 && comboLevel<=MAXCOMBOS) {
		comboLevel += (direction=="up"?1:-1);
		if (!localStorage["combo"+comboLevel]) {
			comboLevel = -1;
		} else {
			model = /^\d+/.exec(localStorage["combo"+comboLevel])[0];
			deck = localStorage["combo"+comboLevel].substring(model.length+2);
		}
	}
	if (!localStorage["combo"+comboLevel])
	return false; //Cannot load non-existent combo
	
	if (saveCurrent) //If you go from level 1 to 0, the current configuration is saved at 0
	localStorage["combo0"] = localStorage["currentModel"]+"::"+localStorage["currentDeck"]; //Save previous combo at zero level
	
	$("select[name=model]").val(model);
	localStorage["currentModel"] = model;
	
	//Save caret position
	var a = $(document.activeElement);
	var fieldnum = (a.is(".field")?a.attr("data-fieldnum"):a.is("#clozearea")?clozeN:a.is("#tags")?"tags":0);
	if (fieldnum) {
		localStorage["caretField"] = fieldnum;
		localStorage["caretPos"] = 0;
	}
	
	generateFields();
	updateContextMenu();
	
	//Load caret position
	loadSelection();
	
	$("select[name=deck]").val(deck);
	localStorage["currentDeck"] = deck;
	var chosenClass = $("select[name='deck'] > option[value='"+localStorage["currentDeck"]+"']").attr("class");
	$("select[name='deck']").removeClass().addClass(chosenClass);
	
	//Use longer names when needed
	showDetailedDeckName();
	
	return true; //Succeeded
}

function allFieldsAreEmpty() {
	for (var n=1; localStorage["model-fieldName-"+n+":"+localStorage["currentModel"]]; n++) {
		if (localStorage["field"+n] && /\S/.test(localStorage["field"+n]) && (n!=clozeN || !clozeFieldIsEmpty()))
		return false;
	}
	return true;
}

function clozeFieldIsEmpty() {
	//Empty counts as what will not be displayed properly in the clozefield
	return (!localStorage["field"+clozeN] || localStorage["field"+clozeN]==="<br>" || localStorage["field"+clozeN]==="<div><br></div>" || localStorage["field"+clozeN]===" " || localStorage["field"+clozeN]==="&nbsp;");
}

function clearFields() {
	var curMod = localStorage["currentModel"];
	for (var n=1; localStorage["model-fieldName-"+n+":"+curMod]; n++) {
		if (!localStorage["model-fieldSticky-"+n+":"+curMod]) {
			if (clozeN == n) {
				$("#clozefield").empty();
				clozeArea();
			} else {
				$(".field[data-fieldnum="+n+"]").empty();
			}
		}
	}
	for (key in localStorage) {
		if (/^field\d$/.test(key) && !localStorage["model-fieldSticky-"+key.substr(5)+":"+curMod]) {
			localStorage.removeItem(key);
		}
	}
}

function updateScrollWidth() {
	//If the editing added a new line, the new height may create a scrollbar. In this case, the width should decrease to leave room for it.
	if ($("#fields").css("height")=="492px") {
		$("#fields").css("margin-right","8px");
		$("#fields > .field, #fields > .htmlfield").css("width", "450px"); //To fit the scrollbar
		$("#clozefield").css("width", "450px");
		$("#clozearea").css("width", "450px");
		$("#toolbar").css("right", "26px");
	} else {
		$("#fields").css("margin-right","0");
		$("#fields > .field, #fields > .htmlfield").css("width", "472px"); //Normal mode, without scrollbar
		$("#clozefield").css("width", "472px");
		$("#clozearea").css("width", "472px");
		$("#toolbar").css("right", "0");
	}
}

function initToolbar() {
	//Init color selection
	if (localStorage["toolbarColor"]==undefined)
	localStorage["toolbarColor"] = "#0000ff";
	$("#colordisplay").css("background-color",localStorage["toolbarColor"]);
	$("input#colorpicker").on("input propertychange", function(){
		localStorage["toolbarColor"] = $(this).val();
		$("#colordisplay").css("background-color",localStorage["toolbarColor"]);
	}).val(localStorage["toolbarColor"]);
	
	
	$("#toolbar button").on({
		"mousedown" : function(e){
			e.preventDefault(); //Prevent unfocusing the field
		}, "click" : function(e){
			e.preventDefault(); //Prevent unfocusing the field
			
			var tag = $(this).attr("id");
			executeTag(tag);
		}
	});
	
}

function executeTag(tag) {
	if (tag=="pickColor") {
		$("#colorpicker").click();
	} else if (tag=="foreColor") {
		document.execCommand(tag, false, localStorage["toolbarColor"]);
	} else if (tag=="removeFormat") {		
		//Make it neutralize caret formating too:
		if ($("#bold").attr("data-down")) {
			document.execCommand("bold", false, null);
			updateToolbar("bold", false);
		}
		if ($("#italic").attr("data-down")) {
			document.execCommand("italic", false, null);
			updateToolbar("italic", false);
		}
		if ($("#underline").attr("data-down")) {
			document.execCommand("underline", false, null);
			//Hack needed to solve underline bug:
			var active = $(document.activeElement);
			saveSelection(active.attr("data-fieldnum"));
			if (active.text()=="")
			$(".field[data-fieldnum="+active.attr("data-fieldnum")+"]").focus();
			updateToolbar("underline", false);
		}
		if ($("#superscript").attr("data-down")) {
			document.execCommand("superscript", false, null);
			updateToolbar("superscript", false);
		}
		if ($("#subscript").attr("data-down")) {
			document.execCommand("subscript", false, null);
			updateToolbar("subscript", false);
		}
		document.execCommand("foreColor", false, "#000000");
		
		document.execCommand(tag, false, null); //This only works on selected text
	} else {
		var oldDown = document.queryCommandState(tag);
		document.execCommand(tag, false, null);
		updateToolbar(tag, !oldDown);
	}
}

function updateToolbar(tag, down) {
	if ($(document.activeElement).is(".field")) {
		downUnDownButtons("bold","italic","underline","superscript","subscript");
		if (arguments.length==2) { //Force button state
			if (down)
			$("#"+tag).attr("data-down",true);
			else
			$("#"+tag).removeAttr("data-down");
		} 
		$("#toolbar button").removeAttr("disabled");
	} else {
		//Make all buttons grayed out
		$("#toolbar button").attr("disabled","disabled");
	}
}

function downUnDownButtons() {
	for (var i in arguments) {
		var tag = arguments[i];
		if (document.queryCommandState(tag))
		$("#"+tag).attr("data-down",true);
		else
		$("#"+tag).removeAttr("data-down");
	}
}

function showDetailedDeckName() {
	var d = localStorage["currentDeck"];
	if (localStorage["detailedDeckName:"+d]) {
		$("select[name=deck]").val("\n");
		$("#hiddendeck").html(localStorage["detailedDeckName:"+d]);
		returnDeck = true; //Next time the user tries to change deck, return its position to the real deck in the list.
	}
}

function showMessage(type, message) {
	//Shows an error message instead of the popup form.
	//type: 0 = normal message, 1 = message linking to options
	var content = chrome.i18n.getMessage(message);
	$("#popup").css("display","none");
	$("#message").css("display","block");
	$("#message").empty().append($(document.createElement("div"))
			.addClass("message"));
	if (type==0) {
		$(".message").html(content);
	} else if (type==1) {
		$(".message").on("click",function(){
			chrome.tabs.create({url: "options.html"});
				window.close();
			})
			.append($(document.createElement("div"))
				.addClass("messagelink").html(content)
				.on("mouseover",function(){
					$(".message").css("background-color", "#f7f7f7");
			})
				.on("mouseout",function(){
					$(".message").css("background-color", "#ededed");
			})
		);
	}
}
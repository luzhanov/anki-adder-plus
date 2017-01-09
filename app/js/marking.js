'use strict';

var clozeN; //The field number of the cloze field
var oldClozeN; //The last clozeN
var markStart; //The id of the word you pressed before dragging to highlight further words
var markEnd; //The id of the word you hover, constituting the other end of the highlight
var preventUnmarkingOnMouseup = false; //Prevents unmarking on the next mouseup, is true when the word just pressed was a non-cloze turned into a cloze
var markingC = "1"; //Current marking color
var lastC = ["1"]; //List of what all used c-colors in order of use.
var clozeCaret = null; //Used when setting the caret to the corresponding position from clozefield to clozearea
var changedWhileCloze = false; //True if clozefield has been changed since generateFields()

function splitText(id, searchForClozeMarkup, text) {
    //2 arguments: Splits the span 'id'
    if (arguments.length == 2) {
        splitText(id,
            searchForClozeMarkup,
            id.innerHTML.replace(/&nbsp;/g, ' ')
                .replace(/(\r|\t|\v|\f)/g, " ")
                .replace(/&amp;/g, '&')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>'));
        $(id).remove();
    } else {
        //3 arguments: Splits in text before the span 'id'
        if (searchForClozeMarkup) {
            var r = /{{c([1-9]|10)::(.+?)}}/.exec(text);
            if (r) {
                var txt1, txt2, pos;
                pos = text.search(r[0]);
                txt1 = text.substring(0, pos);
                txt2 = text.substring(pos + r[0].length);
                splitText(id, false, txt1);
                insertText(id, r[2].replace(/ /g, "&nbsp;"), Number(r[1]));
                splitText(id, true, txt2);
                $(id).remove();
                return;
            }
        }

        var currentWord = "";
        for (var c in text) {
            var type = getWPSN(text[c]);
            if (type == 'w') {
                currentWord += text[c];
                if (c == text.length - 1)
                    insertText(id, currentWord, 'w');
            } else { //Anything other than 'w' ends the current word
                if (currentWord != "")
                    insertText(id, currentWord, 'w');

                if (type == 'n')
                    insertText(id, '<br>', type);
                else if (type == 's')
                    insertText(id, '&nbsp;', type);
                else
                    insertText(id, text[c], type);
                currentWord = ""; //Prepares the string for the word following the newly added punctuation/space/newline
            }
        }
    }
}

function insertText(id, text, type) {
    //Type can be w/p/s/n (word, punctuation, space, newline)
    //or a c-number (will have the class 'c' and data-c value of the c-number)

    var e = $(document.createElement("span"));

    if (typeof type == "number") { //A cloze
        e.addClass("c").attr("data-c", type).html(text).on({
            "mousedown": function () {
                wordMouseDown(this);
            },
            "mouseup": function () {
                wordMouseUp(this);
            },
            "mouseover": function () {
                wordMouseOver(this);
            }
        });
    } else {
        e.addClass(type).html(text).on({
            "mousedown": function () {
                wordMouseDown(this);
            },
            "mouseup": function () {
                wordMouseUp(this);
            },
            "mouseover": function () {
                wordMouseOver(this);
            }
        });
    }

    $(id).before(e);
}

function updateLayout() {
    $(".w, .p, .s, .n, .c").removeClass("nopaddingStart nopaddingEnd openStart openEnd moveLeft moveRight").removeAttr("style");

    $(".w").prev(".w").each(function () { //In the rare situation of two consecutive words, they are combined into one
        $(this).next().html($(this).html() + $(this).next().html());
        $(this).remove();
    })

    //Makes sure there is correct spacing between words and punctuation
    /* word. */
    $(".w, .p, .c").next(".p").addClass("nopaddingStart");
    /* .word */
    $(".w, .c").prev(".p").addClass("nopaddingEnd");
    /* cWORD */
    $(".c").next(".w").addClass("nopaddingStart"); //These are
    /* WORDc */
    $(".c").prev(".w").addClass("nopaddingEnd"); //only possible
    /* cC */
    $(".c").next(".c").addClass("nopaddingStart"); //through text editing

    /* Display multiline markings as 'inline' to prevent the awkward box forming */
    $(".c").filter(function () {
        return ($(this).height() > 20);
    }).css("display", "inline");

    /* Display current potential marking */
    if (markStart && markEnd && markStart != markEnd) {
        var limitId; //The limiting element
        if (isEarlier(markStart, markEnd)) {
            limitId = $(markStart).nextAll(".c[data-c!='" + $(markStart).attr("data-c") + "'], .n");
            if (limitId[0]) {
                if (limitId.first().prevUntil(markStart, ".c, .w").length)
                    limitId = limitId.first().prevUntil(markStart, ".c, .w").first().get(0);
                else
                    limitId = markStart; //Cannot pass through clozes of other colors or newlines
                if (markStart == limitId) {
                    markEnd = 0;
                    preventUnmarkingOnMouseup = true;
                }
                else
                    markEnd = (isEarlier(markEnd, limitId) ? markEnd : limitId);
            }

            if (markEnd) {
                $(markStart).nextUntil(markEnd)
                    .addClass("openStart openEnd")
                    .css("background-color", $(markStart).css("background-color"))
                    .css("color", $(markStart).css("color"));
                $(markStart).addClass("openEnd");
                $(markEnd).addClass("openStart")
                    .css("background-color", $(markStart).css("background-color"))
                    .css("color", $(markStart).css("color"));
            }
        } else {
            limitId = $(markStart).prevAll(".c[data-c!='" + $(markStart).attr("data-c") + "'], .n");
            if (limitId[0]) {
                if (limitId.first().nextUntil(markStart, ".c, .w").length)
                    limitId = limitId.first().nextUntil(markStart, ".c, .w").first().get(0);
                else
                    limitId = markStart; //Cannot pass through clozes of other colors or newlines
                if (markStart == limitId) {
                    markEnd = 0;
                    preventUnmarkingOnMouseup = true;
                }
                else
                    markEnd = (isEarlier(markEnd, limitId) ? limitId : markEnd);
            }

            if (markEnd) {
                $(markStart).prevUntil(markEnd)
                    .addClass("openStart openEnd")
                    .css("background-color", $(markStart).css("background-color"))
                    .css("color", $(markStart).css("color"));
                $(markStart).addClass("openStart");
                $(markEnd).addClass("openEnd")
                    .css("background-color", $(markStart).css("background-color"))
                    .css("color", $(markStart).css("color"));
            }
        }
    }

    /* Dynamic repositioning of punctuation when there is enough space */
    $("#clozefield").prepend($(document.createElement("span")).addClass("s")).append($(document.createElement("span")).addClass("s"));
    $(".c").next(".p:not([style])").next(".s, .n").prev().addClass("moveRight"); //If it has a style, then it is *marked*
    $(".c").prev(".p:not([style])").prev(".s, .n").next().addClass("moveLeft");
    $(".c").next(".p:contains(\"):not([style]), .p:contains('):not([style]), .p:contains(”):not([style]), .p:contains(“):not([style]), .p:contains(´):not([style]), .p:contains(`):not([style])").next(".p").prev().addClass("moveRight");
    $(".c").prev(".p:contains(\"):not([style]), .p:contains('):not([style]), .p:contains(”):not([style]), .p:contains(“):not([style]), .p:contains(´):not([style]), .p:contains(`):not([style])").prev(".p").next().addClass("moveLeft");
    if (markEnd) {
        $(markEnd).next(".p:not([style])").next(".s, .n").prev().addClass("moveRight"); //If it has a style, then it is *marked*
        $(markEnd).prev(".p:not([style])").prev(".s, .n").next().addClass("moveLeft");
        $(markEnd).next(".p:contains(\"):not([style]), .p:contains('):not([style]), .p:contains(”):not([style]), .p:contains(“):not([style]), .p:contains(´):not([style]), .p:contains(`):not([style])").next(".p").prev().addClass("moveRight");
        $(markEnd).prev(".p:contains(\"):not([style]), .p:contains('):not([style]), .p:contains(”):not([style]), .p:contains(“):not([style]), .p:contains(´):not([style]), .p:contains(`):not([style])").prev(".p").next().addClass("moveLeft");
    }
    $("#clozefield .s").first().remove();
    $("#clozefield .s").last().remove(); //Temporary spaces to get correct repositioning in the beginning and at the end
}

function isEarlier(idA, idB) { //Returns whether idA comes before idB
    return (idB.compareDocumentPosition(idA) & Node.DOCUMENT_POSITION_PRECEDING);
}

function wordMouseDown(id) {
    if (!$(id).hasClass("c") && $(id).attr("data-c") && (markingC != 0 || ctrl || shift || alt)) {
        $(id).removeClass().addClass("c");
        preventUnmarkingOnMouseup = true;
        localStorage["field" + clozeN] = getClozeText(false); //Save changes
    }

    markStart = id;
    if (markingC == 0)
        putLastC($(markStart).attr("data-c"));

    updateLayout();

    changedWhileCloze = true;
}

function wordMouseOver(id) {
    if (!$(id).is(".c")) {
        clozeUpdateHoverColor();
    }
    if (markStart && !$(id).hasClass("p")) {
        markEnd = id;
        updateLayout();
    }
}

function wordMouseUp(id) {
    if (markEnd) {
        markText();
    } else if (!preventUnmarkingOnMouseup) {
        //Split all markings of the same color
        var searchC = $(id).attr("data-c");
        $(".c[data-c=" + searchC + "]").each(function () {
            splitText(this, false);
        });
        updateScrollWidth();
        lastC.splice(lastC.indexOf(searchC), 1); //Remove from the list of used markings
        localStorage["field" + clozeN] = getClozeText(false); //Save changes
    }
    markEnd = 0;
}

function globalMouseUp() {
    if (markEnd) {
        markText();
        updateScrollWidth();
    }

    //Keep track of the order of used colors
    if (markStart && (markingC != 0 || ctrl || shift || alt)) {
        var c = $(markStart).attr("data-c");
        if (c == undefined)
            alert("Error: c is undefined!");
        putLastC(c);
    }

    //Clear *current marking*
    markStart = 0;
    markEnd = 0;
    preventUnmarkingOnMouseup = false;

    markingC = getLowestC(false);
    var ind = lastC.indexOf(markingC);
    if (ind != -1 && markingC != 0 && lastC.length > 1)
        lastC.splice(ind, 1); //Remove from the list of used markings

    updateLayout();
}

function markText() {
    if (markStart && markEnd && markStart != markEnd && (markingC != 0 || ctrl || shift || alt || $(markStart).attr("data-c"))) {
        var combinedWords;
        var prevIsSpace = false; //In cases of multiple spaces, the first space (which is hidden) is
        //copied as a normal space (for line break purposes) and the rest as hard spaces.
        if (isEarlier(markStart, markEnd)) {
            combinedWords = $(markStart).html();
            $(markStart).nextUntil(markEnd).each(function () {
                if (($(this).html() == "&nbsp;") && ($(this) == $(markStart) || $(this) == $(markEnd) || prevIsSpace)) {
                    combinedWords += $(this).html();
                }
                else {
                    combinedWords += $(this).html().replace(/&nbsp;/g, ' ');
                    prevIsSpace = ($(this).html() == "&nbsp;");
                }
                $(this).remove();
            });
            combinedWords += $(markEnd).html();
            $(markEnd).remove();
        } else {
            combinedWords = $(markEnd).html();
            $(markEnd).nextUntil(markStart).each(function () {
                if (($(this).html() == "&nbsp;") && ($(this) == $(markStart) || $(this) == $(markEnd) || prevIsSpace)) {
                    combinedWords += $(this).html();
                }
                else {
                    combinedWords += $(this).html().replace(/&nbsp;/g, ' ');
                    prevIsSpace = ($(this).html() == "&nbsp;");
                }
                $(this).remove();
            });
            combinedWords += $(markStart).html();
            $(markEnd).remove();
        }
        $(markStart).html(combinedWords);

        localStorage["field" + clozeN] = getClozeText(false); //Save changes
    }
}

function getLowestC(generateLastC) { //Returns the lowest non-used c-value
    for (var i = 1; i <= 10; i++) {
        if (!$(".c[data-c=" + i + "]").length) return String(i);
        if (generateLastC)
            putLastC(i);
    }
    return 0;
}

function putLastC(c) {
    var ind = lastC.indexOf(c);
    if (ind == -1) {
        lastC.push(c);
    } else {
        lastC.splice(ind, 1);
        lastC.push(c);
    }
}

function clozeUpdateHoverColor() {
    //If ctrl/shift/alt changes while hovering over a word, change the color accordingly.
    if (ctrl || shift || alt) {
        $(".w:hover, .p:hover, .s:hover").attr("data-c", lastC[lastC.length - 1]);
    } else if (markingC == 0) {
        $(".w:hover, .p:hover, .s:hover").removeAttr("data-c");
    } else {
        $(".w:hover, .p:hover, .s:hover").attr("data-c", markingC);
    }
}

function getClozeText(normalize, mouseX, mouseY) {
    //If mouse coordinates are specified, set localStorage caret position to corresponding textarea position
    var str = "";

    //Also normalizes the cloze numbering to remove gaps and make sure it starts with c1.
    if (normalize) {
        var latest = 0; //The latest number that was found to be used
        for (var i = 1; i <= 10; i++) {
            if ($("#clozefield > .c").is("[data-c=" + i + "]")) {
                if (i - latest > 1) {
                    $("#clozefield > .c[data-c=" + i + "]").attr("data-c", String(latest + 1));
                    latest = latest + 1;
                } else {
                    latest = i;
                }
            }
        }
    }

    $("#clozefield > span").each(function () {
        if (mouseX !== undefined && mouseY !== undefined && clozeCaret == null) {
            var p = $(this).offset();
            var lh = $(this).outerHeight(true);
            if ($(this).is(".n")) {
                p.left = 0;
                p.top += lh;
            }
            if (mouseY > p.top && mouseY < p.top + lh) {
                if (mouseX < p.left + $(this).outerWidth(false) / 2)
                    clozeCaret = str.length;
            } else if (mouseY < p.top) {
                clozeCaret = str.length;
            }
        }
        if ($(this).is(".w, .p"))
            str += $(this).text();
        else if ($(this).is(".c"))
            str += "{{c" + $(this).attr("data-c") + "::" + $(this).text() + "}}";
        else if ($(this).is(".s"))
            str += " ";
        else if ($(this).is(".n"))
            str += "\n";
    });

    if (mouseX !== undefined && mouseY !== undefined && clozeCaret == null)
        clozeCaret = str.length;
    return str;
}

function clozeArea(mouseX, mouseY) {
    //If mouse coordinates are specified, place caret at the corresponding position.
    var content = getClozeText(true, mouseX, mouseY);
    $("#clozefield").replaceWith($(document.createElement("textarea")).attr("id", "clozearea").val(content));
    $("#clozearea").on({'input propertychange': function () {
        localStorage["field" + clozeN] = $(this).val();
        changedWhileCloze = true;
        updateAreaHeight(document.getElementById("clozearea"));
        updateScrollWidth();
    }, 'blur': function () {
        //If not empty
        if (!clozeFieldIsEmpty()) {
            clozeField();
        }
        saveSelection(clozeN);
        setTimeout(function () {
            if (document.activeElement == document.body) {
                saveSelection(-1);
            }
        }, 280);
    }, 'focus': function () {
        if (clozeCaret !== null) {
            $(this).get(0).setSelectionRange(clozeCaret, clozeCaret);
            clozeCaret = null;
        }
    }
    });
    updateAreaHeight(document.getElementById("clozearea"));
    updateScrollWidth();
}

function clozeField() {
    _gaq.push(['_trackEvent', 'Cloze', 'field']);
    $("#clozearea").replaceWith($(document.createElement("div")).attr({"id": "clozefield", "tabindex": "0"})
            .append($(document.createElement("span"))
                .text($("#clozearea").val())
                .attr("id", "startspan"))
            .on({'focus': function () {
                if (!mouseDown) { //Means the field got focus with the tab key
                    clozeArea();
                    $("#clozearea").focus();
                    placeCaretAtEnd(clozeN);
                }
            }, 'mousedown': function (e) {
                if (!$(".w:hover, .p:hover, .s:hover, .c:hover").length) {
                    clozeArea(e.pageX, e.pageY);
                    setTimeout(function () {
                        $("#clozearea").focus()
                    }, 1);
                }
                mouseDown = true;
            }
            })
    );
    var id = document.getElementById("startspan");
    splitText(id, true);
    markingC = getLowestC(true);
    updateLayout();
    updateScrollWidth();
}

function htmlToClozeText(s) {
    changedWhileCloze = true;
    return convertHtmlToCloze(s);
}
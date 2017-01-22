'use strict';

var currentXhr = undefined; //Is null when finished

//todo: refactor usage of this method
function connectToAnki(successCallback, errorCallback, forceRelogin) {
    retrieveData(successCallback);
}

function retrieveData(successCallback) {
    var updateCurrent = false;
    var updateModelList = false;
    var updateDeckList = false;
    //Login successful, now retrieve models and decks.
    successCallback(updateCurrent, updateModelList, updateDeckList);
}

function addNote(dontClose) {
    if (allFieldsAreEmpty()) {
        alert(chrome.i18n.getMessage("errorEmptycard"));
        return;
    }
    if (!localStorage["field1"]) {
        alert(chrome.i18n.getMessage("errorEmptyfirstfield"));
        return;
    }
    if (clozeN != -1) {
        //Fix ordering of clozes before adding
        if ($("#clozefield").length) {
            localStorage["field" + clozeN] = getClozeText(true);
        }
        if (!(/{{c1::(.+?)}}/.test(localStorage["field" + clozeN]))) {
            alert(chrome.i18n.getMessage("errorEmptycloze", localStorage["model-fieldName-" + clozeN + ":" + localStorage["currentModel"]]));
            return;
        }
    }

    //Add to total number of cards added across all users of the extension
    _gaq.push(['_trackEvent', 'Card_added', chrome.i18n.getMessage("@@ui_locale")]);

    $(".addcardbutton").addClass("addcardbuttondown").removeClass("addcardbutton");
    $(".buttonready").delay(600).fadeTo(300, 0, function () {
        $(this).css("display", "none")
    });
    $(".loadinggif").delay(600).fadeTo(150, 1, function () {
        $(this).css("display", "block")
    });

    var dontCloseAfterAdding = (dontClose !== undefined ? dontClose : (shift));

    if (currentXhr && currentXhr.readyState != 4) { //If the connection to AnkiWeb is not completed, restart it and add note when it's finished
        currentXhr.abort();
        connectToAnki(function (updateCurrent, updateModelList, updateDeckList) {
            $(".loadinggifsmall").stop(true).fadeOut(400);
            if (updateModelList) {
                fillModelList();
            }
            if (updateDeckList) {
                detailedDeckNames();
                fillDeckList();
            }
            if (updateCurrent) {
                generateFields();
            }
            addNote(dontCloseAfterAdding);
        }, function(errorMessage) {
            alert(chrome.i18n.getMessage(errorMessage));
        });
        return;
    }

    var fields = [];
    for (var i = 1; localStorage["model-fieldName-" + i + ":" + localStorage["currentModel"]]; i++) {
        var s = localStorage["field" + i];
        if (s === null || s === undefined) {
            s = "";
        } else {
            s = replaceSpecialWithSpace(s);
        }
        if (i == clozeN)
            s = s.replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&amp;/g, '&')
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br>");
        fields.push(s);
    }

    if (!localStorage["fieldTags"]) {
        localStorage["fieldTags"] = "";
    }
    var tags = localStorage["fieldTags"].replace(/,/g, ' ');

    var data = [fields, tags];
    //In Anki, tags are space separated only. This means that if you write like this [a, b, c] the card will have the tags 'a,' 'b,' and 'c'.
    //This problem exists in all versions of Anki, but to counteract it at least in this version, all ',' are replaced with spaces

    var newCardData = {
        data: JSON.stringify(data),
        mid: $("[name=model]").val(), //model id
        deck: (returnDeck ? localStorage["currentDeck"] : $("[name=deck]").val())
    };

    //saving note to the deck DB
    var deckDb = new LDB.Collection(newCardData.deck);
    var deckSizeBefore = deckDb.items.length;

    deckDb.save(newCardData, function(_item){
        //console.log('Card added:', _item);

        //todo: remove all fading issues in the plugin
        $(".loadinggifsmall").stop(true).fadeOut(400);
        $(".loadinggif").stop(true).fadeTo(60, 0, function () {
            $(this).css("display", "none")
        });
        $(".buttonready").stop(true).fadeTo(100, 1, function () {
            $(this).css({"display": "block", "opacity": "1"})
        });

        clearFields();

        //Save combination of model and deck to enable the user to quickly return to the most recently used combinations.
        saveCombo();
        localStorage["caretField"] = 1;
        localStorage["caretPos"] = 0;
        loadSelection();

        //checking do we have space for saving cards to the local DB - validate if max saving limit reached
        var deckSizeAfter = deckDb.items.length;
        if (deckSizeAfter != deckSizeBefore + 1) {
            showMessage(0, 'ankiErrorMsg');
        }

        //If shift was held when the button was pressed
        if (dontCloseAfterAdding) {
            $(".addcardbuttondown").addClass("addcardbutton").removeClass("addcardbuttondown");
        } else {
            window.close();
        }
    });
}

function detailedDeckNames() {
    //Find decks that are namesakes and store more detailed names (containing one or more of their parent decks) in detailedName[]

    //Begin with clearing previous detailedDeckNames
    for (var key in localStorage) {
        if ("detailedDeckName:" == key.substring(0, 17))
            localStorage.removeItem(key);
    }

    var namesakes = [];
    var deckLevel = []; //Collection where each (single) deck name has an array of all levels it appears in.
    for (var i = 0; localStorage["deck" + i]; i++) {
        if (!localStorage["excludedDeck:" + localStorage["deck" + i]]) {
            var full = localStorage["deck" + i];
            var trail = full.split("::"); //Full deck name separated
            var level = trail.length - 1;
            var deck = trail[trail.length - 1]; //Single deck name
            if (deckLevel[deck] === undefined) {
                deckLevel[deck] = [];
            } else if (deckLevel[deck][level] !== undefined && deckLevel[deck][level].length == 1) {//If a namesake on the same level is found
                namesakes.push({"deck": deck, "level": level});
            }
            if (deckLevel[deck][level] === undefined) {
                deckLevel[deck][level] = [];
            }
            deckLevel[deck][level].push(full);
        }
    }
    for (var i in namesakes) {
        var deck = namesakes[i]["deck"];
        var level = namesakes[i]["level"];
        var newlevel = level - 1;
        if (newlevel > 0) {
            for (var noNamesakes; (newlevel > 0 && !noNamesakes); newlevel--) {
                var names = [];
                noNamesakes = true;
                for (var j in deckLevel[deck][level]) { //Make sure there are no namesakes at the next level
                    var current = deckLevel[deck][level][j].split("::")[newlevel];
                    if (names[current]) {
                        noNamesakes = false;
                    } else {
                        names[current] = true;
                    }
                }
            }
        } else {
            newlevel = 0;
        }

        //Now, newlevel is the lowest possible level that will allow us to distinguish between the namesakes
        for (var j in deckLevel[deck][level]) {
            var full = deckLevel[deck][level][j];
            var trail = full.split("::");
            localStorage["detailedDeckName:" + full] = "";
            for (var n = 0; n < level; n++)
                localStorage["detailedDeckName:" + full] += "&nbsp;&nbsp;&nbsp;";
            for (var n = newlevel; n <= level; n++)
                localStorage["detailedDeckName:" + full] += trail[n] + (n == level ? "" : "::");
        }
    }
}

function updateContextMenu() { //Same as in eventPage.js //todo: extract duplicate
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
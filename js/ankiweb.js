'use strict';

var currentXhr = undefined; //Is null when finished

function connectToAnki(successCallback, errorCallback, forceRelogin) {
    //Logs onto Anki with the username and password provided in the settings and updates the localStorage variables.

    //The arguments in the callback function tell if anything has changed since the last time the function was called (and should thus be refreshed)
    //callback(updateCurrent, updateModelList, updateDeckList)

    //If only one argument is given, the connection failed, and the argument contains the error code word of the problem
    //callback(errorCode)

    if (forceRelogin || !localStorage["login-status"] || localStorage["login-status"] != "OK") {
        //need to relogin
        console.log("Logout form AnkiWeb");
        currentXhr = $.get('https://ankiweb.net/account/logout', function (data, textStatus) { //Start with logging any other user off.
            console.log("Login to AnkiWeb");
            currentXhr = $.post('https://ankiweb.net/account/login', { //Submit user info
                    submitted: "1",
                    username: localStorage["option-ID"],
                    password: localStorage["option-password"]
                },
                function (data, textStatus) {
                    var html = $(data);
                    if ($(".mitem", html).length == 0) { //Look for element with class 'mitem' which is only used by the tabs that show up when logged in.
                        localStorage["login-status"] = "ERROR";
                        errorCallback("errorWronginfo"); //If it cannot be found it means the login failed, likely due to wrong username/password.
                        return;
                    }

                    localStorage["login-status"] = "OK";
                    if (localStorage["currentModel"] !== undefined && localStorage["currentDeck"] !== undefined) {
                        //Save current combo at zero level.
                        localStorage["combo0"] = localStorage["currentModel"] + "::" + localStorage["currentDeck"];
                    }

                    retrieveData(successCallback);
                });
        });
    } else {
        //we are already logged in
        retrieveData(successCallback);
    }
}

function retrieveData(successCallback) {
    var updateCurrent = false;
    var updateModelList = false;
    var updateDeckList = false;
    //Login successful, now retrieve models and decks.

    currentXhr = $.get('https://ankiweb.net/edit/', function (data, textStatus) {
        console.log("Data loaded");
        if (textStatus == 'error') {
            alert(chrome.i18n.getMessage("errorConnectanki"));
            return;
        }

        var models = jQuery.parseJSON(/editor\.models = (.*}]);/.exec(data)[1]); //[0] = the matching text, [1] = first capture group (what's inside parentheses)
        var decks = jQuery.parseJSON(/editor\.decks = (.*}});/.exec(data)[1]);

        //-------- Compare and update localStorage data

        var decks_array = [];
        for (var e in decks) {
            //Automatically tries to find and exclude the default deck if it's unused
            if (!(e == 1 && decks[e].mid == null && Object.keys(decks).length > 1)) {
                decks_array.push(decks[e].name);
            }
        }
        decks_array.sort();
        var currentDeckExists = false;
        for (var n in decks_array) {
            if (localStorage["deck" + n] != decks_array[n]) {
                localStorage["deck" + n] = decks_array[n];
                updateDeckList = true;
            }
            if (decks_array[n] == localStorage["currentDeck"]) { //Check for changes since last time
                currentDeckExists = true;
            }
        }
        for (n = decks_array.length; localStorage["deck" + n]; n++) { //If decks have been deleted since last time
            localStorage.removeItem("deck" + n);
            updateDeckList = true;
        }
        if (!currentDeckExists) { //If the current deck doesn't exist, choose the earliest non-excluded deck
            for (var n in decks_array) {
                if (!localStorage["excludedDeck:" + decks_array[n]]) {
                    localStorage["currentDeck"] = decks_array[n];
                    break;
                }
            }
            updateCurrent = true;
        }

        var curMod = localStorage["currentModel"];
        var currentModelExists = false;

        for (var n in models) {
            //Check if the current model has changed
            if (models[n].id == curMod) {
                for (var f = 1; localStorage["model-fieldName-" + f + ":" + curMod]; f++) {
                    if (!models[n].flds[f - 1]
                        || localStorage["model-fieldName-" + f + ":" + curMod] != models[n].flds[f - 1].name
                        || localStorage["model-fieldFont-" + f + ":" + curMod] != models[n].flds[f - 1].font
                        || localStorage["model-fieldSize-" + f + ":" + curMod] != models[n].flds[f - 1].size
                        || Boolean(localStorage["model-fieldRtl-" + f + ":" + curMod]) != models[n].flds[f - 1].rtl) {
                        updateCurrent = true;
                        break;
                    }
                }
                if (!localStorage["model-fieldName-" + (+models[n].flds.length - 1) + ":" + curMod]) //If the number of fields have increased
                    updateCurrent = true;
                currentModelExists = true;
            }

            if (localStorage["model" + n] != models[n].id || localStorage["model-name:" + models[n].id] != models[n].name)
                updateModelList = true;
        }
        if (localStorage["model" + models.length - 1]) { //If the number of models have decreased
            updateModelList = true;
        }
        if (!currentModelExists) { //If the current model doesn't exist, choose the earliest non-excluded model
            for (var n in models) {
                if (!localStorage["excludedModel:" + models[n].id]) {
                    localStorage["currentModel"] = models[n].id;
                    break;
                }
            }
            updateCurrent = true;
        }

        //Now that updateModelList and updateCurrent are correctly assigned, we can remove all stored information
        removeModelsFromLocalStorage();

        //Everything is cleared. Simply add the latest information.
        addNewModelsToLocalStorage(models);

        currentXhr = null;

        if (updateCurrent) {
            updateContextMenu(); //Update fields in context menu
        }

        successCallback(updateCurrent, updateModelList, updateDeckList);
    });
}

function addNewModelsToLocalStorage(models) {
    for (var n in models) {
        localStorage["model" + n] = models[n].id;
        var id = localStorage["model" + n];
        localStorage["model-name:" + id] = models[n].name;

        //Find the name of the cloze field, if it exists.
        var clozeFieldName, frontCloze, backCloze, searchCloze;
        searchCloze = /{{cloze:(.+?)}}/.exec(models[n].tmpls[0].qfmt);
        if (searchCloze != null) {
            frontCloze = searchCloze[1];
        }
        searchCloze = /{{cloze:(.+?)}}/.exec(models[n].tmpls[0].afmt);
        if (searchCloze != null) {
            backCloze = searchCloze[1];
        }
        //If the model has a Cloze field
        if (frontCloze != undefined && backCloze == frontCloze) {
            clozeFieldName = frontCloze;
        }

        for (var f in models[n].flds) {
            localStorage["model-fieldName-" + (+f + 1) + ":" + id] = models[n].flds[f].name;
            localStorage["model-fieldFont-" + (+f + 1) + ":" + id] = models[n].flds[f].font;
            localStorage["model-fieldSize-" + (+f + 1) + ":" + id] = models[n].flds[f].size;
            if (models[n].flds[f].rtl == true)
                localStorage["model-fieldRtl-" + (+f + 1) + ":" + id] = models[n].flds[f].rtl;
            if (models[n].flds[f].sticky == true)
                localStorage["model-fieldSticky-" + (+f + 1) + ":" + id] = models[n].flds[f].sticky;
            if (clozeFieldName == models[n].flds[f].name)
                localStorage["model-clozeFieldNum:" + id] = (+f + 1);
        }
    }
}

function removeModelsFromLocalStorage() {
    for (var key in localStorage) {
        if ("model" == key.substring(0, 5)) { //Clear all entries beginning with "model"
            localStorage.removeItem(key);
        }
    }
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
    _gaq.push(['_trackEvent', 'Skapade kort', chrome.i18n.getMessage("@@ui_locale")]);

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
        if (s === null || s === undefined)
            s = "";
        else
            s = s.replace(/(\r|\t|\v|\f)/g, " ");
        if (i == clozeN)
            s = s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&amp;/g, '&').replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        fields.push(s);
    }

    if (!localStorage["fieldTags"]) {
        localStorage["fieldTags"] = "";
    }
    var tags = localStorage["fieldTags"].replace(/,/g, ' ');

    var data = [fields, tags];
    //In Anki, tags are space separated only. This means that if you write like this [a, b, c] the card will have the tags 'a,' 'b,' and 'c'.
    //This problem exists in all versions of Anki, but to counteract it at least in this version, all ',' are replaced with spaces

    var dict = {
        data: JSON.stringify(data),
        mid: $("[name=model]").val(), //model id
        deck: (returnDeck ? localStorage["currentDeck"] : $("[name=deck]").val())
    };

    currentXhr = $.get('https://ankiweb.net/edit/save',
        dict,
        function (data, textStatus) {
            if (textStatus == 'error') {
                alert(chrome.i18n.getMessage("errorCard"));
                return;
            }
            $(".loadinggifsmall").stop(true).fadeOut(400);
            $(".loadinggif").stop(true).fadeTo(60, 0, function () {
                $(this).css("display", "none")
            });
            $(".buttonready").stop(true).fadeTo(100, 1, function () {
                $(this).css({"display": "block", "opacity": "1"})
            });

            clearFields();
            currentXhr = null;
            saveCombo(); //Save combination of model and deck to enable the user to quickly return to the most recently used combinations.
            localStorage["caretField"] = 1;
            localStorage["caretPos"] = 0;
            loadSelection();
            if (dontCloseAfterAdding)//If shift was held when the button was pressed
                $(".addcardbuttondown").addClass("addcardbutton").removeClass("addcardbuttondown");
            else
                window.close();
        });
}

function loadTranslation() {
    $("*[data-i18n]").each(function () {
        $(this).html(chrome.i18n.getMessage($(this).attr("data-i18n")));
    });
    $("*[data-i18ntt]").each(function () {
        $(this).attr("title", chrome.i18n.getMessage($(this).attr("data-i18ntt"))); //Tooltip
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
            if (deckLevel[deck] === undefined)
                deckLevel[deck] = [];
            else if (deckLevel[deck][level] !== undefined && deckLevel[deck][level].length == 1) //If a namesake on the same level is found
                namesakes.push({"deck": deck, "level": level});
            if (deckLevel[deck][level] === undefined)
                deckLevel[deck][level] = [];
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
                    if (names[current])
                        noNamesakes = false;
                    else
                        names[current] = true;
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

function updateContextMenu() { //Same as in eventPage.js
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
'use strict';

function isModelsEmpty() {
    return localStorage["model0"] === undefined;
}

function isDecksEmpty() {
    return DeckMng.getListOfDecks().length === 0;
    // todo: remove
    // return localStorage["deck0"] === undefined;
}

function isLoginEmpty() {
    return localStorage["option-ID"] === undefined;
}

function removeLoginData() {
    localStorage.removeItem("option-ID");
    localStorage.removeItem("option-password");
    localStorage.removeItem("login-status");
}

function removeModelsFromLocalStorage() {
    for (var key in localStorage) {
        if ("model" == key.substring(0, 5)) { //Clear all entries beginning with "model"
            localStorage.removeItem(key);
        }
    }
}

function removeDecksFromLocalStorage() {
    for (var key in localStorage) {
        if ("deck" == key.substring(0, 4)) { //Clear all entries beginning with "deck"
            localStorage.removeItem(key);
        }
        if ("excl" == key.substring(0, 4)) { //Clear all entries beginning with "excluded"
            localStorage.removeItem(key);
        }
        if ("combo" == key.substring(0, 5)) { //Clear all entries beginning with "combo"
            localStorage.removeItem(key);
        }
    }
}

/**
 * Method for the loading models from Anki API
 */
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
'use strict';

$(document.body).on('click', "#shortcutbutton", () => {
    $("#excludepanel").slideUp();
    $("#shortcutpanel").slideToggle();
});

$(document.body).on('click', "#excludebutton", () => {
    if ($("#excludepanel").css("display") == "none") { //Only when folded down, not when folded up again
        $("#excludecontainer").css("display", "block");
        $("#message").css("display", "none");
        optionsListModels();
        optionsListDecks();
    }
    $("#shortcutpanel").slideUp();
    $("#excludepanel").slideToggle();
});

$(document.body).on('click', ".extensionslink", () => chrome.tabs.create({ url: 'chrome://chrome/extensions' }));

$(document.body).on('click', '#savedeckbutton', () => {
    const $newDeckField = $('#new-deck-field');
    let newDeckName = $newDeckField.val();
    let list = DeckMng.getListOfDecks();
    if (newDeckName && !DeckMng.hasDeck(newDeckName)) {
        DeckMng.addDeck(newDeckName);
        $newDeckField.val('');
        updateDecksList();
    }
});

$(document).ready(() => {
    loadValues();
    loadShortcuts();
    loadTranslation();

    optionsListModels();
    updateDecksList();
});

function loadValues() {
    $("input[name|=option]").each(function () {
        var name = $(this).attr("name");
        if (localStorage[name]) {
            $(this).val(localStorage[name]);
        }
    });
}

function loadShortcuts() {
    chrome.commands.getAll(function (coms) {
        if (coms[0]["shortcut"])
            $(".shortcutpopup").text(coms[0]["shortcut"]).addClass("active");
        else
            $(".shortcutpopup").attr("title", chrome.i18n.getMessage("opTooltipopenpopup"));

        for (var i = 1; i <= 3; i++) {
            if (coms[i]["shortcut"])
                $(".shortcut" + i).text(coms[i]["shortcut"]).addClass("active");
            else
                $(".shortcut" + i).attr("title", chrome.i18n.getMessage("opTooltipaddtofield"));
        }
    });
}

function optionsListModels() {
    $("#modellist").empty();
    for (var n = 0; localStorage["model" + n]; n++) {

        var inputElem = $(document.createElement("input"))
            .on({
                "focus": function () {
                    $(this).css("opacity", 1);
                },
                "blur": function () {
                    if (!localStorage["excludedModel:" + $(this).val()])
                        $(this).css("opacity", 0);
                }})
            .attr({
                type: "checkbox",
                value: localStorage["model" + n]
            })
            .change(function () {
                var key = "excludedModel:" + $(this).val();
                if (this.checked) //This is before, so if it is now checked it will be unchecked.
                    localStorage[key] = "true";
                else
                    localStorage.removeItem(key);
                detailedDeckNames();
            });


        $("#modellist").append(
            $(document.createElement("li"))
                .on({
                    "mouseover": function () {
                        $(this).find("input").css("opacity", 1);
                    },
                    "mouseout": function () {
                        if (!localStorage["excludedModel:" + $(this).find("input").val()])
                            $(this).find("input").css("opacity", 0);
                    }})
                .append($(document.createElement("label"))
                    .append(inputElem)
                    .append($(document.createElement("span"))
                        .append(document.createTextNode(localStorage["model-name:" + localStorage["model" + n]]))
                )
            )
        );

        if (localStorage["excludedModel:" + localStorage["model" + n]])
            $("#modellist input").last().attr("checked", true);
        else
            $("#modellist input").last().css("opacity", 0);
    }
}

function updateDecksList() {
    optionsLocalDecks();
    // optionsListDecks();
}

function optionsLocalDecks() {
    const $deckslist = $("#deckslist");
    const decksList = DeckMng.getListOfDecks();

    const listHtml = decksList.map((deckName) => `<tr><td>${deckName}</td>`).join('');
    $deckslist.html(listHtml);
}

function optionsListDecks() {
    $("#decklist").empty();
    for (var n = 0; localStorage["deck" + n]; n++) {

        //Deck formatting
        var lvl = localStorage["deck" + n].match(/::/g);
        if (lvl != null) {
            lvl = lvl.length; //Current sub-level
        } else {
            lvl = 0;
        }
        var endName = /(::|^)([^::]*)$/.exec(localStorage["deck" + n])[2];
        var white = "";
        for (var i = 0; i < lvl; i++) {
            white += "&nbsp;&nbsp;&nbsp;";
        }
        var className = "dlvl_" + (lvl <= 3 ? lvl : 3);

        $("#decklist")
            .append($(document.createElement("li"))
                .on({
                    "mouseover": function () {
                        $(this).find("input").css("opacity", 1);
                    },
                    "mouseout": function () {
                        if (!localStorage["excludedDeck:" + $(this).find("input").val()])
                            $(this).find("input").css("opacity", 0);
                    }})
                .addClass(className).append($(document.createElement("label"))
                    .append(white)
                    .append($(document.createElement("input"))
                        .on({
                            "focus": function () {
                                $(this).css("opacity", 1);
                            },
                            "blur": function () {
                                if (!localStorage["excludedDeck:" + $(this).val()])
                                    $(this).css("opacity", 0);
                            }})
                        .attr({
                            type: "checkbox",
                            value: localStorage["deck" + n]
                        })
                        .change(function () {
                            var key = "excludedDeck:" + $(this).val();
                            if (this.checked) //This is before, so if it is now checked it will be unchecked.
                                localStorage[key] = "true";
                            else
                                localStorage.removeItem(key);
                            detailedDeckNames();
                        }))
                    .append($(document.createElement("span")).append(document.createTextNode(endName))))
        );
        if (localStorage["excludedDeck:" + localStorage["deck" + n]]) {
            $("#decklist input").last().attr("checked", true);
        } else {
            $("#decklist input").last().css("opacity", 0);
        }
    }
}
'use strict';

/**
 * Returns which type a single character is, excluding the cloze type.
 */
function getWPSN(character) {
    if (character == ' ')
        return 's';
    if (character == '\n')
        return 'n';
    if (isPunctuation(character))
        return 'p';
    return 'w';
}

/**
 * Returns whether a character is a punctuation
 */
function isPunctuation(character) {
    return /[.!?:,;_'"”“´`()\[\]{}<>*+|$%&/\\\-]/.test(character);
}

function convertHtmlToCloze(s) { //Same as in marking.js & event page //todo: extract duplicate
    if (s === undefined || s == "<br>") {
        return "";
    } else {
        return s.replace(/^<div>(<br><\/div>)?/, "")
            .replace(/<div><br><\/div>/g, "\n")
            .replace(/<div>/g, "\n")
            .replace(/<br>/g, "\n")
            .replace(/<.*?>/g, "")
            .replace(/&nbsp;/g, " ");
    }
}

//todo: test
function replaceSpecialWithSpace(s) {
    return s.replace(/(\r|\t|\v|\f)/g, " ");
}

//todo: test
function calculateNodeCount(selection) {
    var splits = selection.split("\n");
    var numberOfTextNodes = 0;
    var numberOfNewLines = splits.length - 1;
    for (var i in splits) {
        if (splits[i] != "") {
            numberOfTextNodes++;
        }
    }
    return numberOfTextNodes + numberOfNewLines;
}


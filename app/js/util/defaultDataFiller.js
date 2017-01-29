'use strict';

function fillDefaultModels() {
  //first model
  localStorage["model0"] = "123";
  localStorage["model-name:123"] = "Two-fields";

  localStorage["model-fieldName-1:123"] = "Front";
  localStorage["model-fieldName-2:123"] = "Back";

  localStorage["model-fieldSize-1:123"] = "20";
  localStorage["model-fieldSize-2:123"] = "20";

  localStorage["model-fieldFont-1:123"] = "Arial";
  localStorage["model-fieldFont-2:123"] = "Arial";

  //second model
  localStorage["model1"] = "234";
  localStorage["model-name:234"] = "Three-fields";

  localStorage["model-fieldName-1:234"] = "Front";
  localStorage["model-fieldName-2:234"] = "Back";
  localStorage["model-fieldName-3:234"] = "Third";

  localStorage["model-fieldSize-1:234"] = "20";
  localStorage["model-fieldSize-2:234"] = "20";
  localStorage["model-fieldSize-3:234"] = "20";

  localStorage["model-fieldFont-1:234"] = "Arial";
  localStorage["model-fieldFont-2:234"] = "Arial";
  localStorage["model-fieldFont-3:234"] = "Arial";

  //setting current model
  localStorage["currentModel"] = "123";
}

function fillDefaultDecks() {
  debugger;
  DeckMng
    .addDeck('Deck A')
    .addDeck('Deck B')
    .setCurrentDeck('Deck A');
  debugger;
  // todo: remove it
  // localStorage["deck0"] = "Deck A";
  // localStorage["deck1"] = "Deck B";
  // localStorage["currentDeck"] = "Deck A"
}
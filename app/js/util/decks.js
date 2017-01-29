'use strict';

const safeJsonParse = (str, defaultVal) => {
  let ret = defaultVal;
  try {
    ret = JSON.parse(str);
  } catch (e) {
    ret = defaultVal;
  }
  return ret;
};

const LS_KEYS = {
  LIST_OF_DECKS: 'listOfDecks',
  CURRENT_DECK: 'currentDeck'
};

window.DeckMng = {
  _getVal(name, defaultValue = '') {
    return safeJsonParse(localStorage[name], defaultValue);
  },

  _setVal(name, val) {
    localStorage[name] = JSON.stringify(val);
    return this;
  },

  getListOfDecks() {
    return this._getVal(LS_KEYS.LIST_OF_DECKS, []);
  },

  addDeck(name) {
    let list = this.getListOfDecks();
    if (!list.includes(name)) { // how should we handle multiple decks with the same name?
      list.push(name);
    }

    this._setVal(LS_KEYS.LIST_OF_DECKS, list);
    return this;
  },

  hasDeck(name) {
    return this.getListOfDecks().includes(name);
  },

  setCurrentDeck(name) {
    this._setVal(LS_KEYS.CURRENT_DECK, name);
    return this;
  },

  getCurrentDeck() {
    let list = this.getListOfDecks();
    return this._getVal(LS_KEYS.CURRENT_DECK) || list[0] || '';
  }
};
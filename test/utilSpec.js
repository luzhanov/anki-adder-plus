describe('Utils', function() {

    //todo: test DOM manipulations with https://github.com/velesin/jasmine-jquery

    it('should detect WSPN chars', function() {
        expect(getWPSN(' ')).toBe('s');
        expect(getWPSN('\n')).toBe('n');
        expect(getWPSN('!')).toBe('p');
        expect(getWPSN('a')).toBe('w');
        expect(getWPSN('z')).toBe('w');
    });

    it('should detect punctuation chars', function() {
        expect(isPunctuation(' ')).toBe(false);
        expect(isPunctuation('!')).toBe(true);
        expect(isPunctuation('\[')).toBe(true);
    });

    it('should convertHtmlToCloze', function() {
        expect(convertHtmlToCloze()).toBe("");
        expect(convertHtmlToCloze("<br>")).toBe("");
        expect(convertHtmlToCloze("aaa<div><br><\/div>")).toBe("aaa\n");
        expect(convertHtmlToCloze("aaa<br>")).toBe("aaa\n");
        expect(convertHtmlToCloze("test<someTag>")).toBe("test");
        expect(convertHtmlToCloze("test&nbsp;a")).toBe("test a");
    });

});
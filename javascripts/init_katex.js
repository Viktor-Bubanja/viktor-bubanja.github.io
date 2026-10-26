// navigation.instant swaps pages without a full reload, so DOMContentLoaded only
// fires once. document$ emits on every page load, including instant navigations.
document$.subscribe(({ body }) => {
    renderMathInElement(body, {
        delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "\\[", right: "\\]", display: true},
            {left: "\\(", right: "\\)", display: false}
        ]
    });
});

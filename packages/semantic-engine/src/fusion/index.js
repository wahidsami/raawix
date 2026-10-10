export function collectFusionSignals(input) {
    return {
        hasDom: Boolean(input.html && input.html.trim().length > 0),
        hasVision: Boolean(input.vision),
        hasAssistiveMap: Boolean(input.assistiveMap),
        hasA11y: Boolean(input.a11y),
    };
}
//# sourceMappingURL=index.js.map
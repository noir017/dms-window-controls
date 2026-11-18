.pragma library

// Width steps for the shrink and expand buttons. A step is a fraction of the
// screen width (0 < f <= 1, where 1 is full width) or FULLSCREEN.

const FULLSCREEN = "fullscreen";
const DEFAULT_STEPS = "25%, 50%, 75%, 100%, fullscreen";

// Parses a list such as "25%, 1/3, 100%, fullscreen" into ascending steps,
// fullscreen last. Unknown entries are skipped; without any width step the
// defaults are used.
function parse(text) {
    const widths = [];
    let fullscreen = false;
    for (const token of String(text ?? "").toLowerCase().split(/[,;\s]+/)) {
        if (token === FULLSCREEN) {
            fullscreen = true;
            continue;
        }
        const width = parseWidth(token);
        if (width > 0 && width <= 1 && !widths.some(other => Math.abs(other - width) < 1e-6))
            widths.push(width);
    }
    if (widths.length === 0)
        return parse(DEFAULT_STEPS);
    widths.sort((a, b) => a - b);
    return fullscreen ? widths.concat([FULLSCREEN]) : widths;
}

// "50%", "50" and "1/2" are all one half; anything else is NaN.
function parseWidth(token) {
    let match = /^(\d+(?:\.\d+)?)%?$/.exec(token);
    if (match)
        return Number(match[1]) / 100;
    match = /^(\d+)\/(\d+)$/.exec(token);
    if (match && Number(match[2]) > 0)
        return Number(match[1]) / Number(match[2]);
    return NaN;
}

// The step a window is at: the fullscreen step when it is fullscreen, else
// the width step nearest to `ratio`. A fullscreen window with no fullscreen
// step counts as one past the last step.
function currentIndex(steps, fullscreen, ratio) {
    if (fullscreen) {
        const index = steps.indexOf(FULLSCREEN);
        return index >= 0 ? index : steps.length;
    }
    let best = -1;
    for (let i = 0; i < steps.length; i++) {
        if (steps[i] === FULLSCREEN)
            continue;
        if (best < 0 || Math.abs(steps[i] - ratio) < Math.abs(steps[best] - ratio))
            best = i;
    }
    return best;
}

// The step to go to from `index`: +1 expands, -1 shrinks. -1 when there is none.
function target(index, count, direction) {
    const next = index + direction;
    return index >= 0 && next >= 0 && next < count ? next : -1;
}

// Where a niri window is. Its tile covers the whole output when fullscreen;
// otherwise its width is a fraction of the output width.
function niriState(window, output) {
    const tile = window?.layout?.tile_size;
    if (!tile || !output?.width || !output?.height)
        return null;
    return {
        fullscreen: tile[0] >= output.width - 1 && tile[1] >= output.height - 1,
        ratio: tile[0] / output.width
    };
}

// The niri IPC actions that take a window from its state to `step`. Tiled
// windows change their column; floating windows change themselves.
function niriActions(window, fullscreen, step) {
    const id = window.id;
    if (step === FULLSCREEN)
        return fullscreen ? [] : [{ FullscreenWindow: { id } }];
    const actions = fullscreen ? [{ FullscreenWindow: { id } }] : [];
    const change = { SetProportion: Math.round(step * 10000) / 100 };
    actions.push(window.is_floating ? { SetWindowWidth: { id, change } } : { SetColumnWidth: { change } });
    return actions;
}

// "25%", "100%" or "fullscreen", for IPC replies.
function name(step) {
    return step === FULLSCREEN ? FULLSCREEN : `${Math.round(step * 100)}%`;
}

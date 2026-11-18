import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// steps.js is a QML JavaScript library; drop the QML pragma and load it as a plain script.
const source = readFileSync(new URL("../steps.js", import.meta.url), "utf8").replace(/^\.pragma library$/m, "");
const Steps = new Function(`${source}\nreturn { FULLSCREEN, DEFAULT_STEPS, parse, currentIndex, target, niriState, niriActions, name };`)();

const F = Steps.FULLSCREEN;
const defaults = Steps.parse(Steps.DEFAULT_STEPS);

test("default steps", () => {
    assert.deepEqual(defaults, [0.25, 0.5, 0.75, 1, F]);
});

test("parse accepts percents, plain numbers and fractions, sorted with fullscreen last", () => {
    assert.deepEqual(Steps.parse("fullscreen 100% 1/2;33.5"), [0.335, 0.5, 1, F]);
    assert.deepEqual(Steps.parse("50%, 1/2, 50"), [0.5]);
    assert.deepEqual(Steps.parse("Fullscreen, 1/3, 2/3"), [1 / 3, 2 / 3, F]);
});

test("parse skips bad entries and falls back to the defaults", () => {
    assert.deepEqual(Steps.parse("0%, 150%, 1/0, wide, 40%"), [0.4]);
    assert.deepEqual(Steps.parse(""), defaults);
    assert.deepEqual(Steps.parse(undefined), defaults);
    assert.deepEqual(Steps.parse("fullscreen"), defaults);
});

test("the current step is the nearest width, or fullscreen", () => {
    assert.equal(Steps.currentIndex(defaults, false, 0.245), 0);
    assert.equal(Steps.currentIndex(defaults, false, 0.4), 1);
    assert.equal(Steps.currentIndex(defaults, false, 0.66), 2);
    assert.equal(Steps.currentIndex(defaults, false, 0.99), 3);
    assert.equal(Steps.currentIndex(defaults, false, 0.1), 0);
    assert.equal(Steps.currentIndex(defaults, true, 1), 4);
    // Without a fullscreen step, fullscreen is past the last step.
    assert.equal(Steps.currentIndex([0.5, 1], true, 1), 2);
});

test("expand climbs to fullscreen and stops; shrink stops at the smallest width", () => {
    const walk = (index, direction) => {
        const seen = [];
        for (let next; (next = Steps.target(index, defaults.length, direction)) >= 0; index = next)
            seen.push(Steps.name(defaults[next]));
        return seen;
    };
    assert.deepEqual(walk(0, 1), ["50%", "75%", "100%", "fullscreen"]);
    assert.deepEqual(walk(4, -1), ["100%", "75%", "50%", "25%"]);
    assert.equal(Steps.target(4, defaults.length, 1), -1);
    assert.equal(Steps.target(0, defaults.length, -1), -1);
    assert.equal(Steps.target(-1, defaults.length, 1), -1);
    // Fullscreen without a fullscreen step shrinks to the widest step.
    assert.equal(Steps.target(2, 2, -1), 1);
    assert.equal(Steps.target(2, 2, 1), -1);
});

test("niri state from the tile size and the output", () => {
    const output = { width: 1920, height: 1080 };
    const window = (w, h) => ({ layout: { tile_size: [w, h] } });
    assert.deepEqual(Steps.niriState(window(1920, 1080), output), { fullscreen: true, ratio: 1 });
    assert.deepEqual(Steps.niriState(window(960, 1020), output), { fullscreen: false, ratio: 0.5 });
    assert.equal(Steps.niriState(window(1904, 1020), output).fullscreen, false);
    assert.equal(Steps.niriState({}, output), null);
    assert.equal(Steps.niriState(window(960, 1020), null), null);
});

test("niri actions", () => {
    const tiled = { id: 7, is_floating: false };
    const floating = { id: 7, is_floating: true };
    const column = percent => ({ SetColumnWidth: { change: { SetProportion: percent } } });
    const fullscreen = { FullscreenWindow: { id: 7 } };
    assert.deepEqual(Steps.niriActions(tiled, false, 0.5), [column(50)]);
    assert.deepEqual(Steps.niriActions(tiled, false, F), [fullscreen]);
    assert.deepEqual(Steps.niriActions(tiled, true, F), []);
    assert.deepEqual(Steps.niriActions(tiled, true, 1), [fullscreen, column(100)]);
    assert.deepEqual(Steps.niriActions(floating, false, 0.75), [{ SetWindowWidth: { id: 7, change: { SetProportion: 75 } } }]);
    assert.deepEqual(Steps.niriActions(tiled, false, 1 / 3), [column(33.33)]);
});

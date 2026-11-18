import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const load = path => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const translations = readdirSync(new URL("translations/", root)).filter(name => name.endsWith(".json"));

test("plugin.json", () => {
    const manifest = load("plugin.json");
    for (const key of ["id", "name", "description", "version", "author", "type", "capabilities", "component", "settings"])
        assert.ok(key in manifest, key);
    assert.equal(manifest.id, "windowControls");
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
    assert.ok(existsSync(new URL(manifest.component, root)));
    assert.ok(existsSync(new URL(manifest.settings, root)));
    assert.ok(manifest.permissions.includes("settings_write"));
});

test("translations are non-empty strings", () => {
    assert.ok(translations.length > 0);
    for (const name of translations) {
        for (const [context, terms] of Object.entries(load(`translations/${name}`))) {
            assert.equal(typeof terms, "object", `${name}: ${context}`);
            for (const text of Object.values(terms))
                assert.ok(typeof text === "string" && text, `${name}: ${context}`);
        }
    }
});

test("translations cover exactly the terms the widget and settings use", () => {
    const manifest = load("plugin.json");
    const qml = [manifest.component, manifest.settings].map(path => readFileSync(new URL(path, root), "utf8")).join("\n");
    const used = new Set([...qml.matchAll(/I18n\.trFor\("windowControls", "([^"]+)"\)/g)].map(match => match[1]));
    assert.ok(used.size > 0);
    for (const name of translations)
        assert.deepEqual(new Set(Object.keys(load(`translations/${name}`))), used, name);
});

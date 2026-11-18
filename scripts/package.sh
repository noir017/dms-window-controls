#!/bin/sh
# Builds dist/windowControls.zip: a windowControls/ directory with only the files the plugin needs at runtime.
set -eu
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist/windowControls
cp -r plugin.json WindowControls.qml WindowControlsSettings.qml steps.js translations LICENSE dist/windowControls/
cd dist
zip -qr windowControls.zip windowControls
rm -rf windowControls

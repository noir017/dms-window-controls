# AGENTS.md

Test: `node --test tests/*.test.mjs`

Install and reload:

```sh
scripts/package.sh
rm -rf ~/.config/dms/plugins/windowControls && unzip -q dist/windowControls.zip -d ~/.config/dms/plugins/
systemctl --user restart dms.service
```

`dms ipc call plugins reload windowControls` reloads only `WindowControls.qml`; after changing `steps.js` restart DMS.

Release: bump `version` in plugin.json and push to main; CI tags and publishes.

`steps.js` is plain JavaScript shared by QML and node: no QML APIs, and nothing the QML engine lacks (such as `Array.prototype.flatMap`).

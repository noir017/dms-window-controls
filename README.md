# Window Controls for DMS

A [DMS](https://github.com/duxlabs-dev/dux-shell) bar widget with three buttons for the focused window: shrink, expand and close.

Shrink and expand step the window through widths: 1/4, 1/2, 3/4, full width, fullscreen. Full width fills the screen with the column and keeps the bars visible; fullscreen covers everything. Expand stops at fullscreen, shrink from fullscreen goes back to full width, and shrink stops at 1/4. A window between steps counts as the nearest one. The buttons gray out when there is nothing to do or no window has focus, and their tooltips say where they go.

中文简介：DMS 顶栏插件「窗口控制」，三个按钮作用于当前聚焦窗口：缩小、扩大、关闭。缩小/扩大在 1/4、1/2、3/4、全宽、全屏之间切换（全宽是列铺满、栏仍可见；全屏盖住一切），扩大到全屏为止，从全屏缩小回到全宽，1/4 不再缩小；当前宽度按最接近的档位算。档位可在插件设置里改。没有聚焦窗口时按钮置灰，悬停有提示。提供 IPC，方便绑快捷键。

## Requirements

DMS 2.1 or newer. Widths need niri; on other compositors see below.

## Install

From the latest release:

```sh
curl -LO https://github.com/noir017/dms-window-controls/releases/latest/download/windowControls.zip
rm -rf ~/.config/dms/plugins/windowControls
unzip windowControls.zip -d ~/.config/dms/plugins/
dms ipc call plugins enable windowControls
```

From source:

```sh
git clone https://github.com/noir017/dms-window-controls.git && cd dms-window-controls
scripts/package.sh
rm -rf ~/.config/dms/plugins/windowControls
unzip dist/windowControls.zip -d ~/.config/dms/plugins/
dms ipc call plugins enable windowControls
```

Then add **Window Controls** to a bar in Settings, for example at the right end of a top bar. To upgrade, repeat the same steps and restart DMS (`systemctl --user restart dms.service`).

## Width steps

Set them in the plugin's settings as a list of widths, each a percentage or fraction of the screen width, plus `fullscreen` to make fullscreen the last step:

```text
25%, 50%, 75%, 100%, fullscreen
```

`100%` is full width. Order does not matter. Without `fullscreen`, expand stops at the widest step, and shrinking a fullscreen window goes to the widest step.

## IPC

```sh
dms ipc call windowControls shrink
dms ipc call windowControls expand
dms ipc call windowControls close
```

`shrink` and `expand` reply with the step they went to (`50%`, `fullscreen`, ...), `unchanged`, or `no focused window`. IPC works while the widget is on a bar.

niri example:

```kdl
Mod+Ctrl+Minus { spawn "dms" "ipc" "call" "windowControls" "shrink"; }
Mod+Ctrl+Equal { spawn "dms" "ipc" "call" "windowControls" "expand"; }
```

## Compositors

- **niri**: tiled windows change their column width (`set-column-width`), floating windows their own width (`set-window-width`), both as a percentage of the screen; fullscreen is `fullscreen-window` and close is `close-window`. The current width comes from the window's tile size in niri's window list.
- **Others**: close works through the Wayland foreign toplevel protocol. Shrink and expand step through normal, maximized and fullscreen.

The widget picks the backend at runtime; adding a compositor means adding one backend object in `WindowControls.qml`.

## Development

```sh
node --test tests/*.test.mjs   # step logic, plugin.json and translations
```

The step logic is in `steps.js`, plain JavaScript shared by the widget and the tests.

Every push to `main` runs the tests. When the `version` in `plugin.json` has no tag yet, CI tags `v<version>` and publishes a release with `windowControls.zip`.

## License

MIT

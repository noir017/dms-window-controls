pragma ComponentBehavior: Bound

import QtQuick
import Quickshell.Io
import Quickshell.Wayland
import qs.Common
import qs.DCommon.Widgets
import qs.Modules.Plugins
import qs.Services
import qs.Widgets as Shell
import "steps.js" as Steps

PluginComponent {
    id: root

    // Named like a bar pill's property so `dms ipc call widget status windowControls` works.
    property var popoutTarget: null

    // niri can set widths; elsewhere shrink and expand step through normal, maximized and fullscreen.
    readonly property var backend: CompositorService.isNiri ? niri : toplevel
    readonly property int stepIndex: backend.stepIndex
    readonly property int shrinkIndex: Steps.target(stepIndex, backend.steps.length, -1)
    readonly property int expandIndex: Steps.target(stepIndex, backend.steps.length, 1)

    readonly property real buttonSize: Math.min(widgetThickness, iconSize + Theme.spacingS)

    // Returns the step it went to, for IPC.
    function step(direction) {
        if (!backend.hasWindow)
            return "no focused window";
        const index = direction > 0 ? expandIndex : shrinkIndex;
        if (index < 0)
            return "unchanged";
        backend.apply(index);
        return backend.stepName(index);
    }

    function closeWindow() {
        if (!backend.hasWindow)
            return "no focused window";
        backend.close();
        return "closed";
    }

    function stepLabel(index) {
        if (index < 0)
            return "";
        const step = backend.steps[index];
        switch (step) {
        case Steps.FULLSCREEN:
            return I18n.trFor("windowControls", "Fullscreen");
        case "maximized":
            return I18n.trFor("windowControls", "Maximized");
        case "normal":
            return I18n.trFor("windowControls", "Normal");
        case 1:
            return I18n.trFor("windowControls", "Full width");
        default:
            return Steps.name(step);
        }
    }

    QtObject {
        id: niri

        readonly property var steps: Steps.parse(root.pluginData.steps ?? Steps.DEFAULT_STEPS)
        readonly property var window: NiriService.windows.find(w => w.is_focused) ?? null
        readonly property bool hasWindow: window !== null
        readonly property var state: {
            const output = NiriService.outputs[NiriService.workspaces[window?.workspace_id]?.output ?? ""];
            return window ? Steps.niriState(window, output?.logical) : null;
        }
        readonly property int stepIndex: state ? Steps.currentIndex(steps, state.fullscreen, state.ratio) : -1

        function apply(index) {
            for (const action of Steps.niriActions(window, state.fullscreen, steps[index]))
                NiriService.send({
                    "Action": action
                });
        }

        function stepName(index) {
            return Steps.name(steps[index]);
        }

        function close() {
            NiriService.send({
                "Action": {
                    "CloseWindow": {
                        "id": window.id
                    }
                }
            });
        }
    }

    QtObject {
        id: toplevel

        readonly property var steps: ["normal", "maximized", Steps.FULLSCREEN]
        readonly property var window: ToplevelManager.activeToplevel
        readonly property bool hasWindow: !!window
        readonly property int stepIndex: !window ? -1 : window.fullscreen ? 2 : window.maximized ? 1 : 0

        function apply(index) {
            if (index === 2) {
                window.fullscreen = true;
                return;
            }
            window.fullscreen = false;
            window.maximized = index === 1;
        }

        function stepName(index) {
            return steps[index];
        }

        function close() {
            window.close();
        }
    }

    readonly property var buttons: [
        {
            icon: "close_fullscreen",
            active: shrinkIndex >= 0,
            tooltip: shrinkIndex >= 0 ? I18n.trFor("windowControls", "Shrink to %1").arg(stepLabel(shrinkIndex)) : I18n.trFor("windowControls", "Shrink"),
            hoverColor: Theme.widgetIconColor
        },
        {
            icon: "open_in_full",
            active: expandIndex >= 0,
            tooltip: expandIndex >= 0 ? I18n.trFor("windowControls", "Expand to %1").arg(stepLabel(expandIndex)) : I18n.trFor("windowControls", "Expand"),
            hoverColor: Theme.widgetIconColor
        },
        {
            icon: "close",
            active: backend.hasWindow,
            tooltip: I18n.trFor("windowControls", "Close window"),
            hoverColor: Theme.error
        }
    ]

    function press(index) {
        if (index === 0)
            step(-1);
        else if (index === 1)
            step(1);
        else
            closeWindow();
    }

    horizontalBarPill: Component {
        Grid {
            columns: root.isVertical ? 1 : root.buttons.length

            Repeater {
                model: root.buttons.length

                Item {
                    id: button

                    required property int index
                    readonly property var spec: root.buttons[index]

                    implicitWidth: root.buttonSize
                    implicitHeight: root.buttonSize

                    onSpecChanged: {
                        if (stateLayer.containsMouse)
                            root.showTooltip(button, spec.tooltip);
                    }

                    Rectangle {
                        anchors.fill: parent
                        radius: Theme.cornerRadiusFull
                        color: "transparent"

                        DIcon {
                            anchors.centerIn: parent
                            name: button.spec.icon
                            size: root.iconSize
                            color: Theme.widgetIconColor
                            opacity: button.spec.active ? 1 : 0.38
                        }

                        StateLayer {
                            id: stateLayer
                            disabled: !button.spec.active
                            stateColor: button.spec.hoverColor
                            onClicked: {
                                if (button.spec.active)
                                    root.press(button.index);
                            }
                            onEntered: root.showTooltip(button, button.spec.tooltip)
                            onExited: root.hideTooltip()
                        }
                    }
                }
            }
        }
    }
    verticalBarPill: horizontalBarPill

    // Bar widgets show tooltips in their own layer window, outside the bar.
    function showTooltip(item, text) {
        tooltipLoader.active = true;
        const tooltip = tooltipLoader.item;
        if (!tooltip || !parentScreen)
            return;
        const center = item.mapToItem(null, item.width / 2, item.height / 2);
        const gap = barThickness + barSpacing + Theme.spacingXS;
        const edge = axis?.edge ?? "top";
        if (isVertical) {
            const x = edge === "left" ? gap : parentScreen.width - gap;
            tooltip.show(text, x, center.y, parentScreen, edge === "left", edge !== "left");
        } else {
            // The height is known once the text is set.
            tooltip.text = text;
            const y = edge === "bottom" ? parentScreen.height - gap - tooltip.implicitHeight : gap;
            tooltip.show(text, center.x, y, parentScreen, false, false);
        }
    }

    function hideTooltip() {
        tooltipLoader.item?.hide();
        tooltipLoader.active = false;
    }

    Loader {
        id: tooltipLoader

        active: false
        sourceComponent: Shell.DTooltip {}
    }

    // Every bar instance has this handler; only the first registered one answers.
    IpcHandler {
        target: "windowControls"
        enabled: BarWidgetService.getWidget(root.pluginId) === root

        function shrink(): string {
            return root.step(-1);
        }

        function expand(): string {
            return root.step(1);
        }

        function close(): string {
            return root.closeWindow();
        }
    }
}

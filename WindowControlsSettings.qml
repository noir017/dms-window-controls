import QtQuick
import qs.Common
import qs.Modules.Plugins
import "steps.js" as Steps

PluginSettings {
    pluginId: "windowControls"

    StringSetting {
        settingKey: "steps"
        label: I18n.trFor("windowControls", "Width steps")
        description: I18n.trFor("windowControls", "Widths that shrink and expand step through, as a percentage or fraction of the screen width; 100% is full width. Add fullscreen to make it the last step. niri only.")
        placeholder: Steps.DEFAULT_STEPS
        defaultValue: Steps.DEFAULT_STEPS
    }
}

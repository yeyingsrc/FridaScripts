/*
  Frida script to auto-kill annoying popups and alerts.
  Checks the text inside dialogs against a blocklist (root detection, force updates, etc.) 
  and closes them automatically so the app keeps running.
*/
Java.performNow(function () {

    // Popups containing these phrases will get nuked
    let blacklist = new Set([
        "rooting detected",
        "Detected!!!",
        "Hooking",
        "force update",
        "upgrade now",
        "buy now",
    ]);

    function extractDialogText(dialog) {
        let texts = [];
        try {
            let window = dialog.getWindow();
            if (window === null) return texts;
            let decorView = window.getDecorView();
            if (decorView === null) return texts;
            let TextView = Java.use("android.widget.TextView");
            let ViewGroup = Java.use("android.view.ViewGroup");

            function walkViews(view) {
                try {
                    if (TextView.class.isInstance(view)) {
                        let text = Java.cast(view, TextView).getText();
                        if (text !== null && text.toString().trim().length > 0) {
                            texts.push(text.toString().trim());
                        }
                    }
                    if (ViewGroup.class.isInstance(view)) {
                        let group = Java.cast(view, ViewGroup);
                        for (let i = 0; i < group.getChildCount(); i++) {
                            walkViews(group.getChildAt(i));
                        }
                    }
                } catch (e) { }
            }

            walkViews(decorView);
        } catch (e) {
            console.error("Error scraping dialog text:", e);
        }
        return texts;
    }

    function isBlacklisted(texts) {
        let combined = texts.join(" ").toLowerCase();
        for (let word of blacklist) {
            if (combined.indexOf(word.toLowerCase()) !== -1) {
                return word;
            }
        }
        return null;
    }

    function autoDismiss(dialog) {
        let retained = Java.retain(dialog); // Hold reference so it doesn't get GC'd. wasted lot of time to understand why app crashed. lol
        Java.scheduleOnMainThread(function () {
            try {
                let texts = extractDialogText(retained);
                let matched = isBlacklisted(texts);
                if (matched !== null) {
                    console.log("Dismissing dialog! Caught keyword: '" + matched + "' | Full text: " + JSON.stringify(texts));
                    retained.dismiss();
                } else {
                    console.log("Dialog looks clean, letting it stay. Text: " + JSON.stringify(texts));
                }
            } catch (e) {
                console.error("Failed to dismiss dialog:", e);
            }
        });
    }

    try {
        let Dialog = Java.use("android.app.Dialog");
        Dialog.show.implementation = function () {
            console.warn("Hit Dialog.show()");
            this.show();
            this.setCancelable(true);
            this.setCanceledOnTouchOutside(true);
            autoDismiss(this);
        }
    } catch (error) {
        console.error("Standard Dialog class missing or changed");
    }

    try {
        let AlertDialog = Java.use("android.app.AlertDialog");
        AlertDialog.show.implementation = function () {
            console.warn("Hit AlertDialog.show()");
            this.show();
            this.setCancelable(true);
            this.setCanceledOnTouchOutside(true);
            autoDismiss(this);
        }
    } catch (error) {
        console.error("Standard AlertDialog missing or changed");
    }

    try {
        let AppCompatAlertDialog = Java.use("androidx.appcompat.app.AlertDialog");
        AppCompatAlertDialog.show.implementation = function () {
            console.warn("Hit AndroidX AlertDialog.show()");
            this.show();
            this.setCancelable(true);
            this.setCanceledOnTouchOutside(true);
            autoDismiss(this);
        }
    } catch (error) {
        console.error("AndroidX AlertDialog not found in this app");
    }

    try {
        let DialogFragment = Java.use("androidx.fragment.app.DialogFragment");
        DialogFragment.onCreateDialog.implementation = function (savedState) {
            console.warn("Hit DialogFragment.onCreateDialog()");
            let dlg = this.onCreateDialog(savedState);
            dlg.setCancelable(true);
            dlg.setCanceledOnTouchOutside(true);
            autoDismiss(dlg);
            return dlg;
        }
    } catch (error) {
        console.error("AndroidX DialogFragment not found");
    }

    try {
        let SupportAlertDialog = Java.use("android.support.v7.app.AlertDialog");
        SupportAlertDialog.show.implementation = function () {
            console.warn("Hit SupportV7 AlertDialog.show()");
            this.show();
            this.setCancelable(true);
            this.setCanceledOnTouchOutside(true);
            autoDismiss(this);
        }
    } catch (error) {
        console.error("Legacy Support V7 AlertDialog not found");
    }

    try {
        let MaterialAlertDialog = Java.use("com.google.android.material.dialog.MaterialAlertDialog");
        MaterialAlertDialog.show.implementation = function () {
            console.warn("Hit MaterialAlertDialog.show()");
            this.show();
            this.setCancelable(true);
            this.setCanceledOnTouchOutside(true);
            autoDismiss(this);
        }
    } catch (error) {
        console.error("Material Components Dialog missing");
    }

})

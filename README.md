# wthrn Slash Command for Mixmax

This is an open source Mixmax Slash Command.<br>
See <https://developer.mixmax.com/docs/overview-slash-commands> for more information.

## What it should look like:

### Typeahead

![typeahead](https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/typeahead.gif)

### Resolver

![resolver](https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/resolver.png)

## How to Use wthrn

1. Add a Mixmax Slash Command in your Mixmax dashboard:
  * Log into Mixmax and go to https://app.mixmax.com/dashboard/settings/developer
  * In the slash commands section, click the `Add Slash Command` button.
  * Add the wthrn slash command using the settings below.

<img src="https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/settings.png" width="550" />

2. Quit Chrome using `Cmd-q`. You need to quit Chrome entirely. Closing all open Chrome windows does not work.

3. Reopen Chrome and start composing a message in Gmail with the Mixmax extension and start typing `/wthrn` you should see a popup menu asking you to type in a location.<br><br>
<img src="https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/popup.png" width="400" />

# Running wthrn Locally

1. Clone this repository and create a config json file called config.json in the `utils` directory, populating it with the following api access keys:
  * darksky: Dark Sky https://darksky.net/dev
  * places: Google Places https://developers.google.com/places/
  * memcached: Your local memcached installation (usually `localhost:11211`)

2. Follow the instructions laid out in the README for the SoundCloud slash command: <https://github.com/simonxca/mixmax-soundcloud-slash-command> to run the app.

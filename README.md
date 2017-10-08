# SoundCloud Slash Command for Mixmax

This is an open source Mixmax Slash Command.
See <https://developer.mixmax.com/docs/overview-slash-commands> for more information about
how to use this example code in Mixmax.

## What it should look like:

### Typeahead

![typeahead](https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/typeahead.gif)

### Resolver

![resolver](https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/resolver.png)

## How to Run

1. Clone this repository: `git clone https://github.com/simonxca/mixmax-soundcloud-slash-command`
2. `cd mixmax-soundcloud-slash-command`
3. Install using `npm install`
4. Start the server using `npm start`. By default this will start the server at `localhost:9145`.
5. Add a Mixmax Slash Command in your Mixmax dashboard:
  * Log into Mixmax and go to https://app.mixmax.com/dashboard/settings/developer
  * In the slash commands section, click the `Add Slash Command` button.
  * Add a SoundCloud slash command using the settings below.

<img src="https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/settings.png" width="550" />

4. Quit Chrome using `Cmd-q` and restart it from the command line using the following command on OS X: `open -a Google\ Chrome --args --ignore-certificate-errors`. See [here](http://developer.mixmax.com/docs/integration-api-appendix#local-development-error-neterr_insecure_response) for why. <br>
For Windows users, use `Ctrl-q` and find the equivalent command for opening Chrome.<br>
**Note**: you need to quit Chrome entirely. Closing all open Chrome windows does not work.<br><br>
You might see the following warning after opening Chrome with `--args --ignore-certificate-errors`. This is fine and is expected.

<img src="https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/warning.png" width="600" />

5. Open a compose mole in Gmail with the Mixmax extension and start typing `/soundcloud` you should see a popup menu asking you to type a search term.<br><br>
<img src="https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/popup.png" width="400" /><br><br>
When you start typing, Chrome may also display the url as `Not Secure`.<br><br>
<img src="https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/warning2.png" width="400" /><br><br>
This is also fine and is expected.
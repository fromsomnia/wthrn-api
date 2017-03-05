# SoundCloud Slash Command for Mixmax

This is an open source Mixmax Slash Command.
See <http://sdk.mixmax.com/docs/tutorial-giphy-slash-command> for more information about
how to use this example code in Mixmax.

## What it should look like:
###Typeahead<br>
![typeahead](https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/typeahead.png)

###Resolver<br>
![resolver](https://raw.githubusercontent.com/simonxca/mixmax-soundcloud-slash-command/master/screenshots/resolver.png)

## Running locally

1. Install using `npm install`
2. Run using `npm start`
3. Add a Mixmax Slash Command in your Mixmax dashboard. (Call it soundcloud) Using:<br>
   Typeahead API URL: http://localhost:9145/typeahead<br>
   Resolver API URL: http://localhost:9145/resolver
4. Compose an email in Gmail using Mixmax and type /soundcloud [Search]
